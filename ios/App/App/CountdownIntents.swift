import AppIntents
import Foundation
import WidgetKit

private let countdownAppGroupIdentifier = "group.countdown.timer.data"
private let countdownWidgetDataKey = "widgetData"
private let defaultEmoji = "\u{1F4C5}"

struct CountdownEvent: Codable, Hashable {
    let id: String
    let title: String
    let targetDate: String
    let emoji: String
    let emojiColor: String?
    let isRecurring: Bool
    let createdAt: String
}

struct WidgetData: Codable {
    var events: [CountdownEvent]
    var appearanceMode: String
    var countdownStyle: String
    var lastUpdated: String?
}

final class CountdownStorage {
    static let shared = CountdownStorage()

    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    private let fallbackIsoFormatter = ISO8601DateFormatter()
    private let displayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.locale = .current
        return formatter
    }()

    private init() {}

    func loadWidgetData() -> WidgetData? {
        guard let userDefaults = UserDefaults(suiteName: countdownAppGroupIdentifier),
              let jsonData = userDefaults.data(forKey: countdownWidgetDataKey) else {
            return nil
        }

        do {
            let decoder = JSONDecoder()
            return try decoder.decode(WidgetData.self, from: jsonData)
        } catch {
            return nil
        }
    }

    func saveWidgetData(_ data: WidgetData) -> Bool {
        guard let userDefaults = UserDefaults(suiteName: countdownAppGroupIdentifier) else {
            return false
        }

        do {
            let encoder = JSONEncoder()
            let jsonData = try encoder.encode(data)
            userDefaults.set(jsonData, forKey: countdownWidgetDataKey)
            userDefaults.synchronize()
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            return true
        } catch {
            return false
        }
    }

    func loadEvents() -> [CountdownEvent] {
        loadWidgetData()?.events ?? []
    }

    func addEvent(
        title: String,
        targetDate: Date,
        emoji: String,
        emojiColor: String?,
        isRecurring: Bool
    ) -> CountdownEvent {
        let trimmedEmoji = emoji.trimmingCharacters(in: .whitespacesAndNewlines)
        let safeEmoji = trimmedEmoji.isEmpty ? defaultEmoji : trimmedEmoji
        let trimmedColor = emojiColor?.trimmingCharacters(in: .whitespacesAndNewlines)
        let safeColor = trimmedColor?.isEmpty == true ? nil : trimmedColor
        let event = CountdownEvent(
            id: UUID().uuidString,
            title: title,
            targetDate: isoFormatter.string(from: targetDate),
            emoji: safeEmoji,
            emojiColor: safeColor,
            isRecurring: isRecurring,
            createdAt: isoFormatter.string(from: Date())
        )

        var widgetData = loadWidgetData() ?? WidgetData(
            events: [],
            appearanceMode: "light",
            countdownStyle: "focus",
            lastUpdated: nil
        )
        widgetData.events.append(event)
        widgetData.lastUpdated = isoFormatter.string(from: Date())
        _ = saveWidgetData(widgetData)

        return event
    }

    func event(withId id: String) -> CountdownEvent? {
        loadEvents().first { $0.id == id }
    }

    func parseDate(from isoString: String) -> Date? {
        isoFormatter.date(from: isoString) ?? fallbackIsoFormatter.date(from: isoString)
    }

    func formatDateForDisplay(_ date: Date) -> String {
        displayFormatter.string(from: date)
    }
}

@available(iOS 16.0, *)
struct CountdownEventEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Countdown"
    static var defaultQuery = CountdownEventQuery()

    var id: String
    var title: String
    var emoji: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(title)")
    }
}

@available(iOS 16.0, *)
struct CountdownEventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CountdownEventEntity] {
        let events = CountdownStorage.shared.loadEvents()
        return events
            .filter { identifiers.contains($0.id) }
            .map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
    }

    func suggestedEntities() async throws -> [CountdownEventEntity] {
        let events = CountdownStorage.shared.loadEvents()
        return events.map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
    }
}

@available(iOS 16.0, *)
enum CountdownIntentError: Error, LocalizedError {
    case notFound

    var errorDescription: String? {
        switch self {
        case .notFound:
            return "Countdown not found."
        }
    }
}

@available(iOS 16.0, *)
struct CreateCountdownIntent: AppIntent {
    static var title: LocalizedStringResource = "Create Countdown"
    static var description = IntentDescription("Create a new countdown.")

    @Parameter(title: "Title")
    var title: String

    @Parameter(title: "Target Date")
    var targetDate: Date

    @Parameter(title: "Emoji", default: "📅")
    var emoji: String

    @Parameter(title: "Emoji Color (Hex)")
    var emojiColor: String?

