# Come aprire WhyPost Mission Control in Xcode

1. Apri Xcode
2. File → New → Project
3. Seleziona: macOS → App
4. Product Name: WhyPost
5. Interface: SwiftUI
6. Language: Swift
7. Bundle Identifier: com.whyed.whypost
8. Minimum Deployment: macOS 13.0 (richiesto da Swift Charts built-in)
9. Salva in: ~/Documents/WhyPost/mission-control/

Poi:
- Cancella i file di default (ContentView.swift, Assets.xcassets se vuoi)
- Trascina tutti i file .swift dalla cartella WhyPost/ nel progetto Xcode
- Assicurati che "Add to target: WhyPost" sia selezionato per ogni file
- In Info.plist aggiungi: NSAppTransportSecurity → NSAllowsLocalNetworking = YES
- Build (⌘B) → deve compilare senza errori
- Run (⌘R) → app si avvia

## Struttura file da aggiungere al progetto Xcode

```
WhyPost/
├── WhyPostApp.swift          ← entry point @main
├── ContentView.swift         ← split view root
├── AppStore.swift            ← ObservableObject + networking
├── Models/
│   └── ChatMessage.swift     ← struct ChatMessage
└── Views/
    ├── DashboardView.swift   ← colonna sinistra 65%
    ├── StatisticsView.swift  ← buffer card + bar chart
    ├── CalendarView.swift    ← 7 colonne settimanali
    ├── BottomBarView.swift   ← argomenti | quantità | social
    ├── AgentStatusGridView.swift ← grid 3×3 agenti
    ├── ChatSidebarView.swift ← sidebar CHAT-AI destra 35%
    └── StatusBadgeView.swift ← badge RUNNING/IDLE header
```

## Dipendenze framework
- Charts (built-in da macOS 13 / Xcode 14+) — nessuna dipendenza SPM richiesta
- AppKit — built-in (usato per NSVisualEffectView nella sidebar)

## Note importanti
- Il server Flask deve girare su :5174 per i dati live
- Per avviarlo: `cd ~/Documents/WhyPost && source venv/bin/activate && python server/app.py`
- Se usi macOS 12 come target, aggiungi Swift Charts via SPM:
  https://github.com/apple/swift-charts (incluso in Xcode 14+ per macOS 13+)
- NSAllowsLocalNetworking in Info.plist è necessario per le chiamate HTTP a localhost

## Configurazione Info.plist (aggiungere manualmente)
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```
