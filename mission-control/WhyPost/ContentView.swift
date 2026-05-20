import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: AppStore
    @State private var isChatCollapsed = false

    var body: some View {
        HStack(spacing: 0) {
            DashboardView()
                .frame(maxWidth: .infinity)

            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 1)

            if !isChatCollapsed {
                ChatSidebarView(isCollapsed: $isChatCollapsed)
                    .frame(width: 360)
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            } else {
                VStack {
                    Spacer()
                    Button {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                            isChatCollapsed = false
                        }
                    } label: {
                        Image(systemName: "bubble.left.and.bubble.right.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.5))
                            .padding(12)
                            .background(Color.white.opacity(0.07))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .padding(10)
                    Spacer()
                }
                .frame(width: 44)
            }
        }
        .background(Color(red: 0.071, green: 0.071, blue: 0.090))
        .preferredColorScheme(.dark)
        .onAppear { store.startPolling() }
        .onDisappear { store.stopPolling() }
    }
}
