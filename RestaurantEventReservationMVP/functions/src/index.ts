import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { db } from "./firestore";
import { assignTablesForSlot } from "./tables";
import { stripeClient } from "./stripe";

admin.initializeApp();

/**
 * Callable: create HOLD reservation + assign table(s) + create Stripe PaymentIntent
 *
 * client sends:
 * { restaurantId, eventId, slotId, partySize, items: [{menuItemId, qty}] }
 */
export const holdReservation = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) throw new functions.https.HttpsError("unauthenticated", "Login required");

  const userId = context.auth.uid;
  const { restaurantId, eventId, slotId, partySize, items } = data as {
    restaurantId: string;
    eventId: string;
    slotId: string;
    partySize: number;
    items: Array<{ menuItemId: string; qty: number }>;
  };

  if (!restaurantId || !eventId || !slotId || !partySize || partySize < 1) {
    throw new functions.https.HttpsError("invalid-argument", "Bad input");
  }

  // Calculate price server-side from menuItems (prevents client tampering)
  let totalAmount = 0;
  const currency = "gbp";

  if (Array.isArray(items) && items.length > 0) {
    const ids = items.map((i) => i.menuItemId);
    const menuSnaps = await db().getAll(...ids.map((id) => db().collection("menuItems").doc(id)));
    const priceMap = new Map<string, number>();
    menuSnaps.forEach((s) => {
      if (s.exists) priceMap.set(s.id, (s.data() as any).price ?? 0);
    });

    for (const it of items) {
      const unit = priceMap.get(it.menuItemId) ?? 0;
      totalAmount += unit * Math.max(1, it.qty || 1);
    }
  }

  // Assign tables (reads current holds/confirmed)
  const assigned = await assignTablesForSlot({ restaurantId, slotId, partySize });

  // Create hold reservation
  const holdMinutes = 10;
  const holdExpiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + holdMinutes * 60 * 1000)
  );

  const reservationRef = db().collection("reservations").doc();

  // Create Stripe PaymentIntent
  const stripe = stripeClient();
  const pi = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: {
      reservationId: reservationRef.id,
      restaurantId,
      eventId,
      slotId,
      userId
    }
  });

  await db().runTransaction(async (tx) => {
    tx.set(reservationRef, {
      userId,
      restaurantId,
      eventId,
      slotId,
      partySize,
      assignedTableIds: assigned.tableIds,
      status: "HOLD",
      holdExpiresAt,
      totalAmount,
      currency,
      createdAt: admin.firestore.Timestamp.now(),
      paymentIntentId: pi.id,
      slotStartAt: admin.firestore.Timestamp.fromDate(assigned.slotStart),
      slotEndAt: admin.firestore.Timestamp.fromDate(assigned.slotEnd)
    });
  });

  // Write reservation items
  if (Array.isArray(items) && items.length > 0) {
    const batch = db().batch();
    for (const it of items) {
      const ref = db().collection("reservationItems").doc();
      batch.set(ref, {
        reservationId: reservationRef.id,
        menuItemId: it.menuItemId,
        qty: Math.max(1, it.qty || 1)
      });
    }
    await batch.commit();
  }

  return {
    reservationId: reservationRef.id,
    assignedTableIds: assigned.tableIds,
    totalAmount,
    currency,
    paymentIntentClientSecret: pi.client_secret
  };
});

/**
 * Stripe webhook: confirm reservation on payment success
 *
 * NOTE: You must configure your Firebase function to accept raw body for Stripe signature verification.
 * In Firebase v2, you'd use express raw middleware. This MVP uses rawBody provided by Firebase.
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripe = stripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).send("missing_STRIPE_WEBHOOK_SECRET");
    return;
  }

  const sig = req.headers["stripe-signature"] as string;
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const reservationId = pi.metadata?.reservationId;
    if (reservationId) {
      const ref = db().collection("reservations").doc(reservationId);
      await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;

        const r = snap.data() as any;
        if (r.status === "CONFIRMED") return;

        const code = Math.random().toString(36).slice(2, 6).toUpperCase();
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const reservationNumber = `EV${datePart}-${code}`;

        tx.update(ref, {
          status: "CONFIRMED",
          reservationNumber
        });
      });
    }
  }

  res.json({ received: true });
});
