import SwiftUI
import FirebaseFirestore

struct SlotsView: View {
    let event: Event
    @State private var slots: [Slot] = []
    @State private var error: String?

    var body: some View {
        List(slots) { s in
            NavigationLink(destination: ReservationBuilderView(event: event, slot: s)) {
                VStack(alignment: .leading) {
                    Text(s.startAt.dateValue().formatted(date: .omitted, time: .shortened))
                    Text("to \(s.endAt.dateValue().formatted(date: .omitted, time: .shortened))")
                        .font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle("Slots")
        .onAppear(perform: load)
        .overlay { if let error { Text(error).foregroundColor(.red) } }
    }

    private func load() {
        error = nil
        Firestore.firestore().collection("slots")
            .whereField("eventId", isEqualTo: event.id)
            .whereField("isActive", isEqualTo: true)
            .getDocuments { snap, err in
                if let err { error = err.localizedDescription; return }
                let docs = snap?.documents ?? []
                self.slots = docs.map { d in
                    let data = d.data()
                    return Slot(
                        id: d.documentID,
                        startAt: data["startAt"] as! Timestamp,
                        endAt: data["endAt"] as! Timestamp
                    )
                }.sorted { $0.startAt.dateValue() < $1.startAt.dateValue() }
            }
    }
}