    @Parameter(title: "Recurring (Override)")
    var isRecurringOverride: Bool?

    static var parameterSummary: some ParameterSummary {
        Summary("Create \(\.$title) on \(\.$targetDate)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<CountdownEventEntity> & ProvidesDialog {
        let oneYearAgo = Calendar.current.date(byAdding: .year, value: -1, to: Date()) ?? Date.distantPast
        let autoRecurring = targetDate < oneYearAgo
        let resolvedRecurring = isRecurringOverride ?? autoRecurring

        let created = CountdownStorage.shared.addEvent(
            title: title,
            targetDate: targetDate,
            emoji: emoji,
            emojiColor: emojiColor,
            isRecurring: resolvedRecurring
        )
        let formattedDate = CountdownStorage.shared.formatDateForDisplay(targetDate)
        let entity = CountdownEventEntity(id: created.id, title: created.title, emoji: created.emoji)
        return .result(
            value: entity,
            dialog: IntentDialog("Created \(created.emoji) \(created.title) for \(formattedDate).")
        )
    }
}

@available(iOS 16.0, *)
struct ListCountdownsIntent: AppIntent {
    static var title: LocalizedStringResource = "List Countdowns"
    static var description = IntentDescription("List all countdowns.")

    func perform() async throws -> some IntentResult & ReturnsValue<[CountdownEventEntity]> & ProvidesDialog {
        let events = CountdownStorage.shared.loadEvents()
        let entities = events.map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
        let dialog = entities.isEmpty ? "You do not have any countdowns yet." : "You have \(entities.count) countdowns."
        return .result(value: entities, dialog: IntentDialog(stringLiteral: dialog))
    }
}

@available(iOS 16.0, *)
struct GetCountdownIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Countdown Details"
    static var description = IntentDescription("Get details for a countdown.")

    @Parameter(title: "Countdown")
    var countdown: CountdownEventEntity

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let event = CountdownStorage.shared.event(withId: countdown.id) else {
            throw CountdownIntentError.notFound
        }

        let formattedDate = CountdownStorage.shared.parseDate(from: event.targetDate)
            .map { CountdownStorage.shared.formatDateForDisplay($0) }
            ?? event.targetDate
        let summary = "\(event.emoji) \(event.title) on \(formattedDate)"
        return .result(value: summary, dialog: IntentDialog(stringLiteral: summary))
    }
}

@available(iOS 16.0, *)
struct GetCountdownRelativeTimeIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Countdown Relative Time"
    static var description = IntentDescription("Get relative time until a countdown.")

    @Parameter(title: "Countdown")
    var countdown: CountdownEventEntity

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let event = CountdownStorage.shared.event(withId: countdown.id) else {
            throw CountdownIntentError.notFound
        }

        guard let targetDate = CountdownStorage.shared.parseDate(from: event.targetDate) else {
            let fallback = "I could not read the date for \(event.title)."
            return .result(value: fallback, dialog: IntentDialog(stringLiteral: fallback))
        }

        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        let startOfTarget = calendar.startOfDay(for: targetDate)
        let dayDelta = calendar.dateComponents([.day], from: startOfToday, to: startOfTarget).day ?? 0

        let relative: String
        if dayDelta == 0 {
            relative = "today"
        } else if dayDelta > 0 {
            relative = "in \(dayDelta) days"
        } else {
            relative = "\(abs(dayDelta)) days ago"
        }

        let summary = "\(event.title) is \(relative)."
        return .result(value: summary, dialog: IntentDialog(stringLiteral: summary))
    }
}

@available(iOS 16.0, *)
struct CountdownShortcutsProvider: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CreateCountdownIntent(),
            phrases: [
                "Create a countdown in \(.applicationName)",
                "Add a countdown in \(.applicationName)"
            ],
            shortTitle: "Create Countdown",
            systemImageName: "calendar.badge.plus"
        )
        AppShortcut(
            intent: ListCountdownsIntent(),
            phrases: [
                "List my countdowns in \(.applicationName)",
                "Show my countdowns in \(.applicationName)"
            ],
            shortTitle: "List Countdowns",
            systemImageName: "list.bullet"
        )
        AppShortcut(
            intent: GetCountdownIntent(),
            phrases: [
                "Get countdown details in \(.applicationName)",
                "Show countdown details in \(.applicationName)"
            ],
            shortTitle: "Get Countdown",
            systemImageName: "info.circle"
        )
        AppShortcut(
            intent: GetCountdownRelativeTimeIntent(),
            phrases: [
                "How long until my countdown in \(.applicationName)",
                "How long until my \(.applicationName) countdown"
            ],
            shortTitle: "Countdown Relative Time",
            systemImageName: "clock"
        )
    }
}
