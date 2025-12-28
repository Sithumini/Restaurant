import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct MyReservationsView: View {
    @State private var rows: [DocumentSnapshot] = []
    @State private var error: String?

    var body: some View {
        NavigationView {
            List {
                ForEach(rows, id: \.documentID) { doc in
                    let d = doc.data() ?? [:]
                    let status = d["status"] as? String ?? ""
                    let number = d["reservationNumber"] as? String ?? "(pending)"
                    let party = d["partySize"] as? Int ?? 0
                    VStack(alignment: .leading) {
                        Text("Reservation: \(number)").font(.headline)
                        Text("Status: \(status) • Party: \(party)")
                            .font(.subheadline).foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("My Bookings")
            .onAppear(perform: load)
            .overlay { if let error { Text(error).foregroundColor(.red) } }
        }
    }

    private func load() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        error = nil
        Firestore.firestore().collection("reservations")
            .whereField("userId", isEqualTo: uid)
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .getDocuments { snap, err in
                if let err { error = err.localizedDescription; return }
                rows = snap?.documents ?? []
            }
    }
}
