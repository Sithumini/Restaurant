import SwiftUI
import FirebaseFirestore

struct EventsView: View {
    @State private var events: [Event] = []
    @State private var error: String?

    var body: some View {
        NavigationView {
            List(events) { ev in
                NavigationLink(destination: SlotsView(event: ev)) {
                    VStack(alignment: .leading) {
                        Text(ev.title).font(.headline)
                        Text(ev.date).font(.subheadline).foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Events")
            .onAppear(perform: load)
            .overlay {
                if let error { Text(error).foregroundColor(.red) }
            }
        }
    }

    private func load() {
        error = nil
        Firestore.firestore().collection("events")
            .whereField("isActive", isEqualTo: true)
            .getDocuments { snap, err in
                if let err { error = err.localizedDescription; return }
                let docs = snap?.documents ?? []
                self.events = docs.map { d in
                    let data = d.data()
                    return Event(
                        id: d.documentID,
                        title: data["title"] as? String ?? "Event",
                        date: data["date"] as? String ?? "",
                        restaurantId: data["restaurantId"] as? String ?? ""
                    )
                }
            }
    }
}
