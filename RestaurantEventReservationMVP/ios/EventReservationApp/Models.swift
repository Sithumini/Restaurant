import Foundation
import FirebaseFirestore

struct Event: Identifiable {
    let id: String
    let title: String
    let date: String
    let restaurantId: String
}

struct Slot: Identifiable {
    let id: String
    let startAt: Timestamp
    let endAt: Timestamp
}
