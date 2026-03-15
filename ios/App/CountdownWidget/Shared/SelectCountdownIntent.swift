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
    private func entities(from events: [CountdownEvent], logContext: String) -> [WidgetCountdownEntity] {
        print("WidgetCountdownQuery.\(logContext): Building entities from raw event IDs: \(events.map(\.id))")
        let resolvedEntities = events
            .filter { !$0.id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .map { WidgetCountdownEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }

        let resolvedIds = resolvedEntities.map(\.id)
        print("WidgetCountdownQuery.\(logContext): Returning \(resolvedEntities.count) entities with IDs: \(resolvedIds)")
        return resolvedEntities
    }

    func entities(for identifiers: [String]) async throws -> [WidgetCountdownEntity] {
        print("WidgetCountdownQuery.entities(for:): ENTER identifiers = \(identifiers)")
        let events = WidgetDataSync.shared.loadEvents()
        print("WidgetCountdownQuery.entities(for:): Found \(events.count) events for identifiers: \(identifiers)")

        let matchingEvents = events.filter { identifiers.contains($0.id) }
        if matchingEvents.isEmpty {
            print("WidgetCountdownQuery.entities(for:): No matches found for identifiers: \(identifiers)")
        }

        return entities(from: matchingEvents, logContext: "entities(for:)")
    }
    
    func suggestedEntities() async throws -> [WidgetCountdownEntity] {
        print("WidgetCountdownQuery.suggestedEntities: ENTER")
        let events = WidgetDataSync.shared.loadEvents()
        print("WidgetCountdownQuery.suggestedEntities: Found \(events.count) events")
        
        if events.isEmpty {
            print("WidgetCountdownQuery: No events found - App Group may not be configured or no countdowns created yet")
            // Return empty array - iOS will show "No options available" message
            return []
        }
        
        return entities(from: events, logContext: "suggestedEntities")
    }
    
    func defaultResult() async -> WidgetCountdownEntity? {
        print("WidgetCountdownQuery.defaultResult: ENTER")
        let events = WidgetDataSync.shared.loadEvents()
        print("WidgetCountdownQuery.defaultResult: Found \(events.count) events")
        guard let first = events.first else { 
            print("WidgetCountdownQuery: No default result - returning nil")
            return nil 
        }

        let defaultEntity = WidgetCountdownEntity(id: first.id, title: first.title, emoji: first.emoji)
        print("WidgetCountdownQuery.defaultResult: Returning default ID \(defaultEntity.id)")
        return defaultEntity
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
