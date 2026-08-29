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
    
    @Environment(\.widgetRenderingMode) var widgetRenderingMode
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with emoji badge
            HStack {
                emojiBadgeView
                
                Spacer()
                
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
            
            Spacer()
            
            // Title and date
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(foregroundColor)
                    .lineLimit(1)
                
                if let date = targetDate {
                    Text(formatDate(date, countdown: countdown, countdownStyle: countdownStyle))
                        .font(.system(size: 11))
                        .foregroundColor(mutedColor)
                        .lineLimit(1)
                }
                
                // Countdown display
                if countdown.isComplete && !countdown.isPast {
                    Text(RelativeTime.todayText(lang))
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
                    .widgetAccentable(false)
                    .padding(.top, 4)
                } else if countdownStyle == .classic {
                    // Classic mode - flip clock style
                    // In vibrant/accented modes, use simple text instead of flip digits
                    if widgetRenderingMode == .vibrant || widgetRenderingMode == .accented {
                        HStack(alignment: .lastTextBaseline, spacing: 2) {
                            Text(primaryText)
                                .font(.system(size: primaryValue.scaledFontSize(baseSize: 28), weight: .bold))
                                .foregroundColor(foregroundColor)
                            Text(primaryUnit)
                                .font(.system(size: primaryValue.scaledUnitFontSize(baseSize: 14), weight: .medium))
                                .foregroundColor(mutedColor)
                        }
                    } else {
                        HStack(alignment: .lastTextBaseline, spacing: 8) {
                            if isSubMinute {
                                Text(primaryText)
                                    .font(.system(size: primaryValue.scaledFontSize(baseSize: 28), weight: .bold))
                                    .foregroundColor(foregroundColor)
                            } else {
                                FlipDigitView(value: primaryValue, fontSize: primaryValue.scaledFontSize(baseSize: 28), theme: flipDigitTheme)
                            }
                            Text(primaryUnit)
                                .font(.system(size: primaryValue.scaledUnitFontSize(baseSize: 14), weight: .medium))
                                .foregroundColor(mutedColor)
                        }
                    }
                } else {
                    // Focus mode - number display
                    HStack(alignment: .lastTextBaseline, spacing: 2) {
                        Text(primaryText)
                            .font(.system(size: primaryValue.scaledFontSize(baseSize: 28), weight: .bold))
                            .foregroundColor(foregroundColor)
                        Text(primaryUnit)
                            .font(.system(size: primaryValue.scaledUnitFontSize(baseSize: 14), weight: .medium))
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
            return 0
        }
    }

    /// Under a minute out. The timeline only ticks once a minute — and in
    /// Always-On Display the screen refreshes even less often — so a seconds
    /// figure is stale the instant it is drawn (it was also rendered under a
    /// "min" label, reading 40 seconds as "40 min"). Show a dash instead.
    private var isSubMinute: Bool {
        !countdown.isPast && !countdown.isComplete
            && countdown.days == 0 && countdown.hours == 0 && countdown.minutes == 0
    }

    private var primaryText: String {
        isSubMinute ? "—" : primaryValue.formattedWithoutSeparator
    }
    
    private var lang: String { WidgetDataSync.shared.appLanguage() }

    private var primaryUnit: String {
        if countdown.isPast {
            return RelativeTime.label("days", lang)
        } else if countdown.days > 0 {
            return RelativeTime.label("days", lang)
        } else if countdown.hours > 0 {
            return RelativeTime.label("hours", lang)
        } else if countdown.minutes > 0 {
            return RelativeTime.label("min", lang)
        } else {
            return RelativeTime.label("min", lang)
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
                .emojiContainerClip(EmojiShape(rawValueOrDefault: event.emojiShape))

            // Render emoji as image to preserve colors in Clear/Tinted modes
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
        // Handle different rendering modes
        if widgetRenderingMode == .accented {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.accentColor.opacity(0.3))
                .frame(width: 40, height: 40)
        } else if widgetRenderingMode == .vibrant {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.2))
                .frame(width: 40, height: 40)
        } else if let hexColor = event.emojiColor {
            // For full color mode, use the emoji color gradient
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
    
    private var accentColor: Color {
        if let hexColor = event.emojiColor {
            return Color(hex: hexColor)
        }
        return .blue
    }
    
    private func formatDate(_ date: Date, countdown: CountdownTime, countdownStyle: WidgetCountdownStyle) -> String {
        let formatter = DateFormatter()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())
        let dateYear = calendar.component(.year, from: date)
        
        if event.isRecurring {
            formatter.dateFormat = "MMM d"
            let dateStr = formatter.string(from: date)
            if countdownStyle == .visual {
                let daysLabel = countdown.days == 1 ? "day" : "days"
                return "Next: \(dateStr) · \(countdown.days.formattedWithoutSeparator) \(daysLabel)"
            }
            return "Next: \(dateStr)"
        } else {
            formatter.dateFormat = dateYear == currentYear ? "MMM d" : "MMM d, yyyy"
            return formatter.string(from: date)
        }
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
