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

/// Timeline entry containing three countdown events for triple widget display
@available(iOS 17.0, *)
struct TripleCountdownWidgetEntry: TimelineEntry {
    let date: Date
    let event1: CountdownEvent?
    let event2: CountdownEvent?
    let event3: CountdownEvent?
    let appearanceMode: WidgetAppearanceMode
}

// MARK: - Timeline Provider for iOS 17+ (Focus/Timer Style)

@available(iOS 17.0, *)
struct CountdownTimerWidgetProvider: AppIntentTimelineProvider {
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
            countdownStyle: .focus, // Always use focus style for Timer widget
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
            countdownStyle: .focus, // Always use focus style for Timer widget
            configuration: configuration.countdown
        )
        
        // Refresh every minute for countdown accuracy
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

// MARK: - Timeline Provider for iOS 17+ (Visual Style)

@available(iOS 17.0, *)
struct CountdownVisualWidgetProvider: AppIntentTimelineProvider {
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
            countdownStyle: .visual,
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
            countdownStyle: .visual, // Always use visual style for Visual widget
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
            countdownStyle: .visual, // Always use visual style for Visual widget
            configuration: configuration.countdown
        )
        
        // Refresh every minute for countdown accuracy
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

// MARK: - Timeline Provider for iOS 16 (Static - Timer/Focus Style)

struct CountdownTimerWidgetProviderStatic: TimelineProvider {
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
            countdownStyle: .focus, // Always use focus style for Timer widget
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
            countdownStyle: .focus, // Always use focus style for Timer widget
            configuration: nil
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Timeline Provider for iOS 17+ (Classic/Flip Digit Style)

@available(iOS 17.0, *)
struct CountdownClassicWidgetProvider: AppIntentTimelineProvider {
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
            countdownStyle: .classic,
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
            countdownStyle: .classic, // Always use classic style for Classic widget
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
            countdownStyle: .classic, // Always use classic style for Classic widget
            configuration: configuration.countdown
        )
        
        // Refresh every minute for countdown accuracy
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

// MARK: - Timeline Provider for iOS 16 (Static - Visual Style)

struct CountdownVisualWidgetProviderStatic: TimelineProvider {
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
            countdownStyle: .visual,
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
            countdownStyle: .visual, // Always use visual style for Visual widget
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
            countdownStyle: .visual, // Always use visual style for Visual widget
            configuration: nil
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Timeline Provider for iOS 16 (Static - Classic/Flip Digit Style)

struct CountdownClassicWidgetProviderStatic: TimelineProvider {
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
            countdownStyle: .classic,
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
            countdownStyle: .classic, // Always use classic style for Classic widget
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
            countdownStyle: .classic, // Always use classic style for Classic widget
            configuration: nil
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Timeline Provider for Triple Countdown Widget

@available(iOS 17.0, *)
struct CountdownTripleWidgetProvider: AppIntentTimelineProvider {
    typealias Entry = TripleCountdownWidgetEntry
    typealias Intent = SelectTripleCountdownIntent
    
    func placeholder(in context: Context) -> TripleCountdownWidgetEntry {
        let placeholderEvent = CountdownEvent(
            id: "placeholder",
            title: "My Event",
            targetDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400 * 7)),
            emoji: "🎉",
            emojiColor: nil,
            isRecurring: false,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        return TripleCountdownWidgetEntry(
            date: Date(),
            event1: placeholderEvent,
            event2: placeholderEvent,
            event3: placeholderEvent,
            appearanceMode: .light
        )
    }
    
    func snapshot(for configuration: SelectTripleCountdownIntent, in context: Context) async -> TripleCountdownWidgetEntry {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let events = widgetData?.events ?? []
        
        // Get selected events or use first available
        let event1: CountdownEvent? = {
            if let id = configuration.countdown1?.id {
                return events.first { $0.id == id }
            }
            return events.first
        }()
        
        let event2: CountdownEvent? = {
            if let id = configuration.countdown2?.id {
                return events.first { $0.id == id }
            }
            return events.count > 1 ? events[1] : nil
        }()
        
        let event3: CountdownEvent? = {
            if let id = configuration.countdown3?.id {
                return events.first { $0.id == id }
            }
            return events.count > 2 ? events[2] : nil
        }()
        
        return TripleCountdownWidgetEntry(
            date: Date(),
            event1: event1,
            event2: event2,
            event3: event3,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light
        )
    }
    
