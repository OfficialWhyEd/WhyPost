import SwiftUI
import Charts

struct StatisticsView: View {
    @EnvironmentObject var store: AppStore

    let weekData: [(day: String, count: Int)] = [
        ("L", 2), ("M", 3), ("M", 1), ("G", 4), ("V", 2), ("S", 3), ("D", 2)
    ]

    var bufferPercent: Double {
        guard store.buffer.target_days > 0 else { return 0 }
        return min(1.0, Double(store.buffer.ready_videos) / Double(store.buffer.target_days))
    }

    var body: some View {
        HStack(spacing: 14) {
            // Buffer card
            VStack(alignment: .leading, spacing: 6) {
                Text("BUFFER")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1.5)
                HStack(alignment: .bottom, spacing: 4) {
                    Text("\(store.buffer.ready_videos)")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("/ \(store.buffer.target_days)d")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.bottom, 5)
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.08)).frame(height: 4)
                        Capsule()
                            .fill(Color(red: 0.4, green: 0.8, blue: 0.6))
                            .frame(width: geo.size.width * bufferPercent, height: 4)
                    }
                }
                .frame(height: 4)
                if let next = store.buffer.next_publish {
                    Text("Prossima: \(next)")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                }
            }
            .padding(14)
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)
            .frame(width: 160)

            // Bar chart
            VStack(alignment: .leading, spacing: 6) {
                Text("VIDEO / SETTIMANA")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1.5)
                Chart(weekData, id: \.day) { item in
                    BarMark(x: .value("G", item.day), y: .value("N", item.count))
                        .foregroundStyle(Color(red: 0.4, green: 0.8, blue: 0.6).opacity(0.8))
                        .cornerRadius(3)
                }
                .chartYAxis(.hidden)
                .chartXAxis {
                    AxisMarks { AxisValueLabel().foregroundStyle(Color.white.opacity(0.4)) }
                }
                .frame(height: 55)
            }
            .padding(14)
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)
            .frame(maxWidth: .infinity)

            // Agent grid
            AgentStatusGridView()
                .frame(maxWidth: .infinity)
        }
    }
}
