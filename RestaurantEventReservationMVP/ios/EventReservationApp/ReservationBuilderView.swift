import SwiftUI
import FirebaseFunctions
import StripePaymentSheet

struct ReservationBuilderView: View {
    let event: Event
    let slot: Slot

    @State private var partySize = 2
    @State private var error: String?
    @State private var assignedTables: [String] = []
    @State private var totalAmount: Int = 0
    @State private var reservationId: String?

    @State private var paymentSheet: PaymentSheet?
    @State private var showingPayment = false

    var body: some View {
        VStack(spacing: 16) {
            Text(event.title).font(.headline)
            Text(slot.startAt.dateValue().formatted(date: .abbreviated, time: .shortened))

            Stepper("Party size: \(partySize)", value: $partySize, in: 1...12)

            Button("Continue to payment") {
                createHold()
            }
            .buttonStyle(.borderedProminent)

            if !assignedTables.isEmpty {
                Text("Assigned table(s): \(assignedTables.joined(separator: ", "))")
            }
            if totalAmount > 0 {
                Text("Total: £\(Double(totalAmount)/100.0, specifier: "%.2f")")
            }
            if let error { Text(error).foregroundColor(.red) }

            Spacer()
        }
        .padding()
        .navigationTitle("Reserve")
        .sheet(isPresented: $showingPayment) {
            if let paymentSheet {
                PaymentSheetView(paymentSheet: paymentSheet) { result in
                    handlePaymentResult(result)
                }
            }
        }
    }

    private func createHold() {
        error = nil
        let functions = Functions.functions()
        let payload: [String: Any] = [
            "restaurantId": event.restaurantId,
            "eventId": event.id,
            "slotId": slot.id,
            "partySize": partySize,
            "items": [] // add menu items later
        ]

        functions.httpsCallable("holdReservation").call(payload) { res, err in
            if let err { self.error = err.localizedDescription; return }
            guard
                let data = res?.data as? [String: Any],
                let clientSecret = data["paymentIntentClientSecret"] as? String,
                let reservationId = data["reservationId"] as? String
            else {
                self.error = "Bad server response"
                return
            }

            self.reservationId = reservationId
            self.assignedTables = data["assignedTableIds"] as? [String] ?? []
            self.totalAmount = data["totalAmount"] as? Int ?? 0

            var config = PaymentSheet.Configuration()
            config.merchantDisplayName = "Your Restaurant"
            self.paymentSheet = PaymentSheet(paymentIntentClientSecret: clientSecret, configuration: config)
            self.showingPayment = true
        }
    }

    private func handlePaymentResult(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            // Stripe webhook will mark reservation CONFIRMED and generate reservationNumber.
            // You can navigate to a confirmation screen and/or poll Firestore for status.
            break
        case .canceled:
            break
        case .failed(let error):
            self.error = error.localizedDescription
        }
    }
}

struct PaymentSheetView: UIViewControllerRepresentable {
    let paymentSheet: PaymentSheet
    let onResult: (PaymentSheetResult) -> Void

    func makeUIViewController(context: Context) -> UIViewController {
        let vc = UIViewController()
        DispatchQueue.main.async {
            paymentSheet.present(from: vc) { result in
                onResult(result)
            }
        }
        return vc
    }
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
