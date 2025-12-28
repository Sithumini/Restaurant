import SwiftUI

struct MainTabView: View {
    let onSignOut: () -> Void

    var body: some View {
        TabView {
            EventsView()
                .tabItem { Label("Events", systemImage: "calendar") }

            MyReservationsView()
                .tabItem { Label("My Bookings", systemImage: "ticket") }

            VStack(spacing: 12) {
                Text("Account")
                Button("Sign out", role: .destructive) { onSignOut() }
            }
            .tabItem { Label("Account", systemImage: "person") }
        }
    }
}
