import SwiftUI
import FirebaseCore

@main
struct EventReservationApp: App {
    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
