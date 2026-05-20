import SwiftUI
import AppKit

struct ChatSidebarView: View {
    @EnvironmentObject var store: AppStore
    @Binding var isCollapsed: Bool
    @State private var inputText = ""
    @State private var isLoading = false
    @FocusState private var inputFocused: Bool

    let quickPrompts = [
        "Stato del sistema",
        "Genera 3 idee video",
        "Analizza la settimana",
        "Buffer attuale?",
        "Prossima pubblicazione"
    ]

    var body: some View {
        ZStack {
            VisualEffectView(material: .sidebar, blendingMode: .behindWindow)

            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("CHAT-AI")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.white)
                            .tracking(3)
                        Text("Controlla tutto da qui")
                            .font(.system(size: 9))
                            .foregroundColor(.white.opacity(0.35))
                    }
                    Spacer()
                    Button {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            isCollapsed = true
                        }
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)

                Rectangle().fill(Color.white.opacity(0.07)).frame(height: 1)

                // Quick prompts
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 7) {
                        ForEach(quickPrompts, id: \.self) { prompt in
                            Button { inputText = prompt; inputFocused = true } label: {
                                Text(prompt)
                                    .font(.system(size: 10))
                                    .foregroundColor(.white.opacity(0.6))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Color.white.opacity(0.08))
                                    .cornerRadius(20)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }

                Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1)

                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 10) {
                            if store.chatMessages.isEmpty {
                                VStack(spacing: 8) {
                                    Image(systemName: "sparkles")
                                        .font(.system(size: 24))
                                        .foregroundColor(.white.opacity(0.2))
                                    Text("Chiedimi qualsiasi cosa\nsul sistema")
                                        .font(.system(size: 12))
                                        .foregroundColor(.white.opacity(0.3))
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                            }
                            ForEach(store.chatMessages) { msg in
                                ChatBubble(message: msg)
                                    .id(msg.id)
                            }
                            if isLoading {
                                LoadingIndicator()
                            }
                        }
                        .padding(14)
                    }
                    .onChange(of: store.chatMessages.count) { _ in
                        if let last = store.chatMessages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }

                Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1)

                // Input
                HStack(alignment: .bottom, spacing: 8) {
                    TextField("Scrivi a Claude...", text: $inputText, axis: .vertical)
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                        .lineLimit(1...5)
                        .focused($inputFocused)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.07))
                        .cornerRadius(10)
                        .onSubmit { sendMessage() }

                    Button(action: sendMessage) {
                        Image(systemName: isLoading ? "stop.fill" : "arrow.up")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.black)
                            .frame(width: 28, height: 28)
                            .background(isLoading ? Color.red.opacity(0.8) : Color(red: 0.4, green: 0.8, blue: 0.6))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(12)
            }
        }
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        store.chatMessages.append(ChatMessage(role: .user, content: text))
        inputText = ""
        isLoading = true
        Task {
            let response = await store.sendToClaude(text)
            await MainActor.run {
                store.chatMessages.append(ChatMessage(role: .assistant, content: response))
                isLoading = false
            }
        }
    }
}

struct ChatBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.role == .assistant {
                Circle()
                    .fill(Color(red: 0.4, green: 0.8, blue: 0.6))
                    .frame(width: 18, height: 18)
                    .overlay(Text("W").font(.system(size: 8, weight: .black)).foregroundColor(.black))
            }
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 3) {
                Text(message.content)
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(message.role == .user ? 0.85 : 0.8))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(
                        message.role == .user
                        ? Color.white.opacity(0.09)
                        : Color.clear
                    )
                    .cornerRadius(10)
            }
            if message.role == .user { Spacer() }
        }
    }
}

struct LoadingIndicator: View {
    @State private var opacity: Double = 0.3

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(Color(red: 0.4, green: 0.8, blue: 0.6)).frame(width: 5, height: 5)
                .opacity(opacity).animation(.easeInOut(duration: 0.5).repeatForever().delay(0), value: opacity)
            Circle().fill(Color(red: 0.4, green: 0.8, blue: 0.6)).frame(width: 5, height: 5)
                .opacity(opacity).animation(.easeInOut(duration: 0.5).repeatForever().delay(0.15), value: opacity)
            Circle().fill(Color(red: 0.4, green: 0.8, blue: 0.6)).frame(width: 5, height: 5)
                .opacity(opacity).animation(.easeInOut(duration: 0.5).repeatForever().delay(0.3), value: opacity)
        }
        .padding(.leading, 26)
        .onAppear { opacity = 1.0 }
    }
}

struct VisualEffectView: NSViewRepresentable {
    let material: NSVisualEffectView.Material
    let blendingMode: NSVisualEffectView.BlendingMode
    func makeNSView(context: Context) -> NSVisualEffectView {
        let v = NSVisualEffectView()
        v.material = material
        v.blendingMode = blendingMode
        v.state = .active
        return v
    }
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}
