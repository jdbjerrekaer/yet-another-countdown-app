import SwiftUI
import WidgetKit

// Shared helper: the event's effective target (next occurrence for recurring).
private extension CountdownEvent {
    var effectiveTarget: Date? { isRecurring ? getNextRecurringDate() : targetDateAsDate }
}

// MARK: - Accessory Inline View (single line of text)

struct LockscreenInlineView: View {
    let event: CountdownEvent
    let countdown: CountdownTime

    var body: some View {
        let lang = WidgetDataSync.shared.appLanguage()
        if countdown.isComplete && !countdown.isPast {
            Text("\(event.emoji) \(RelativeTime.todayText(lang))")
        } else if let target = event.effectiveTarget {
            Text("\(event.emoji) \(RelativeTime.shortPhrase(target: target, lang: lang))")
        } else {
            Text(event.emoji)
        }
    }
}

// MARK: - Accessory Circular View

struct LockscreenCircularView: View {
    let event: CountdownEvent
    let countdown: CountdownTime

    @Environment(\.widgetRenderingMode) var widgetRenderingMode

    var body: some View {
        let lang = WidgetDataSync.shared.appLanguage()
        ZStack {
            VStack(spacing: 1) {
                Text(event.emoji).font(.system(size: 14))
                if countdown.isComplete && !countdown.isPast {
                    Text(RelativeTime.todayText(lang))
                        .font(.system(size: 10, weight: .semibold))
                        .minimumScaleFactor(0.6)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                } else if let target = event.effectiveTarget {
                    Text(RelativeTime.shortPhrase(target: target, lang: lang))
                        .font(.system(size: 13, weight: .bold))
                        .minimumScaleFactor(0.6)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Accessory Rectangular View

struct LockscreenRectangularView: View {
    let event: CountdownEvent
    let countdown: CountdownTime
    let targetDate: Date?

    var body: some View {
        HStack(spacing: 10) {
            Text(event.emoji)
                .font(.system(size: 26))

            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)

                if let date = targetDate {
                    Text(formatDate(date))
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                countdownLabel
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetAccentable()
    }

    @ViewBuilder
    private var countdownLabel: some View {
        let lang = WidgetDataSync.shared.appLanguage()
        if countdown.isComplete && !countdown.isPast {
            Text(RelativeTime.todayText(lang))
        } else if let target = targetDate {
            // Compact, single-letter units ("2w 6d left", "3mo 2w 1d ago") so it
            // fits the tight rectangular accessory without truncating.
            Text(RelativeTime.compactPhrase(
                target: target,
                includeTime: event.hasTime ?? false,
                legacy: WidgetDataSync.shared.isLegacyTimeFormat(),
                lang: lang
            ))
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())
        let dateYear = calendar.component(.year, from: date)
        if event.isRecurring {
            formatter.dateFormat = "MMM d"
            return "\(RelativeTime.label("next", WidgetDataSync.shared.appLanguage())): \(formatter.string(from: date))"
        }
        formatter.dateFormat = dateYear == currentYear ? "MMM d" : "MMM d, yyyy"
        return formatter.string(from: date)
    }
}
