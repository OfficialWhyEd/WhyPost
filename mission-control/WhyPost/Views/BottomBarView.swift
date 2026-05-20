import SwiftUI

struct BottomBarView: View {
    @EnvironmentObject var store: AppStore
    @State private var newTopic = ""

    var body: some View {
        HStack(spacing: 0) {
            // Argomenti
            VStack(alignment: .leading, spacing: 8) {
                Text("ARGOMENTI")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1.5)
                FlowLayout(spacing: 6) {
                    ForEach(["tech ai", "produttività dev", "automazione", "claude code"], id: \.self) { topic in
                        Text(topic)
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.7))
                            .padding(.horizontal, 9)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.07))
                            .cornerRadius(20)
                    }
                    Image(systemName: "plus")
                        .font(.system(size: 9))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(6)
                        .background(Color.white.opacity(0.05))
                        .clipShape(Circle())
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)

            Rectangle().fill(Color.white.opacity(0.06)).frame(width: 1).padding(.vertical, 8)

            // Quantità e programmazione
            VStack(alignment: .leading, spacing: 8) {
                Text("QUANTITÀ E PROGRAMMAZIONE")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1.5)
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Video/giorno")
                            .font(.system(size: 10)).foregroundColor(.white.opacity(0.5))
                        Text("1–2")
                            .font(.system(size: 18, weight: .bold)).foregroundColor(.white)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Buffer target")
                            .font(.system(size: 10)).foregroundColor(.white.opacity(0.5))
                        Text("\(store.buffer.target_days)gg")
                            .font(.system(size: 18, weight: .bold)).foregroundColor(.white)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)

            Rectangle().fill(Color.white.opacity(0.06)).frame(width: 1).padding(.vertical, 8)

            // Statistiche Social BETA
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Text("STATISTICHE SOCIAL")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.white.opacity(0.4))
                        .tracking(1.5)
                    Text("BETA")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(Color(red: 0.9, green: 0.7, blue: 0.2))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.9, green: 0.7, blue: 0.2).opacity(0.15))
                        .cornerRadius(4)
                }
                HStack(spacing: 16) {
                    SocialStatCell(platform: "Insta", views: "—", followers: "—")
                    SocialStatCell(platform: "TikTok", views: "—", followers: "—")
                    SocialStatCell(platform: "YT Shorts", views: "—", followers: "—")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
        }
        .background(Color.white.opacity(0.03))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.06), lineWidth: 1))
    }
}

struct SocialStatCell: View {
    let platform: String
    let views: String
    let followers: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(platform)
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(.white.opacity(0.5))
            Text(views)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            Text("views")
                .font(.system(size: 8))
                .foregroundColor(.white.opacity(0.35))
        }
    }
}

// FlowLayout per i tag argomenti
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        return CGSize(
            width: proposal.width ?? 0,
            height: rows.map { $0.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0 }.reduce(0, +) + spacing * CGFloat(max(rows.count - 1, 0))
        )
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        var y = bounds.minY
        for row in rows {
            var x = bounds.minX
            let rowHeight = row.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0
            for view in row {
                let size = view.sizeThatFits(.unspecified)
                view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += rowHeight + spacing
        }
    }

    private func computeRows(proposal: ProposedViewSize, subviews: Subviews) -> [[LayoutSubview]] {
        var rows: [[LayoutSubview]] = [[]]
        var currentWidth: CGFloat = 0
        let maxWidth = proposal.width ?? .infinity
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if currentWidth + size.width > maxWidth && !rows.last!.isEmpty {
                rows.append([])
                currentWidth = 0
            }
            rows[rows.count - 1].append(view)
            currentWidth += size.width + spacing
        }
        return rows
    }
}
