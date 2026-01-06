import SwiftUI
import WidgetKit

/// Medium widget view (329x155)
struct MediumWidgetView: View {
    let event: CountdownEvent
    let countdown: CountdownTime
    let targetDate: Date?
    let appearanceMode: WidgetAppearanceMode
    let countdownStyle: WidgetCountdownStyle
    let progress: Double
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with emoji, title and date
            HStack(spacing: 12) {
                Text(event.emoji)
                    .font(.system(size: 28))
                    .widgetAccentable(false)
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(event.title)
                            .font(.system(size: 15, weight: .semibold))
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
            }
            
            Spacer()
            
            // Countdown display
            if countdown.isComplete && !countdown.isPast {
                Text("Today! 🎉")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.blue)
            } else if countdownStyle == .visual {
                // Visual mode - progress bars
                ProgressBarsView(
                    progress: progress,
                    numBars: 14,
                    color: accentColor,
                    barWidth: 15,
                    barHeight: 52
                )
            } else if countdownStyle == .classic {
                // Classic mode - flip clock style
                if countdown.isPast {
                    HStack(spacing: 24) {
                        VStack(alignment: .leading, spacing: 2) {
                            FlipDigitView(value: countdown.daysSince, fontSize: 28)
                            Text("Days ago")
                                .font(.system(size: 11))
                                .foregroundColor(mutedColor)
                        }
                    }
                } else {
                    HStack(spacing: 24) {
                        VStack(alignment: .leading, spacing: 2) {
                            FlipDigitView(value: countdown.days, fontSize: 28)
                            Text("Days")
                                .font(.system(size: 11))
                                .foregroundColor(mutedColor)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            FlipDigitView(value: countdown.hours, fontSize: 28)
                            Text("Hours")
                                .font(.system(size: 11))
                                .foregroundColor(mutedColor)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            FlipDigitView(value: countdown.minutes, fontSize: 28)
                            Text("Min")
                                .font(.system(size: 11))
                                .foregroundColor(mutedColor)
                        }
                    }
                }
            } else {
                // Focus mode - time breakdown
                if countdown.isPast {
                    HStack(spacing: 24) {
                        TimeUnitView(value: countdown.daysSince, unit: "Days", subtext: "ago", foregroundColor: foregroundColor, mutedColor: mutedColor)
                    }
                } else {
                    HStack(spacing: 24) {
                        TimeUnitView(value: countdown.days, unit: "Days", foregroundColor: foregroundColor, mutedColor: mutedColor)
                        TimeUnitView(value: countdown.hours, unit: "Hours", foregroundColor: foregroundColor, mutedColor: mutedColor)
                        TimeUnitView(value: countdown.minutes, unit: "Min", foregroundColor: foregroundColor, mutedColor: mutedColor)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Computed Properties
    
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
    
    private var accentColor: Color {
        if let hexColor = event.emojiColor {
            return Color(hex: hexColor)
        }
        return .blue
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        if event.isRecurring {
            formatter.dateFormat = "'Next:' MMM d, yyyy"
        } else if countdown.isPast {
            formatter.dateFormat = "MMM d, yyyy"
        } else {
            formatter.dateFormat = "MMM d, yyyy"
        }
        return formatter.string(from: date)
    }
}

// MARK: - Time Unit View

struct TimeUnitView: View {
    let value: Int
    let unit: String
    var subtext: String? = nil
    let foregroundColor: Color
    let mutedColor: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(value)")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(foregroundColor)
            
            if let subtext = subtext {
                Text("\(unit) \(subtext)")
                    .font(.system(size: 11))
                    .foregroundColor(mutedColor)
            } else {
                Text(unit)
                    .font(.system(size: 11))
                    .foregroundColor(mutedColor)
            }
        }
    }
}
