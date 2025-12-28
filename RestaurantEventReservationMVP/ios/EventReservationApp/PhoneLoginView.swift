import SwiftUI
import FirebaseAuth

struct PhoneLoginView: View {
    let onAuthed: () -> Void

    @State private var phone = ""
    @State private var code = ""
    @State private var verificationID: String?
    @State private var error: String?

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                Text("Login").font(.title2)

                TextField("+44...", text: $phone)
                    .textContentType(.telephoneNumber)
                    .keyboardType(.phonePad)
                    .textFieldStyle(.roundedBorder)

                if verificationID == nil {
                    Button("Send Code") { sendCode() }
                } else {
                    TextField("123456", text: $code)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                    Button("Verify") { verifyCode() }
                }

                if let error { Text(error).foregroundColor(.red) }
                Spacer()
            }
            .padding()
        }
    }

    private func sendCode() {
        error = nil
        PhoneAuthProvider.provider().verifyPhoneNumber(phone, uiDelegate: nil) { vid, err in
            if let err { error = err.localizedDescription; return }
            verificationID = vid
        }
    }

    private func verifyCode() {
        guard let verificationID else { return }
        error = nil
        let credential = PhoneAuthProvider.provider().credential(withVerificationID: verificationID, verificationCode: code)
        Auth.auth().signIn(with: credential) { _, err in
            if let err { error = err.localizedDescription; return }
            onAuthed()
        }
    }
}
