import SwiftUI

struct AgentStatusGridView: View {
    @EnvironmentObject var store: AppStore

    let agents = ["MAIN", "EXEL", "SCRIPT", "ASSET", "CLACK", "SAFETY", "PUBLISHER", "TELEMETRY", "OPUS"]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("AGENTI")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.white.opacity(0.4))
                .tracking(1.5)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                ForEach(agents, id: \.self) { agent in
                    HStack(spacing: 5) {
                        Circle()
                            .fill(colorForStatus(store.agentStatuses[agent] ?? "idle"))
                            .frame(width: 5, height: 5)
                        Text(agent)
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundColor(.white.opacity(0.65))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(6)
                }
            }
        }
        .padding(14)
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
    }

    func colorForStatus(_ status: String) -> Color {
        switch status {
        case "running": return Color(red: 0.4, green: 0.8, blue: 0.6)
        case "error":   return Color(red: 0.9, green: 0.3, blue: 0.3)
        default:        return Color.white.opacity(0.25)
        }
    }
}
