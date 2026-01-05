import SwiftUI
import WidgetKit

/// Small widget view (155x155)
struct SmallWidgetView: View {
    let event: CountdownEvent
    let countdown: CountdownTime
    let targetDate: Date?
    let appearanceMode: WidgetAppearanceMode
    let countdownStyle: WidgetCountdownStyle
    let progress: Double
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with emoji
            HStack {
                Text(event.emoji)
                    .font(.system(size: 24))
                    .widgetAccentable(false)
                
                Spacer()
                
                if event.isRecurring {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 12))
                        .foregroundColor(.blue)
                }
            }
            
            Spacer()
            
            // Title and date
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(foregroundColor)
                    .lineLimit(1)
                
                if let date = targetDate {
                    Text(formatDate(date))
                        .font(.system(size: 11))
                        .foregroundColor(mutedColor)
                        .lineLimit(1)
                }
                
                // Countdown display
                if countdown.isComplete && !countdown.isPast {
                    Text("Today! 🎉")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.blue)
                } else if countdownStyle == .visual {
                    // Visual mode - progress bars
                    ProgressBarsView(
                        progress: progress,
                        numBars: 7,
                        color: accentColor,
                        barWidth: 12,
                        barHeight: 36
                    )
                    .padding(.top, 4)
                } else {
                    // Focus mode - number display
                    HStack(alignment: .lastTextBaseline, spacing: 2) {
                        Text("\(primaryValue)")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(foregroundColor)
                        Text(primaryUnit)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(mutedColor)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Computed Properties
    
    private var primaryValue: Int {
        if countdown.isPast {
            return countdown.daysSince
        } else if countdown.days > 0 {
            return countdown.days
        } else if countdown.hours > 0 {
            return countdown.hours
        } else if countdown.minutes > 0 {
            return countdown.minutes
        } else {
            return countdown.seconds
        }
    }
    
    private var primaryUnit: String {
        if countdown.isPast {
            return countdown.daysSince == 1 ? "day ago" : "days ago"
        } else if countdown.days > 0 {
            return countdown.days == 1 ? "day" : "days"
        } else if countdown.hours > 0 {
            return countdown.hours == 1 ? "hour" : "hours"
        } else if countdown.minutes > 0 {
            return countdown.minutes == 1 ? "min" : "min"
        } else {
            return countdown.seconds == 1 ? "sec" : "sec"
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
    
    private var accentColor: Color {
        if let hexColor = event.emojiColor {
            return Color(hex: hexColor)
        }
        return .blue
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        if event.isRecurring {
            formatter.dateFormat = "'Next:' MMM d"
        } else {
            formatter.dateFormat = "MMM d, yyyy"
        }
        return formatter.string(from: date)
    }
}

// MARK: - Progress Bars View

struct ProgressBarsView: View {
    let progress: Double
    let numBars: Int
    let color: Color
    let barWidth: CGFloat
    let barHeight: CGFloat
    
    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<numBars, id: \.self) { index in
                let barProgress = calculateBarProgress(index: index)
                
                RoundedRectangle(cornerRadius: barWidth / 2)
                    .fill(color.opacity(0.2))
                    .frame(width: barWidth, height: barHeight)
                    .overlay(alignment: .bottom) {
                        RoundedRectangle(cornerRadius: barWidth / 2)
                            .fill(color)
                            .frame(width: barWidth, height: barHeight * barProgress)
                    }
            }
        }
    }
    
    private func calculateBarProgress(index: Int) -> CGFloat {
        // Each bar represents a portion of the total progress
        let barThreshold = Double(index + 1) / Double(numBars)
        let previousThreshold = Double(index) / Double(numBars)
        
        if progress >= barThreshold {
            return 1.0
        } else if progress > previousThreshold {
            // Partial fill
            let barRange = barThreshold - previousThreshold
            let progressInBar = progress - previousThreshold
            return CGFloat(progressInBar / barRange)
        } else {
            return 0.0
        }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