    func timeline(for configuration: SelectTripleCountdownIntent, in context: Context) async -> Timeline<TripleCountdownWidgetEntry> {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let events = widgetData?.events ?? []
        
        // Get selected events or use first available
        let event1: CountdownEvent? = {
            if let id = configuration.countdown1?.id {
                return events.first { $0.id == id }
            }
            return events.first
        }()
        
        let event2: CountdownEvent? = {
            if let id = configuration.countdown2?.id {
                return events.first { $0.id == id }
            }
            return events.count > 1 ? events[1] : nil
        }()
        
        let event3: CountdownEvent? = {
            if let id = configuration.countdown3?.id {
                return events.first { $0.id == id }
            }
            return events.count > 2 ? events[2] : nil
        }()
        
        let entry = TripleCountdownWidgetEntry(
            date: Date(),
            event1: event1,
            event2: event2,
            event3: event3,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light
        )
        
        // Refresh every minute for countdown accuracy
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date()
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
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
            
            // Create deep link URL to open edit modal for this event
            let deepLinkURL = URL(string: "countdownapp://edit?id=\(event.id)")
            
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
                .widgetURL(deepLinkURL)
            case .systemMedium:
                MediumWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
                .widgetURL(deepLinkURL)
            case .systemLarge:
                LargeWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
                .widgetURL(deepLinkURL)
            @unknown default:
                SmallWidgetView(
                    event: event,
                    countdown: countdown,
                    targetDate: targetDate,
                    appearanceMode: entry.appearanceMode,
                    countdownStyle: entry.countdownStyle,
                    progress: progress
                )
                .widgetURL(deepLinkURL)
            }
        } else {
            EmptyWidgetView(family: family)
        }
    }
}

// MARK: - Triple Widget View

@available(iOS 17.0, *)
struct TripleLargeWidgetView: View {
    let event1: CountdownEvent?
    let event2: CountdownEvent?
    let event3: CountdownEvent?
    let appearanceMode: WidgetAppearanceMode
    
    @Environment(\.widgetRenderingMode) var widgetRenderingMode
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        VStack(spacing: 0) {
            if let event1 = event1 {
                Link(destination: URL(string: "countdownapp://edit?id=\(event1.id)")!) {
                    EventRowView(
                        event: event1,
                        appearanceMode: appearanceMode,
                        widgetRenderingMode: widgetRenderingMode,
                        colorScheme: colorScheme
                    )
                }
            } else {
                EmptyRowView(appearanceMode: appearanceMode)
            }
            
            Divider()
                .background(dividerColor)
            
            if let event2 = event2 {
                Link(destination: URL(string: "countdownapp://edit?id=\(event2.id)")!) {
                    EventRowView(
                        event: event2,
                        appearanceMode: appearanceMode,
                        widgetRenderingMode: widgetRenderingMode,
                        colorScheme: colorScheme
                    )
                }
            } else {
                EmptyRowView(appearanceMode: appearanceMode)
            }
            
            Divider()
                .background(dividerColor)
            
            if let event3 = event3 {
                Link(destination: URL(string: "countdownapp://edit?id=\(event3.id)")!) {
                    EventRowView(
                        event: event3,
                        appearanceMode: appearanceMode,
                        widgetRenderingMode: widgetRenderingMode,
                        colorScheme: colorScheme
                    )
                }
            } else {
                EmptyRowView(appearanceMode: appearanceMode)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var dividerColor: Color {
        switch appearanceMode {
        case .light:
            return Color.gray.opacity(0.2)
        case .dark:
            return Color.white.opacity(0.15)
        case .transparent:
            return Color.gray.opacity(0.2)
        case .tinted:
            return Color.gray.opacity(0.2)
        }
    }
}

@available(iOS 17.0, *)
struct EventRowView: View {
    let event: CountdownEvent
    let appearanceMode: WidgetAppearanceMode
    let widgetRenderingMode: WidgetRenderingMode
    let colorScheme: ColorScheme
    
    var body: some View {
        let targetDate = event.isRecurring ? event.getNextRecurringDate() : event.targetDateAsDate
        let countdown = CountdownTime.calculate(from: targetDate)
        
        HStack(spacing: 12) {
            // Emoji badge
            emojiBadgeView
            
            // Event info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(event.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(foregroundColor)
                        .lineLimit(1)
                    
                    if event.isRecurring {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 12))
                            .foregroundColor(.blue)
                    }
                }
                
                if let date = targetDate {
                    Text(formatDate(date))
                        .font(.system(size: 12))
                        .foregroundColor(mutedColor)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Days countdown
            VStack(alignment: .trailing, spacing: 2) {
                if countdown.isComplete && !countdown.isPast {
                    Text("Today!")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.blue)
                } else if countdown.isPast {
                    Text("\(countdown.daysSince)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(foregroundColor)
                    Text(countdown.daysSince == 1 ? "day ago" : "days ago")
                        .font(.system(size: 11))
                        .foregroundColor(mutedColor)
                } else {
                    Text("\(countdown.days)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(foregroundColor)
                    Text(countdown.days == 1 ? "day" : "days")
                        .font(.system(size: 11))
                        .foregroundColor(mutedColor)
                }
            }
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity)
        .frame(height: 109)
    }
    
    private var foregroundColor: Color {
        switch appearanceMode {
        case .light:
            return .primary
        case .dark:
            return .white
        case .transparent:
            return .primary
        case .tinted:
            return .primary
        }
    }
    
    private var mutedColor: Color {
        switch appearanceMode {
        case .light:
            return .secondary
        case .dark:
            return Color.white.opacity(0.7)
        case .transparent:
            return .secondary
        case .tinted:
            return .secondary
        }
    }
    
    @ViewBuilder
    private var emojiBadgeView: some View {
        ZStack {
            badgeBackgroundView
            
            if let emojiImage = emojiToImage(event.emoji, size: 20) {
                if #available(iOS 18.0, *) {
                    Image(uiImage: emojiImage)
                        .widgetAccentedRenderingMode(.fullColor)
                } else {
                    Image(uiImage: emojiImage)
                }
            } else {
                Text(event.emoji)
                    .font(.system(size: 20))
            }
        }
    }
    
