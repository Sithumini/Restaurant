import SwiftUI
import FirebaseAuth

struct RootView: View {
    @State private var user: User? = Auth.auth().currentUser

    var body: some View {
        Group {
            if user == nil {
                PhoneLoginView(onAuthed: { self.user = Auth.auth().currentUser })
            } else {
                MainTabView(onSignOut: {
                    try? Auth.auth().signOut()
                    self.user = nil
                })
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: Auth.auth().didChangeNotification)) { _ in
            self.user = Auth.auth().currentUser
        }
    }
}
