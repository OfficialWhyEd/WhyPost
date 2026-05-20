import Foundation
import Combine

struct BufferState: Codable {
    var ready_videos: Int
    var target_days: Int
    var next_publish: String?
}

struct SystemState: Codable {
    var system: String
    var buffer: BufferState
}

struct VideoItem: Codable, Identifiable {
    var id: String
    var title: String
    var status: String
    var platform: [String]
    var scheduled_at: String?
    var language: String?
}

@MainActor
class AppStore: ObservableObject {
    @Published var systemStatus: String = "idle"
    @Published var buffer = BufferState(ready_videos: 0, target_days: 7, next_publish: nil)
    @Published var queue: [VideoItem] = []
    @Published var chatMessages: [ChatMessage] = []
    @Published var agentStatuses: [String: String] = [
        "MAIN": "idle", "EXEL": "idle", "SCRIPT": "idle",
        "ASSET": "idle", "CLACK": "idle", "SAFETY": "idle",
        "PUBLISHER": "idle", "TELEMETRY": "idle", "OPUS": "idle"
    ]

    private let baseURL = "http://localhost:5174"
    private var timer: Timer?

    func startPolling() {
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { await self?.fetchAll() }
        }
        Task { await fetchAll() }
    }

    func stopPolling() { timer?.invalidate() }

    func fetchAll() async {
        await fetchState()
        await fetchQueue()
    }

    private func fetchState() async {
        guard let url = URL(string: "\(baseURL)/state"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return }

        if let system = json["system"] as? String { systemStatus = system }
        if let bufData = try? JSONSerialization.data(withJSONObject: json["buffer"] ?? [:]),
           let buf = try? JSONDecoder().decode(BufferState.self, from: bufData) {
            buffer = buf
        }
        if let agents = json["agents"] as? [String: [String: Any]] {
            for (name, info) in agents {
                agentStatuses[name] = info["status"] as? String ?? "idle"
            }
        }
    }

    private func fetchQueue() async {
        guard let url = URL(string: "\(baseURL)/queue"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let videosData = json["videos"] as? [[String: Any]]
        else { return }

        queue = videosData.compactMap { v in
            guard let id = v["id"] as? String, let title = v["title"] as? String,
                  let status = v["status"] as? String
            else { return nil }
            return VideoItem(
                id: id, title: title, status: status,
                platform: v["platform"] as? [String] ?? [],
                scheduled_at: v["scheduled_at"] as? String,
                language: v["language"] as? String
            )
        }
    }

    func sendToClaude(_ userInput: String) async -> String {
        let stateContext = "Sistema: \(systemStatus). Buffer: \(buffer.ready_videos)/\(buffer.target_days)gg. Video coda: \(queue.count)."
        let prompt = "Sei l'AI di WhyPost Mission Control. \(stateContext)\nUtente: \(userInput)\nRispondi in modo conciso e operativo."

        guard let url = URL(string: "\(baseURL)/claude"),
              let body = try? JSONSerialization.data(withJSONObject: ["prompt": prompt])
        else { return "Errore: server Flask non raggiungibile su :5174" }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        req.timeoutInterval = 130

        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let response = json["response"] as? String
        else { return "Claude non raggiungibile. Avvia il server: python server/app.py" }

        return response
    }
}
