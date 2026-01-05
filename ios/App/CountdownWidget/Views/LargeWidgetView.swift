import SwiftUI
import WidgetKit

/// Large widget view (329x329)
struct LargeWidgetView: View {
    let event: CountdownEvent
    let countdown: CountdownTime
    let targetDate: Date?
    let appearanceMode: WidgetAppearanceMode
    let countdownStyle: WidgetCountdownStyle
    let progress: Double
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with emoji, title and date
            HStack(spacing: 12) {
                Text(event.emoji)
                    .font(.system(size: 36))
                    .widgetAccentable(false)
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(event.title)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(foregroundColor)
                            .lineLimit(1)
                        
                        if event.isRecurring {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 14))
                                .foregroundColor(.blue)
                        }
                    }
                    
                    if let date = targetDate {
                        Text(formatDate(date))
                            .font(.system(size: 14))
                            .foregroundColor(mutedColor)
                            .lineLimit(1)
                    }
                }
                
                Spacer()
            }
            .padding(.bottom, 16)
            
            Spacer()
            
            // Main content
            if countdown.isComplete && !countdown.isPast {
                Text("Today! 🎉")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundColor(.blue)
            } else if countdownStyle == .visual {
                // Visual mode - progress bars with time breakdown below
                VStack(spacing: 16) {
                    ProgressBarsView(
                        progress: progress,
                        numBars: 10,
                        color: accentColor,
                        barWidth: 22,
                        barHeight: 120
                    )
                    
                    // Time breakdown
                    HStack(spacing: 24) {
                        if countdown.isPast {
                            TimeUnitCenteredView(value: countdown.daysSince, unit: "Days ago", foregroundColor: foregroundColor, mutedColor: mutedColor)
                        } else {
                            TimeUnitCenteredView(value: countdown.days, unit: "Days", foregroundColor: foregroundColor, mutedColor: mutedColor)
                            TimeUnitCenteredView(value: countdown.hours, unit: "Hours", foregroundColor: foregroundColor, mutedColor: mutedColor)
                            TimeUnitCenteredView(value: countdown.minutes, unit: "Min", foregroundColor: foregroundColor, mutedColor: mutedColor)
                            TimeUnitCenteredView(value: countdown.seconds, unit: "Sec", foregroundColor: foregroundColor, mutedColor: mutedColor)
                        }
                    }
                }
            } else {
                // Focus mode - large grid display
                if countdown.isPast {
                    VStack(spacing: 8) {
                        Text("\(countdown.daysSince)")
                            .font(.system(size: 64, weight: .bold))
                            .foregroundColor(foregroundColor)
                        
                        Text(countdown.daysSince == 1 ? "day ago" : "days ago")
                            .font(.system(size: 18))
                            .foregroundColor(mutedColor)
                    }
                } else {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        TimeCardView(value: countdown.days, unit: "days", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        TimeCardView(value: countdown.hours, unit: "hours", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        TimeCardView(value: countdown.minutes, unit: "minutes", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        TimeCardView(value: countdown.seconds, unit: "seconds", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                    }
                }
            }
            
            Spacer()
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
    
    private var cardColor: Color {
        switch appearanceMode {
        case .light:
            return Color.gray.opacity(0.1)
        case .dark:
            return Color.white.opacity(0.1)
        case .transparent:
            return Color.gray.opacity(0.1)
        case .tinted:
            return Color.gray.opacity(0.1)
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
        } else {
            formatter.dateFormat = "MMM d, yyyy"
        }
        return formatter.string(from: date)
    }
}

// MARK: - Time Unit Centered View

struct TimeUnitCenteredView: View {
    let value: Int
    let unit: String
    let foregroundColor: Color
    let mutedColor: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(foregroundColor)
            
            Text(unit)
                .font(.system(size: 11))
                .foregroundColor(mutedColor)
        }
    }
}

// MARK: - Time Card View

struct TimeCardView: View {
    let value: Int
    let unit: String
    let foregroundColor: Color
    let mutedColor: Color
    let cardColor: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(foregroundColor)
            
            Text(unit)
                .font(.system(size: 13))
                .foregroundColor(mutedColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(cardColor)
        .cornerRadius(16)
    }
}
