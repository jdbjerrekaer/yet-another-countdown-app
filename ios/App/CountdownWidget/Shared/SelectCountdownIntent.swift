import Foundation
import AppIntents
import WidgetKit

/// Entity representing a countdown event for App Intent selection
@available(iOS 16.0, *)
struct WidgetCountdownEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Countdown Event"
    static var defaultQuery = WidgetCountdownQuery()

    var id: String
    var title: String
    var emoji: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(title)")
    }
}

/// Query for fetching countdown events
@available(iOS 16.0, *)
struct WidgetCountdownQuery: EntityQuery {
    private func entities(from events: [CountdownEvent]) -> [WidgetCountdownEntity] {
        events
            .filter { !$0.id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .map { WidgetCountdownEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
    }

    func entities(for identifiers: [String]) async throws -> [WidgetCountdownEntity] {
        let events = WidgetDataSync.shared.loadEvents().filter { identifiers.contains($0.id) }
        return entities(from: events)
    }

    func suggestedEntities() async throws -> [WidgetCountdownEntity] {
        entities(from: WidgetDataSync.shared.loadEvents())
    }

    func defaultResult() async -> WidgetCountdownEntity? {
        guard let first = WidgetDataSync.shared.loadEvents().first else { return nil }
        return WidgetCountdownEntity(id: first.id, title: first.title, emoji: first.emoji)
    }
}

/// App Intent for selecting which countdown to display in a widget
@available(iOS 17.0, *)
struct SelectCountdownIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Countdown"
    static var description = IntentDescription("Choose which countdown to display")

    @Parameter(title: "Countdown")
    var countdown: WidgetCountdownEntity?

    init() {
        self.countdown = nil
    }

    init(countdown: WidgetCountdownEntity? = nil) {
        self.countdown = countdown
    }
}

/// App Intent for selecting three countdowns to display in a triple widget
@available(iOS 17.0, *)
struct SelectTripleCountdownIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Triple Countdown"
    static var description = IntentDescription("Choose three countdowns to display")

    @Parameter(title: "First Countdown")
    var countdown1: WidgetCountdownEntity?

    @Parameter(title: "Second Countdown")
    var countdown2: WidgetCountdownEntity?

    @Parameter(title: "Third Countdown")
    var countdown3: WidgetCountdownEntity?

    init() {}

    init(countdown1: WidgetCountdownEntity?, countdown2: WidgetCountdownEntity?, countdown3: WidgetCountdownEntity?) {
        self.countdown1 = countdown1
        self.countdown2 = countdown2
        self.countdown3 = countdown3
    }
}
