import * as admin from "firebase-admin";

export function db() {
  return admin.firestore();
}

export type ReservationStatus = "HOLD" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

export type Slot = {
  eventId: string;
  startAt: FirebaseFirestore.Timestamp;
  endAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
};

export type Table = {
  restaurantId: string;
  name: string;
  seats: number;
  joinGroupId?: string;
  isActive: boolean;
};

export type Reservation = {
  reservationNumber?: string;
  userId: string;
  restaurantId: string;
  eventId: string;
  slotId: string;
  partySize: number;
  assignedTableIds: string[];
  status: ReservationStatus;
  holdExpiresAt?: FirebaseFirestore.Timestamp;
  totalAmount: number;
  currency: string;
  createdAt: FirebaseFirestore.Timestamp;
  paymentIntentId?: string;
  // Denormalized for fast overlap checks
  slotStartAt?: FirebaseFirestore.Timestamp;
  slotEndAt?: FirebaseFirestore.Timestamp;
};
