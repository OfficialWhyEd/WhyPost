import SwiftUI

struct StatusBadgeView: View {
    @EnvironmentObject var store: AppStore
    @State private var pulse = false

    var isRunning: Bool { store.systemStatus == "running" }

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(isRunning ? Color(red: 0.4, green: 0.8, blue: 0.6) : Color.white.opacity(0.3))
                .frame(width: 7, height: 7)
                .scaleEffect(pulse && isRunning ? 1.4 : 1.0)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: pulse)
                .onAppear { pulse = true }
            Text(isRunning ? "RUNNING" : "IDLE")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(isRunning ? Color(red: 0.4, green: 0.8, blue: 0.6) : Color.white.opacity(0.4))
                .tracking(1.5)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.white.opacity(0.06))
        .cornerRadius(20)
    }
}
