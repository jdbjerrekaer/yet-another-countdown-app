import Foundation

/// Helper class for syncing widget data from the shared App Group storage
final class WidgetDataSync {
    /// App Group identifier shared between the main app and widget extension
    static let appGroupIdentifier = "group.countdown.timer.data"
    
    /// Key used to store widget data in UserDefaults
    private static let widgetDataKey = "widgetData"
    
    /// Shared instance
    static let shared = WidgetDataSync()
    
    private init() {}
    
    /// Load widget data from shared storage
    func loadWidgetData() -> WidgetData? {
        print("WidgetDataSync: ========== LOADING WIDGET DATA ==========")
        print("WidgetDataSync: App Group identifier: \(Self.appGroupIdentifier)")
        
        guard let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier) else {
            print("WidgetDataSync: ❌ FAILED to access App Group storage")
            print("WidgetDataSync: Make sure App Groups capability is enabled for BOTH App and CountdownWidget targets")
            print("WidgetDataSync: The App Group must be: \(Self.appGroupIdentifier)")
            return nil
        }
        
        print("WidgetDataSync: ✅ Successfully accessed App Group UserDefaults")
        
        // List all keys to see what's stored
        let allKeys = userDefaults.dictionaryRepresentation().keys.sorted()
        print("WidgetDataSync: All keys in App Group (\(allKeys.count) total): \(Array(allKeys.prefix(10)))")
        
        guard let jsonData = userDefaults.data(forKey: Self.widgetDataKey) else {
            print("WidgetDataSync: ❌ No data found at key '\(Self.widgetDataKey)'")
            print("WidgetDataSync: Have you opened the app and created/edited a countdown?")
            return nil
        }
        
        print("WidgetDataSync: ✅ Found \(jsonData.count) bytes of data")
        
        // Print raw JSON for debugging
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            print("WidgetDataSync: Raw JSON preview: \(jsonString.prefix(300))...")
        }
        
        do {
            let decoder = JSONDecoder()
            let widgetData = try decoder.decode(WidgetData.self, from: jsonData)
            print("WidgetDataSync: ✅ Successfully decoded \(widgetData.events.count) events")
            for (index, event) in widgetData.events.enumerated() {
                print("WidgetDataSync:   Event \(index): \(event.emoji) \(event.title)")
            }
            return widgetData
        } catch {
            print("WidgetDataSync: ❌ Failed to decode widget data")
            print("WidgetDataSync: Decode error: \(error)")
            return nil
        }
    }
    
    /// Load all countdown events
    func loadEvents() -> [CountdownEvent] {
        loadWidgetData()?.events ?? []
    }
    
    /// Load a specific event by ID
    func loadEvent(id: String) -> CountdownEvent? {
        loadEvents().first { $0.id == id }
    }
    
    /// Get the current appearance mode
    func getAppearanceMode() -> WidgetAppearanceMode {
        loadWidgetData()?.appearanceModeEnum ?? .light
    }
    
    /// Get the current countdown style
    func getCountdownStyle() -> WidgetCountdownStyle {
        loadWidgetData()?.countdownStyleEnum ?? .focus
    }
    
    /// Calculate progress percentage for a countdown event
    func calculateProgress(for event: CountdownEvent) -> Double {
        let target: Date?
        if event.isRecurring {
            target = event.getNextRecurringDate()
        } else {
            target = event.targetDateAsDate
        }
        
        guard let targetDate = target else { return 0 }
        
        let now = Date()
        let calendar = Calendar.current
        
        // Determine cycle start
        let cycleStart: Date
        if event.isRecurring {
            // For recurring, cycle is one year
            cycleStart = calendar.date(byAdding: .year, value: -1, to: targetDate) ?? targetDate
        } else if let created = event.createdAtAsDate {
            cycleStart = created
        } else {
            // Fallback to 1 year before target
            cycleStart = calendar.date(byAdding: .year, value: -1, to: targetDate) ?? targetDate
        }
        
        let totalDuration = targetDate.timeIntervalSince(cycleStart)
        guard totalDuration > 0 else { return 0 }
        
        if now >= targetDate {
            // Past event
            let elapsed = now.timeIntervalSince(targetDate)
            return min(2.0, elapsed / totalDuration) // Cap at 200%
        } else {
            // Future event
            let remaining = targetDate.timeIntervalSince(now)
            return max(0, min(1.0, remaining / totalDuration))
        }
    }
}
