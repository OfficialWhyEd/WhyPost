import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var store: AppStore

    var weekDays: [String] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "it_IT")
        let cal = Calendar.current
        let today = Date()
        let weekday = cal.component(.weekday, from: today)
        let startOffset = -(weekday - 2 + 7) % 7
        return (0..<7).map { offset in
            let date = cal.date(byAdding: .day, value: startOffset + offset, to: today)!
            formatter.dateFormat = "d MMM"
            return formatter.string(from: date).uppercased()
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("CALENDARIO SETTIMANALE")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1.5)
                Spacer()
                Text("\(store.queue.count) video in coda")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.35))
            }

            HStack(spacing: 6) {
                ForEach(Array(weekDays.enumerated()), id: \.offset) { idx, day in
                    DayColumnView(
                        dayLabel: day,
                        isToday: idx == (Calendar.current.component(.weekday, from: Date()) - 2 + 7) % 7,
                        videos: store.queue.filter { $0.scheduled_at?.contains(day) == true }
                    )
                }
            }
            .frame(height: 140)
        }
    }
}

struct DayColumnView: View {
    let dayLabel: String
    let isToday: Bool
    let videos: [VideoItem]
    @State private var isTargeted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(dayLabel)
                .font(.system(size: 9, weight: isToday ? .bold : .regular))
                .foregroundColor(isToday ? Color(red: 0.4, green: 0.8, blue: 0.6) : .white.opacity(0.45))

            ScrollView {
                VStack(spacing: 3) {
                    ForEach(videos) { v in
                        VideoMiniCard(video: v)
                    }
                    if videos.isEmpty {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.white.opacity(isTargeted ? 0.07 : 0.02))
                            .frame(height: 50)
                            .overlay(
                                Image(systemName: "plus")
                                    .foregroundColor(.white.opacity(0.15))
                                    .font(.system(size: 11))
                            )
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.white.opacity(isToday ? 0.06 : 0.03))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(
                    isToday ? Color(red: 0.4, green: 0.8, blue: 0.6).opacity(0.3) : Color.white.opacity(0.06),
                    lineWidth: 1
                )
        )
        .onDrop(of: ["public.text"], isTargeted: $isTargeted) { _ in true }
    }
}

struct VideoMiniCard: View {
    let video: VideoItem

    var statusColor: Color {
        switch video.status {
        case "ready":     return Color(red: 0.4, green: 0.8, blue: 0.6)
        case "rendering": return Color(red: 0.9, green: 0.7, blue: 0.2)
        case "scripted":  return Color(red: 0.4, green: 0.6, blue: 0.9)
        default:          return Color.white.opacity(0.3)
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(statusColor).frame(width: 5, height: 5)
            Text(video.title)
                .font(.system(size: 9))
                .foregroundColor(.white.opacity(0.7))
                .lineLimit(2)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 5)
        .background(Color.white.opacity(0.05))
        .cornerRadius(6)
    }
}
