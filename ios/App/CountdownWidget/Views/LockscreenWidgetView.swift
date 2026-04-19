import SwiftUI
import WidgetKit

// MARK: - Accessory Inline View (single line of text)

struct LockscreenInlineView: View {
    let event: CountdownEvent
    let countdown: CountdownTime

    var body: some View {
        let value = primaryValue
        let unit = primaryUnit
        if countdown.isComplete && !countdown.isPast {
            Label("\(event.emoji) Today!", systemImage: "")
                .labelStyle(.titleOnly)
        } else {
            Text("\(event.emoji) \(value.formattedWithoutSeparator) \(unit)")
        }
    }

    private var primaryValue: Int {
        if countdown.isPast { return countdown.daysSince }
        if countdown.days > 0 { return countdown.days }
        if countdown.hours > 0 { return countdown.hours }
        if countdown.minutes > 0 { return countdown.minutes }
        return countdown.seconds
    }

    private var primaryUnit: String {
        if countdown.isPast { return countdown.daysSince == 1 ? "day ago" : "days ago" }
        if countdown.days > 0 { return countdown.days == 1 ? "day" : "days" }
        if countdown.hours > 0 { return countdown.hours == 1 ? "hr" : "hrs" }
        if countdown.minutes > 0 { return "min" }
        return "sec"
    }
}

// MARK: - Accessory Circular View

struct LockscreenCircularView: View {
    let event: CountdownEvent
    let countdown: CountdownTime

    @Environment(\.widgetRenderingMode) var widgetRenderingMode

    var body: some View {
        ZStack {
            if countdown.isComplete && !countdown.isPast {
                VStack(spacing: 1) {
                    Text(event.emoji).font(.system(size: 18))
                    Text("Today").font(.system(size: 10, weight: .semibold))
                }
            } else {
                VStack(spacing: 1) {
                    Text(event.emoji).font(.system(size: 14))
                    Text(primaryValue.formattedWithoutSeparator)
                        .font(.system(size: primaryValue >= 100 ? 16 : 20, weight: .bold))
                        .minimumScaleFactor(0.7)
                    Text(primaryUnit)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .widgetAccentable()
    }

    private var primaryValue: Int {
        if countdown.isPast { return countdown.daysSince }
        if countdown.days > 0 { return countdown.days }
        if countdown.hours > 0 { return countdown.hours }
        if countdown.minutes > 0 { return countdown.minutes }
        return countdown.seconds
    }

    private var primaryUnit: String {
        if countdown.isPast { return countdown.daysSince == 1 ? "day ago" : "days" }
        if countdown.days > 0 { return countdown.days == 1 ? "day" : "days" }
        if countdown.hours > 0 { return "hrs" }
        if countdown.minutes > 0 { return "min" }
        return "sec"
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
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetAccentable()
    }

    @ViewBuilder
    private var countdownLabel: some View {
        if countdown.isComplete && !countdown.isPast {
            Text("Today! 🎉")
        } else if countdown.isPast {
            Text("\(countdown.daysSince.formattedWithoutSeparator) \(countdown.daysSince == 1 ? "day ago" : "days ago")")
        } else if countdown.days > 0 {
            Text("\(countdown.days.formattedWithoutSeparator) \(countdown.days == 1 ? "day left" : "days left")")
        } else if countdown.hours > 0 {
            Text("\(countdown.hours.formattedWithoutSeparator) \(countdown.hours == 1 ? "hour left" : "hours left")")
        } else if countdown.minutes > 0 {
            Text("\(countdown.minutes.formattedWithoutSeparator) min left")
        } else {
            Text("\(countdown.seconds.formattedWithoutSeparator) sec left")
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())
        let dateYear = calendar.component(.year, from: date)
        if event.isRecurring {
            formatter.dateFormat = "MMM d"
            return "Next: \(formatter.string(from: date))"
        }
        formatter.dateFormat = dateYear == currentYear ? "MMM d" : "MMM d, yyyy"
        return formatter.string(from: date)
    }
}
