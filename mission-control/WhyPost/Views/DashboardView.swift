import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 0) {
                    Text("WhyPost")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                    Text(" · Mission Control")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(.white.opacity(0.35))
                }
                Spacer()
                StatusBadgeView()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 13)
            .background(Color.white.opacity(0.025))

            Rectangle().fill(Color.white.opacity(0.07)).frame(height: 1)

            ScrollView {
                VStack(spacing: 0) {
                    StatisticsView()
                        .padding(18)

                    Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1)

                    CalendarView()
                        .padding(.horizontal, 18)
                        .padding(.vertical, 16)

                    Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1)

                    BottomBarView()
                        .padding(18)
                }
            }
        }
    }
}
