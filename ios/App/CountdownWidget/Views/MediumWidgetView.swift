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
    
    @Environment(\.widgetRenderingMode) var widgetRenderingMode
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with emoji badge, title and date
            HStack(spacing: 12) {
                // Emoji badge
                emojiBadgeView
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(event.title)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(foregroundColor)
                            .lineLimit(1)
                        
                        if event.isRecurring {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 14))
                                .foregroundColor(.blue)
                        }
                    }
                    
                    if let date = targetDate {
                        Text(formatDate(date, countdown: countdown, countdownStyle: countdownStyle))
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
                .widgetAccentable(false)
            } else if countdownStyle == .classic {
                // Classic mode - flip clock style
                // In vibrant/accented modes, use simple text instead of flip digits
                if widgetRenderingMode == .vibrant || widgetRenderingMode == .accented {
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
                } else {
                    if countdown.isPast {
                        HStack(spacing: 24) {
                            VStack(alignment: .leading, spacing: 2) {
                                FlipDigitView(value: countdown.daysSince, fontSize: 28, theme: flipDigitTheme)
                                Text("Days ago")
                                    .font(.system(size: 11))
                                    .foregroundColor(mutedColor)
                            }
                        }
                    } else {
                        HStack(spacing: 24) {
                            VStack(alignment: .leading, spacing: 2) {
                                FlipDigitView(value: countdown.days, fontSize: 28, theme: flipDigitTheme)
                                Text("Days")
                                    .font(.system(size: 11))
                                    .foregroundColor(mutedColor)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                FlipDigitView(value: countdown.hours, fontSize: 28, theme: flipDigitTheme)
                                Text("Hours")
                                    .font(.system(size: 11))
                                    .foregroundColor(mutedColor)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                FlipDigitView(value: countdown.minutes, fontSize: 28, theme: flipDigitTheme)
                                Text("Min")
                                    .font(.system(size: 11))
                                    .foregroundColor(mutedColor)
                            }
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
    
    private var flipDigitTheme: FlipDigitView.FlipDigitTheme {
        // For Clear (vibrant) and Tinted (accented) modes, always use light theme
        if widgetRenderingMode == .vibrant || widgetRenderingMode == .accented {
            return .light
        }
        // Use system color scheme to determine flip digit theme
        // This ensures the flip digits match the actual widget background
        if colorScheme == .dark || appearanceMode == .dark {
            return .dark
        }
        return .light
    }
    
    @ViewBuilder
    private var emojiBadgeView: some View {
        ZStack {
            badgeBackgroundView
            
            // Render emoji as image to preserve colors in Clear/Tinted modes
            if let emojiImage = emojiToImage(event.emoji, size: 24) {
                if #available(iOS 18.0, *) {
                    Image(uiImage: emojiImage)
                        .widgetAccentedRenderingMode(.fullColor)
                } else {
                    Image(uiImage: emojiImage)
                }
            } else {
                Text(event.emoji)
                    .font(.system(size: 24))
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
        // Handle different rendering modes
        if widgetRenderingMode == .accented {
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.accentColor.opacity(0.3))
                .frame(width: 48, height: 48)
        } else if widgetRenderingMode == .vibrant {
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.2))
                .frame(width: 48, height: 48)
        } else if let hexColor = event.emojiColor {
            // For full color mode, use the emoji color gradient
            let color = Color(hex: hexColor)
            RoundedRectangle(cornerRadius: 14)
                .fill(LinearGradient(
                    colors: [color, color.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 48, height: 48)
        } else {
            RoundedRectangle(cornerRadius: 14)
                .fill(LinearGradient(
                    colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 48, height: 48)
        }
    }
    
    private var accentColor: Color {
        if let hexColor = event.emojiColor {
            return Color(hex: hexColor)
        }
        return .blue
    }
    
    private func formatDate(_ date: Date, countdown: CountdownTime, countdownStyle: WidgetCountdownStyle) -> String {
        let formatter = DateFormatter()
        if event.isRecurring {
            formatter.dateFormat = "MMM d, yyyy"
            let dateStr = formatter.string(from: date)
            if countdownStyle == .classic {
                return "Next: \(dateStr)"
            }
            let daysLabel = countdown.days == 1 ? "day" : "days"
            return "Next: \(dateStr) · \(countdown.days) \(daysLabel)"
        } else if countdown.isPast {
            formatter.dateFormat = "MMM d, yyyy"
            return formatter.string(from: date)
        } else {
            formatter.dateFormat = "MMM d, yyyy"
            let dateStr = formatter.string(from: date)
            if countdownStyle == .classic {
                return dateStr
            }
            let daysLabel = countdown.days == 1 ? "day" : "days"
            return "\(dateStr) · \(countdown.days) \(daysLabel)"
        }
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
