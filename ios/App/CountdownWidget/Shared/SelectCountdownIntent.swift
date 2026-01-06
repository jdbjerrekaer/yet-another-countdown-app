import Foundation
import AppIntents
import WidgetKit

/// Entity representing a countdown event for App Intent selection
@available(iOS 16.0, *)
struct CountdownEventEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Countdown Event"
    static var defaultQuery = CountdownEventQuery()
    
    var id: String
    var title: String
    var emoji: String
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(title)")
    }
}

/// Query for fetching countdown events
@available(iOS 16.0, *)
struct CountdownEventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CountdownEventEntity] {
        let events = WidgetDataSync.shared.loadEvents()
        print("CountdownEventQuery.entities: Found \(events.count) events for identifiers: \(identifiers)")
        return events
            .filter { identifiers.contains($0.id) }
            .map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
    }
    
    func suggestedEntities() async throws -> [CountdownEventEntity] {
        let events = WidgetDataSync.shared.loadEvents()
        print("CountdownEventQuery.suggestedEntities: Found \(events.count) events")
        
        if events.isEmpty {
            print("CountdownEventQuery: No events found - App Group may not be configured or no countdowns created yet")
            // Return empty array - iOS will show "No options available" message
            return []
        }
        
        return events.map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
    }
    
    func defaultResult() async -> CountdownEventEntity? {
        let events = WidgetDataSync.shared.loadEvents()
        print("CountdownEventQuery.defaultResult: Found \(events.count) events")
        guard let first = events.first else { 
            print("CountdownEventQuery: No default result - returning nil")
            return nil 
        }
        return CountdownEventEntity(id: first.id, title: first.title, emoji: first.emoji)
    }
}

/// App Intent for selecting which countdown to display in a widget
@available(iOS 17.0, *)
struct SelectCountdownIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Countdown"
    static var description = IntentDescription("Choose which countdown to display")
    
    @Parameter(title: "Countdown")
    var countdown: CountdownEventEntity?
    
    init() {}
    
    init(countdown: CountdownEventEntity?) {
        self.countdown = countdown
    }
}

/// App Intent for selecting three countdowns to display in a triple widget
@available(iOS 17.0, *)
struct SelectTripleCountdownIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Triple Countdown"
    static var description = IntentDescription("Choose three countdowns to display")
    
    @Parameter(title: "First Countdown")
    var countdown1: CountdownEventEntity?
    
    @Parameter(title: "Second Countdown")
    var countdown2: CountdownEventEntity?
    
    @Parameter(title: "Third Countdown")
    var countdown3: CountdownEventEntity?
    
    init() {}
    
    init(countdown1: CountdownEventEntity?, countdown2: CountdownEventEntity?, countdown3: CountdownEventEntity?) {
        self.countdown1 = countdown1
        self.countdown2 = countdown2
        self.countdown3 = countdown3
    }
}

