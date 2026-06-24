import WidgetKit
import SwiftUI
import AppIntents

/// Returns the Date of the next top-of-minute boundary (:00 seconds).
private func nextMinuteBoundary(after date: Date = Date()) -> Date {
    let cal = Calendar.current
    let plusOne = cal.date(byAdding: .minute, value: 1, to: date) ?? date.addingTimeInterval(60)
    let comps = cal.dateComponents([.year, .month, .day, .hour, .minute], from: plusOne)
    return cal.date(from: comps) ?? plusOne
}

/// Build an array of dates, one per minute boundary, starting at the current
/// instant and continuing for `count` minutes. WidgetKit displays each entry
/// at its `date`; emitting many pre-computed entries lets the home-screen
/// widget tick down without depending on the unreliable `.after` reload hint.
private func minuteEntryDates(count: Int = 60) -> [Date] {
    var dates: [Date] = [Date()]
    var cursor = nextMinuteBoundary()
    for _ in 1..<count {
        dates.append(cursor)
        cursor = nextMinuteBoundary(after: cursor)
    }
    return dates
}

// MARK: - Widget Entry

/// Timeline entry containing countdown data for widget display
struct CountdownWidgetEntry: TimelineEntry {
    let date: Date
    let event: CountdownEvent?
    let appearanceMode: WidgetAppearanceMode
    let countdownStyle: WidgetCountdownStyle
    let configuration: WidgetCountdownEntity?
}

/// Timeline entry containing three countdown events for triple widget display
@available(iOS 17.0, *)
struct TripleCountdownWidgetEntry: TimelineEntry {
    let date: Date
    let event1: CountdownEvent?
    let event2: CountdownEvent?
    let event3: CountdownEvent?
    let appearanceMode: WidgetAppearanceMode
    let countdownStyle: WidgetCountdownStyle
}

@available(iOS 17.0, *)
private func resolveConfiguredEvent(
    selection: WidgetCountdownEntity?,
    widgetData: WidgetData?
) -> CountdownEvent? {
    let events = widgetData?.events ?? []
    guard let selection else { return events.first }
    return events.first(where: { $0.id == selection.id })
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
        let event = resolveConfiguredEvent(selection: configuration.countdown, widgetData: widgetData)
        return CountdownWidgetEntry(
            date: Date(),
            event: event,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: .focus,
            configuration: configuration.countdown
        )
    }

    func timeline(for configuration: SelectCountdownIntent, in context: Context) async -> Timeline<CountdownWidgetEntry> {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = resolveConfiguredEvent(selection: configuration.countdown, widgetData: widgetData)
        let appearance = widgetData?.appearanceModeEnum ?? .light

        let entries = minuteEntryDates().map { date in
            CountdownWidgetEntry(
                date: date,
                event: event,
                appearanceMode: appearance,
                countdownStyle: .focus,
                configuration: configuration.countdown
            )
        }
        return Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
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
        let event = resolveConfiguredEvent(selection: configuration.countdown, widgetData: widgetData)
        return CountdownWidgetEntry(
            date: Date(),
            event: event,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: .visual,
            configuration: configuration.countdown
        )
    }

    func timeline(for configuration: SelectCountdownIntent, in context: Context) async -> Timeline<CountdownWidgetEntry> {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = resolveConfiguredEvent(selection: configuration.countdown, widgetData: widgetData)
        let appearance = widgetData?.appearanceModeEnum ?? .light

        let entries = minuteEntryDates().map { date in
            CountdownWidgetEntry(
                date: date,
                event: event,
                appearanceMode: appearance,
                countdownStyle: .visual,
                configuration: configuration.countdown
            )
        }
        return Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
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
            countdownStyle: .focus,
            configuration: nil
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CountdownWidgetEntry>) -> ()) {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = widgetData?.events.first
        let appearance = widgetData?.appearanceModeEnum ?? .light
        let entries = minuteEntryDates().map { date in
            CountdownWidgetEntry(
                date: date,
                event: event,
                appearanceMode: appearance,
                countdownStyle: .focus,
                configuration: nil
            )
        }
        let timeline = Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
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
        let event = resolveConfiguredEvent(selection: configuration.countdown, widgetData: widgetData)
        return CountdownWidgetEntry(
            date: Date(),
            event: event,
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: .classic,
            configuration: configuration.countdown
        )
    }

    func timeline(for configuration: SelectCountdownIntent, in context: Context) async -> Timeline<CountdownWidgetEntry> {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = resolveConfiguredEvent(selection: configuration.countdown, widgetData: widgetData)
        let appearance = widgetData?.appearanceModeEnum ?? .light

        let entries = minuteEntryDates().map { date in
            CountdownWidgetEntry(
                date: date,
                event: event,
                appearanceMode: appearance,
                countdownStyle: .classic,
                configuration: configuration.countdown
            )
        }
        return Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
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
            countdownStyle: .visual,
            configuration: nil
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CountdownWidgetEntry>) -> ()) {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = widgetData?.events.first
        let appearance = widgetData?.appearanceModeEnum ?? .light
        let entries = minuteEntryDates().map { date in
            CountdownWidgetEntry(
                date: date,
                event: event,
                appearanceMode: appearance,
                countdownStyle: .visual,
                configuration: nil
            )
        }
        let timeline = Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
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
            countdownStyle: .classic,
            configuration: nil
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CountdownWidgetEntry>) -> ()) {
        let widgetData = WidgetDataSync.shared.loadWidgetData()
        let event = widgetData?.events.first
        let appearance = widgetData?.appearanceModeEnum ?? .light
        let entries = minuteEntryDates().map { date in
            CountdownWidgetEntry(
                date: date,
                event: event,
                appearanceMode: appearance,
                countdownStyle: .classic,
                configuration: nil
            )
        }
        let timeline = Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
        completion(timeline)
    }
}

