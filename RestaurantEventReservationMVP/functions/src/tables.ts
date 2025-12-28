import { db, Slot } from "./firestore";

/**
 * Overlap check for half-open intervals: [aStart, aEnd) overlaps [bStart, bEnd)
 */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function getSlot(slotId: string): Promise<Slot> {
  const snap = await db().collection("slots").doc(slotId).get();
  if (!snap.exists) throw new Error("slot_not_found");
  return snap.data() as Slot;
}

type BusyTableMap = Map<string, true>;

async function getBusyTablesForSlot(
  restaurantId: string,
  slotStart: Date,
  slotEnd: Date
): Promise<BusyTableMap> {
  const now = new Date();

  const resSnap = await db()
    .collection("reservations")
    .where("restaurantId", "==", restaurantId)
    .where("status", "in", ["CONFIRMED", "HOLD"])
    .get();

  const busy: BusyTableMap = new Map();

  resSnap.forEach((doc) => {
    const r = doc.data() as any;
    const rStart = r.slotStartAt?.toDate?.() as Date | undefined;
    const rEnd = r.slotEndAt?.toDate?.() as Date | undefined;
    if (!rStart || !rEnd) return;

    if (r.status === "HOLD") {
      const exp = r.holdExpiresAt?.toDate?.() as Date | undefined;
      if (!exp || exp <= now) return; // expired HOLD doesn't block
    }

    if (overlaps(slotStart, slotEnd, rStart, rEnd)) {
      (r.assignedTableIds || []).forEach((tid: string) => busy.set(tid, true));
    }
  });

  return busy;
}

/**
 * Table assignment (MVP rules):
 * 1) Best-fit single table (smallest seats >= partySize)
 * 2) Else best 2-table combo within same joinGroupId, minimizing wasted seats
 */
export async function assignTablesForSlot(params: {
  restaurantId: string;
  slotId: string;
  partySize: number;
}): Promise<{ tableIds: string[]; slotStart: Date; slotEnd: Date }> {
  const { restaurantId, slotId, partySize } = params;

  const slot = await getSlot(slotId);
  const slotStart = slot.startAt.toDate();
  const slotEnd = slot.endAt.toDate();

  const busy = await getBusyTablesForSlot(restaurantId, slotStart, slotEnd);

  const tablesSnap = await db()
    .collection("tables")
    .where("restaurantId", "==", restaurantId)
    .where("isActive", "==", true)
    .get();

  const tables = tablesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((t) => !busy.has(t.id))
    .sort((a, b) => a.seats - b.seats);

  const single = tables.find((t) => t.seats >= partySize);
  if (single) return { tableIds: [single.id], slotStart, slotEnd };

  // Two-table combos within joinGroupId
  const groups = new Map<string, any[]>();
  for (const t of tables) {
    const g = t.joinGroupId ?? "";
    if (!g) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(t);
  }

  let bestCombo: { ids: string[]; seats: number } | null = null;

  for (const groupTables of groups.values()) {
    for (let i = 0; i < groupTables.length; i++) {
      for (let j = i + 1; j < groupTables.length; j++) {
        const seats = groupTables[i].seats + groupTables[j].seats;
        if (seats >= partySize) {
          const combo = { ids: [groupTables[i].id, groupTables[j].id], seats };
          if (!bestCombo || combo.seats < bestCombo.seats) bestCombo = combo;
        }
      }
    }
  }

  if (bestCombo) return { tableIds: bestCombo.ids, slotStart, slotEnd };

  throw new Error("no_tables_available");
}
