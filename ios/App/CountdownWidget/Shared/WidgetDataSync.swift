import Foundation

final class WidgetDataSync {
    static let appGroupIdentifier = "group.countdown.timer.data"
    private static let widgetDataKey = "widgetData"
    static let shared = WidgetDataSync()

    private init() {}

    func loadWidgetData() -> WidgetData? {
        guard let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier),
              let jsonData = userDefaults.data(forKey: Self.widgetDataKey) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetData.self, from: jsonData)
    }

    func loadEvents() -> [CountdownEvent] {
        loadWidgetData()?.events ?? []
    }

    func loadEvent(id: String) -> CountdownEvent? {
        loadEvents().first { $0.id == id }
    }

    func getAppearanceMode() -> WidgetAppearanceMode {
        loadWidgetData()?.appearanceModeEnum ?? .light
    }

    func getCountdownStyle() -> WidgetCountdownStyle {
        loadWidgetData()?.countdownStyleEnum ?? .focus
    }

    func isLegacyTimeFormat() -> Bool {
        loadWidgetData()?.legacyTimeFormat ?? false
    }

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

        let cycleStart: Date
        if event.isRecurring {
            cycleStart = calendar.date(byAdding: .year, value: -1, to: targetDate) ?? targetDate
        } else if let created = event.createdAtAsDate {
            cycleStart = created
        } else {
            cycleStart = calendar.date(byAdding: .year, value: -1, to: targetDate) ?? targetDate
        }

        let totalDuration = targetDate.timeIntervalSince(cycleStart)
        guard totalDuration > 0 else { return 0 }

        if now >= targetDate {
            let elapsed = now.timeIntervalSince(targetDate)
            return min(2.0, elapsed / totalDuration)
        } else {
            let remaining = targetDate.timeIntervalSince(now)
            return max(0, min(1.0, remaining / totalDuration))
        }
    }
}