// MARK: - Timeline Provider for Triple Countdown Widget (Focus Style)

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
            appearanceMode: .light,
            countdownStyle: .focus
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
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: .focus
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
        
        let appearance = widgetData?.appearanceModeEnum ?? .light
        let entries = minuteEntryDates().map { date in
            TripleCountdownWidgetEntry(
                date: date,
                event1: event1,
                event2: event2,
                event3: event3,
                appearanceMode: appearance,
                countdownStyle: .focus
            )
        }
        return Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
    }
}

// MARK: - Timeline Provider for Triple Countdown Widget (Visual Style)

@available(iOS 17.0, *)
struct CountdownVisualTripleWidgetProvider: AppIntentTimelineProvider {
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
            appearanceMode: .light,
            countdownStyle: .visual
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
            appearanceMode: widgetData?.appearanceModeEnum ?? .light,
            countdownStyle: .visual
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
        
        let appearance = widgetData?.appearanceModeEnum ?? .light
        let entries = minuteEntryDates().map { date in
            TripleCountdownWidgetEntry(
                date: date,
                event1: event1,
                event2: event2,
                event3: event3,
                appearanceMode: appearance,
                countdownStyle: .visual
            )
        }
        return Timeline(entries: entries, policy: .after(entries.last?.date ?? nextMinuteBoundary()))
    }
}

// MARK: - Widget View

