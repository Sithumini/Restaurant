# Restaurant Event Reservation MVP (Table-Based Assignment)

This is a **starter MVP** bundle:
- `functions/` Firebase Cloud Functions (TypeScript) + Firestore model
- `ios/` SwiftUI source files for an iPhone app

## What works
- Phone OTP login (Firebase Auth)
- List events + slots from Firestore
- Create a **HOLD** reservation via Cloud Function
- **Table-based assignment** (best-fit single table, or 2-table combo within same `joinGroupId`)
- Create Stripe PaymentIntent + return client secret
- Stripe webhook confirms reservation and generates `reservationNumber`

## Requirements
- Firebase project (Firestore + Auth + Functions)
- Stripe account
- Xcode (to build the iOS app)
- Node 18+ for functions

---

## 1) Firestore collections you should create
- `restaurants`
- `events`
- `slots`
- `tables`
- `menuItems` (optional for MVP; code supports it)
- `reservations`
- `reservationItems`

### Minimal sample data (create in Firebase console)
1) `restaurants/{restaurantId}`
```json
{ "name": "Demo Restaurant", "timezone": "Europe/London" }
```

2) `events/{eventId}`
```json
{
  "restaurantId": "YOUR_RESTAURANT_ID",
  "title": "Special Dinner",
  "date": "2025-12-31",
  "isActive": true
}
```

3) `slots/{slotId}` (use Timestamp fields in console UI)
- `eventId`: YOUR_EVENT_ID
- `startAt`: Timestamp
- `endAt`: Timestamp
- `isActive`: true

4) `tables/{tableId}`
```json
{ "restaurantId": "YOUR_RESTAURANT_ID", "name": "T1", "seats": 2, "joinGroupId": "A", "isActive": true }
```
Create multiple tables (T1..T10). Tables with the same `joinGroupId` can combine (2 tables max).

---

## 2) Deploy Functions
From `functions/`:
```bash
npm install
npm run build
# set env vars (choose one method below)
```

### Set env vars
Set these in your environment before deploy (recommended in CI), or use Firebase config/env:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Then deploy:
```bash
firebase deploy --only functions
```

---

## 3) Stripe webhook
Point Stripe webhook to your deployed function endpoint:
- `/stripeWebhook`

Listen for:
- `payment_intent.succeeded`

---

## 4) iOS app setup
The `ios/EventReservationApp` folder contains SwiftUI sources (not an Xcode project).
Create a new SwiftUI iOS project in Xcode named **EventReservationApp**, then drop these files into it.

Add packages:
- Firebase iOS SDK (Auth, Firestore, Functions)
- Stripe iOS SDK (PaymentSheet)

Add your `GoogleService-Info.plist` to the Xcode project.

---

## Notes (MVP limitations)
- Table locking is implemented via HOLD reservations; for very high traffic you may want a strict per-table lock doc model.
- Reminders (push/SMS) are not included in this bundle.
- Menu selection UI is stubbed as `items: []` for now.

If you want, we can add:
- Admin web panel (create events/slots/tables/menu)
- Scheduled function to expire holds
- Push/SMS reminders
- Stronger locking model
