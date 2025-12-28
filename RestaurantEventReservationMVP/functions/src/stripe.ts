import Stripe from "stripe";

export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("missing_STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}