struct CountdownWidgetEntryView: View {
    var entry: CountdownWidgetEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        if let event = entry.event {
            let targetDate = event.isRecurring ? event.getNextRecurringDate() : event.targetDateAsDate
            let countdown = CountdownTime.calculate(from: targetDate, now: entry.date)
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
            case .accessoryInline:
                LockscreenInlineView(event: event, countdown: countdown)
                    .widgetURL(deepLinkURL)
            case .accessoryCircular:
                LockscreenCircularView(event: event, countdown: countdown)
                    .widgetURL(deepLinkURL)
            case .accessoryRectangular:
                LockscreenRectangularView(event: event, countdown: countdown, targetDate: targetDate)
                    .widgetURL(deepLinkURL)
            case .accessoryCorner:
                LockscreenCircularView(event: event, countdown: countdown)
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
    let countdownStyle: WidgetCountdownStyle
    let now: Date

    @Environment(\.widgetRenderingMode) var widgetRenderingMode
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(spacing: 0) {
            if let event1 = event1 {
                Link(destination: URL(string: "countdownapp://edit?id=\(event1.id)")!) {
                    EventRowView(
                        event: event1,
                        appearanceMode: appearanceMode,
                        countdownStyle: countdownStyle,
                        widgetRenderingMode: widgetRenderingMode,
                        colorScheme: colorScheme,
                        now: now
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
                        countdownStyle: countdownStyle,
                        widgetRenderingMode: widgetRenderingMode,
                        colorScheme: colorScheme,
                        now: now
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
                        countdownStyle: countdownStyle,
                        widgetRenderingMode: widgetRenderingMode,
                        colorScheme: colorScheme,
                        now: now
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
    let countdownStyle: WidgetCountdownStyle
    let widgetRenderingMode: WidgetRenderingMode
    let colorScheme: ColorScheme
    let now: Date

    var body: some View {
        let targetDate = event.isRecurring ? event.getNextRecurringDate() : event.targetDateAsDate
        let countdown = CountdownTime.calculate(from: targetDate, now: now)
        let progress = WidgetDataSync.shared.calculateProgress(for: event)
        
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
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 12))
                                .foregroundColor(.blue)
                            
                            if let occurrenceNumber = event.getNextOccurrenceNumber() {
                                Text("#\(occurrenceNumber)")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
                
                if let date = targetDate {
                    Text(formatDateWithDays(date, countdown: countdown, isVisual: countdownStyle == .visual))
                        .font(.system(size: 12))
                        .foregroundColor(mutedColor)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Countdown display - varies by style
            if countdownStyle == .visual {
                // Visual mode - progress bars only (days shown on date line)
                ProgressBarsView(
                    progress: progress,
                    numBars: 6,
                    color: accentColor,
                    barWidth: 8,
                    barHeight: 40
                )
                .widgetAccentable(false)
            } else {
                // Focus mode - days countdown
                VStack(alignment: .trailing, spacing: 2) {
                    let lang = WidgetDataSync.shared.appLanguage()
                    if countdown.isComplete && !countdown.isPast {
                        Text(RelativeTime.todayText(lang))
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.blue)
                    } else {
                        // Semantic phrase for both past ("1 year, 2 weeks ago")
                        // and future ("2 months, 3 weeks left"); days-only when legacy.
                        Text(RelativeTime.phrase(
                            target: targetDate ?? now,
                            now: now,
                            includeTime: event.hasTime ?? false,
                            legacy: WidgetDataSync.shared.isLegacyTimeFormat(),
                            lang: lang
                        ))
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(foregroundColor)
                            .multilineTextAlignment(.trailing)
                            .fixedSize(horizontal: false, vertical: true)
                            .lineLimit(3)
                            .frame(maxWidth: 150, alignment: .trailing)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity)
        .frame(height: 109)
    }
    
    private var accentColor: Color {
        if widgetRenderingMode == .accented {
            return .accentColor
        } else if widgetRenderingMode == .vibrant {
            return .white
        } else if let hexColor = event.emojiColor {
            return Color(hex: hexColor)
        } else {
            return .blue
        }
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
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())
        let dateYear = calendar.component(.year, from: date)
        
        if event.isRecurring {
            formatter.dateFormat = dateYear == currentYear ? "'Next:' MMM d" : "'Next:' MMM d, yyyy"
        } else {
            formatter.dateFormat = dateYear == currentYear ? "MMM d" : "MMM d, yyyy"
        }
        return formatter.string(from: date)
    }
    
    private func formatDateWithDays(_ date: Date, countdown: CountdownTime, isVisual: Bool) -> String {
        let formatter = DateFormatter()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())
        let dateYear = calendar.component(.year, from: date)
        
        if event.isRecurring {
            formatter.dateFormat = dateYear == currentYear ? "'Next:' MMM d" : "'Next:' MMM d, yyyy"
        } else {
            formatter.dateFormat = dateYear == currentYear ? "MMM d" : "MMM d, yyyy"
        }
        let dateStr = formatter.string(from: date)
        
        // Only append days text in visual mode
        guard isVisual else { return dateStr }
        
        if countdown.isComplete && !countdown.isPast {
            return dateStr + " · Today!"
        } else if countdown.isPast {
            let dayText = countdown.daysSince == 1 ? "day" : "days"
            return dateStr + " · \(countdown.daysSince) \(dayText) ago"
        } else {
            let dayText = countdown.days == 1 ? "day" : "days"
            return dateStr + " · \(countdown.days) \(dayText)"
        }
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
            appearanceMode: entry.appearanceMode,
            countdownStyle: entry.countdownStyle,
            now: entry.date
        )
    }
}

@available(iOS 17.0, *)
struct TripleVisualCountdownWidgetEntryView: View {
    var entry: TripleCountdownWidgetEntry
    
    var body: some View {
        TripleLargeWidgetView(
            event1: entry.event1,
            event2: entry.event2,
            event3: entry.event3,
            appearanceMode: entry.appearanceMode,
            countdownStyle: .visual,
            now: entry.date
        )
    }
}


// MARK: - Lockscreen Widget

struct CountdownLockscreenWidget: Widget {
    let kind: String = "CountdownLockscreenWidget"

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
            .configurationDisplayName("Countdown Lock Screen")
            .description("Show a countdown on your lock screen.")
            .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownTimerWidgetProviderStatic()
            ) { _ in
                EmptyView()
            }
            .configurationDisplayName("Countdown Lock Screen")
            .description("Requires iOS 17 or later.")
            .supportedFamilies([])
        }
    }
}