    private func emojiToImage(_ emoji: String, size: CGFloat) -> UIImage? {
        let font = UIFont.systemFont(ofSize: size)
        let attributes = [NSAttributedString.Key.font: font]
        let size = (emoji as NSString).size(withAttributes: attributes)
        
        UIGraphicsBeginImageContextWithOptions(size, false, 0)
        (emoji as NSString).draw(at: .zero, withAttributes: attributes)
        let image = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return image
    }
    
    @ViewBuilder
    private var badgeBackgroundView: some View {
        if widgetRenderingMode == .accented {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.accentColor.opacity(0.3))
                .frame(width: 40, height: 40)
        } else if widgetRenderingMode == .vibrant {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.2))
                .frame(width: 40, height: 40)
        } else if let hexColor = event.emojiColor {
            let color = Color(hex: hexColor)
            RoundedRectangle(cornerRadius: 12)
                .fill(LinearGradient(
                    colors: [color, color.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 40, height: 40)
        } else {
            RoundedRectangle(cornerRadius: 12)
                .fill(LinearGradient(
                    colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 40, height: 40)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        if event.isRecurring {
            formatter.dateFormat = "'Next:' MMM d, yyyy"
        } else {
            formatter.dateFormat = "MMM d, yyyy"
        }
        return formatter.string(from: date)
    }
}

@available(iOS 17.0, *)
struct EmptyRowView: View {
    let appearanceMode: WidgetAppearanceMode
    
    var body: some View {
        HStack {
            Text("No countdown selected")
                .font(.system(size: 14))
                .foregroundColor(mutedColor)
            Spacer()
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity)
        .frame(height: 109)
    }
    
    private var mutedColor: Color {
        switch appearanceMode {
        case .light:
            return .secondary
        case .dark:
            return Color.white.opacity(0.5)
        case .transparent:
            return .secondary
        case .tinted:
            return .secondary
        }
    }
}

@available(iOS 17.0, *)
struct TripleCountdownWidgetEntryView: View {
    var entry: TripleCountdownWidgetEntry
    
    var body: some View {
        TripleLargeWidgetView(
            event1: entry.event1,
            event2: entry.event2,
            event3: entry.event3,
            appearanceMode: entry.appearanceMode
        )
    }
}


// MARK: - Widget Bundle

@main
struct CountdownWidgetBundle: WidgetBundle {
    var body: some Widget {
        CountdownTimerWidget()   // Focus/Timer style widget
        CountdownVisualWidget()  // Visual/Progress bars style widget
        CountdownClassicWidget() // Classic/Flip digit style widget
        CountdownTripleWidgetWrapper()  // Triple countdown widget (iOS 17+)
    }
}

// Wrapper to conditionally include iOS 17+ triple widget
struct CountdownTripleWidgetWrapper: Widget {
    let kind: String = "CountdownTripleWidget"
    
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: kind,
                intent: SelectTripleCountdownIntent.self,
                provider: CountdownTripleWidgetProvider()
            ) { entry in
                TripleCountdownWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            }
            .configurationDisplayName("Triple Countdown")
            .description("Display three countdown events in one widget.")
            .supportedFamilies([.systemLarge])
        } else {
            // iOS 16 - triple widget not available, use minimal static config
            return StaticConfiguration(
                kind: kind,
                provider: CountdownTimerWidgetProviderStatic()
            ) { _ in
                EmptyView()
            }
            .configurationDisplayName("Triple Countdown")
            .description("Requires iOS 17 or later.")
            .supportedFamilies([])
        }
    }
}

