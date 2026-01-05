import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Widget Entry

/// Timeline entry containing countdown data for widget display
struct CountdownWidgetEntry: TimelineEntry {
    let date: Date
    let event: CountdownEvent?
    let appearanceMode: WidgetAppearanceMode
    let countdownStyle: WidgetCountdownStyle
    let configuration: CountdownEventEntity?
}

// MARK: - Timeline Provider for iOS 17+

@available(iOS 17.0, *)
struct CountdownWidgetProvider: AppIntentTimelineProvider {
    typealias Entry = CountdownWidgetEntry
    typealias Intent = SelectCountdownIntent
    
    func placeholder(in context: Context) -> CountdownWidgetEntry {
        CountdownWidgetEntry(
            date: Date(),
            event: CountdownEvent(
                id: "placeholder",
                title: "My Event",
                targetDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400 * 7)),
                emoji: "🎉",
                emojiColor: nil,
                isRecurring: false,
                createdAt: ISO8601DateFormatter().string(from: Date())
            ),
            appearanceMode: .light,
            countdownStyle: .focus,
            configuration: nil
        )
    }
    
    func snapshot(for configuration: SelectCountdownIntent, in context: Context) async -> CountdownWidgetEntry {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        
        // Get selected event or first available
        let event: CountdownEvent?
        if let selectedId = configuration.countdown?.id {
            event = widgetData?.events.first { $0.id == selectedId }
        } else {
            event = widgetData?.events.first
        }
        
        return CountdownWidgetEntry(
            date: Date(),
            event: event,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: widgetData?.countdownStyleEnum ?? .focus,
            configuration: configuration.countdown
        )
    }
    
    func timeline(for configuration: SelectCountdownIntent, in context: Context) async -> Timeline<CountdownWidgetEntry> {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        
        // Get selected event or first available
        let event: CountdownEvent?
        if let selectedId = configuration.countdown?.id {
            event = widgetData?.events.first { $0.id == selectedId }
        } else {
            event = widgetData?.events.first
        }
        
        let entry = CountdownWidgetEntry(
            date: Date(),
            event: event,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: widgetData?.countdownStyleEnum ?? .focus,
            configuration: configuration.countdown
        )
        
        // Refresh every minute for countdown accuracy
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

// MARK: - Timeline Provider for iOS 16 (Static - no configuration)

struct CountdownWidgetProviderStatic: TimelineProvider {
    typealias Entry = CountdownWidgetEntry

    func placeholder(in context: Context) -> CountdownWidgetEntry {
        CountdownWidgetEntry(
            date: Date(),
            event: CountdownEvent(
                id: "placeholder",
                title: "My Event",
                targetDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400 * 7)),
                emoji: "🎉",
                emojiColor: nil,
                isRecurring: false,
                createdAt: ISO8601DateFormatter().string(from: Date())
            ),
            appearanceMode: .light,
            countdownStyle: .focus,
            configuration: nil
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (CountdownWidgetEntry) -> ()) {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = widgetData?.events.first
        let entry = CountdownWidgetEntry(
            date: Date(),
            event: event,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: widgetData?.countdownStyleEnum ?? .focus,
            configuration: nil
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CountdownWidgetEntry>) -> ()) {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = widgetData?.events.first
        let entry = CountdownWidgetEntry(
            date: Date(),
            event: event,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: widgetData?.countdownStyleEnum ?? .focus,
            configuration: nil
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Widget View

struct CountdownWidgetEntryView: View {
    var entry: CountdownWidgetEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        if let event = entry.event {
            let targetDate = event.isRecurring ? event.getNextRecurringDate() : event.targetDateAsDate
            let countdown = CountdownTime.calculate(from: targetDate)
            let progress = WidgetDataSync.shared.calculateProgress(for: event)
            
            switch family {
            case .systemSmall:
                SmallWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
            case .systemMedium:
                MediumWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
            case .systemLarge:
                LargeWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
            case .systemExtraLarge:
                ExtraLargeWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
            @unknown default:
                SmallWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
            }
        } else {
            EmptyWidgetView(family: family)
        }
    }
}


// MARK: - Widget Bundle

@main
struct CountdownWidgetBundle: WidgetBundle {
    var body: some Widget {
        // Only show the configurable widget on iOS 17+
        // The static widget is only for iOS 14-16
        CountdownWidgetWrapper()
    }
}

/// Wrapper that returns the appropriate widget based on iOS version
struct CountdownWidgetWrapper: Widget {
    let kind: String = "CountdownWidget"
    
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: kind,
                intent: SelectCountdownIntent.self,
                provider: CountdownWidgetProvider()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            }
            .configurationDisplayName("Countdown")
            .description("Track your upcoming events with a countdown timer.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownWidgetProviderStatic()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("Countdown")
            .description("Track your upcoming events with a countdown timer.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        }
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview(as: .systemSmall) {
    CountdownWidgetWrapper()
} timeline: {
    CountdownWidgetEntry(
        date: Date(),
        event: CountdownEvent(
            id: "preview",
            title: "Birthday",
            targetDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400 * 30)),
            emoji: "🎂",
            emojiColor: "#FF6B6B",
            isRecurring: true,
            createdAt: ISO8601DateFormatter().string(from: Date())
        ),
        appearanceMode: .light,
        countdownStyle: .focus,
        configuration: nil
    )
}
#endif