// MARK: - Widget Bundle

@main
struct CountdownWidgetBundle: WidgetBundle {
    var body: some Widget {
        CountdownTimerWidget()        // Focus/Timer style widget (single event)
        CountdownTimerTripleWidget()  // Focus/Timer style widget (triple event)
        CountdownVisualWidget()       // Visual/Progress bars style widget (single event)
        CountdownVisualTripleWidget() // Visual/Progress bars style widget (triple event)
        CountdownClassicWidget()      // Classic/Flip digit style widget
        CountdownLockscreenWidget()   // Lock screen widget (inline, circular, rectangular)
    }
}

// MARK: - Focus Timer Triple Widget Wrapper
struct CountdownTimerTripleWidget: Widget {
    let kind: String = "CountdownTimerTripleWidget"
    
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
            .configurationDisplayName("Yet Another Countdown (Triple)")
            .description("Track three events with days remaining.")
            .supportedFamilies([.systemLarge])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownTimerWidgetProviderStatic()
            ) { _ in
                EmptyView()
            }
            .configurationDisplayName("Yet Another Countdown (Triple)")
            .description("Requires iOS 17 or later.")
            .supportedFamilies([])
        }
    }
}

// MARK: - Visual Triple Widget Wrapper
struct CountdownVisualTripleWidget: Widget {
    let kind: String = "CountdownVisualTripleWidget"
    
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: kind,
                intent: SelectTripleCountdownIntent.self,
                provider: CountdownVisualTripleWidgetProvider()
            ) { entry in
                TripleVisualCountdownWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            }
            .configurationDisplayName("Countdown Visual (Triple)")
            .description("Track three events with progress bars.")
            .supportedFamilies([.systemLarge])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownVisualWidgetProviderStatic()
            ) { _ in
                EmptyView()
            }
            .configurationDisplayName("Countdown Visual (Triple)")
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
            .configurationDisplayName("Yet Another Countdown")
            .description("Track your events with days, hours, and minutes.")
            .supportedFamilies([.systemSmall, .systemMedium])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownTimerWidgetProviderStatic()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("Yet Another Countdown")
            .description("Track your events with days, hours, and minutes.")
            .supportedFamilies([.systemSmall, .systemMedium])
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
            .supportedFamilies([.systemSmall, .systemMedium])
        } else {
            return StaticConfiguration(
                kind: kind,
                provider: CountdownVisualWidgetProviderStatic()
            ) { entry in
                CountdownWidgetEntryView(entry: entry)
            }
            .configurationDisplayName("Countdown Visual")
            .description("Track your events with visual progress bars.")
            .supportedFamilies([.systemSmall, .systemMedium])
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