// MARK: - Countdown Timer Widget (Focus Style)

/// Widget that displays countdown with text-based days/hours/minutes
struct CountdownTimerWidget: Widget {
    let kind: String = "CountdownTimerWidget"
    
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: kind,
                intent: SelectCountdownIntent.self,
                provider: CountdownTimerWidgetProvider()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            }
            .configurationDisplayName("Countdown Timer")
            .description("Track your events with days, hours, and minutes display.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownTimerWidgetProviderStatic()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("Countdown Timer")
            .description("Track your events with days, hours, and minutes display.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        }
    }
}

// MARK: - Countdown Visual Widget (Progress Bars Style)

/// Widget that displays countdown with visual progress bars
struct CountdownVisualWidget: Widget {
    let kind: String = "CountdownVisualWidget"
    
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: kind,
                intent: SelectCountdownIntent.self,
                provider: CountdownVisualWidgetProvider()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            }
            .configurationDisplayName("Countdown Visual")
            .description("Track your events with visual progress bars.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownVisualWidgetProviderStatic()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("Countdown Visual")
            .description("Track your events with visual progress bars.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        }
    }
}

// MARK: - Countdown Classic Widget (Flip Digit Style)

/// Widget that displays countdown with classic flip clock digits
struct CountdownClassicWidget: Widget {
    let kind: String = "CountdownClassicWidget"
    
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: kind,
                intent: SelectCountdownIntent.self,
                provider: CountdownClassicWidgetProvider()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            }
            .configurationDisplayName("Countdown Classic")
            .description("Track your events with classic flip clock display.")
            .supportedFamilies([.systemSmall, .systemMedium])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownClassicWidgetProviderStatic()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("Countdown Classic")
            .description("Track your events with classic flip clock display.")
            .supportedFamilies([.systemSmall, .systemMedium])
        }
    }
}

// MARK: - Countdown Triple Widget

/// Widget that displays three countdown events in a large widget
@available(iOS 17.0, *)
struct CountdownTripleWidget: Widget {
    let kind: String = "CountdownTripleWidget"
    
    var body: some WidgetConfiguration {
        return AppIntentConfiguration(
            kind: kind,
            intent: SelectTripleCountdownIntent.self,
            provider: CountdownTripleWidgetProvider()
        ) { entry in
            TripleCountdownWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Triple Countdown")
        .description("Display three countdown events in one widget.")
        .supportedFamilies([.systemLarge])
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Timer Widget", as: .systemSmall) {
    CountdownTimerWidget()
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

@available(iOS 17.0, *)
#Preview("Visual Widget", as: .systemMedium) {
    CountdownVisualWidget()
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
        countdownStyle: .visual,
        configuration: nil
    )
}

@available(iOS 17.0, *)
#Preview("Classic Widget", as: .systemMedium) {
    CountdownClassicWidget()
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
        countdownStyle: .classic,
        configuration: nil
    )
}
#endif

