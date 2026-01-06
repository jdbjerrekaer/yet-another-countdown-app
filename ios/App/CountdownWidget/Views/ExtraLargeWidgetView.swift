import SwiftUI
import WidgetKit

/// Extra Large widget view (329x400)
struct ExtraLargeWidgetView: View {
    let event: CountdownEvent
    let countdown: CountdownTime
    let targetDate: Date?
    let appearanceMode: WidgetAppearanceMode
    let countdownStyle: WidgetCountdownStyle
    let progress: Double
    
    @Environment(\.widgetRenderingMode) var widgetRenderingMode
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with emoji badge, title and date
            HStack(spacing: 16) {
                // Emoji badge
                emojiBadgeView
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(event.title)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(foregroundColor)
                            .lineLimit(1)
                        
                        if event.isRecurring {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 16))
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
            .padding(.bottom, 24)
            
            Spacer()
            
            // Main content
            if countdown.isComplete && !countdown.isPast {
                VStack {
                    Text("Today! 🎉")
                        .font(.system(size: 56, weight: .bold))
                        .foregroundColor(.blue)
                }
            } else if countdownStyle == .visual {
                // Visual mode - progress bars with time grid below
                VStack(spacing: 24) {
                    ProgressBarsView(
                        progress: progress,
                        numBars: 8,
                        color: accentColor,
                        barWidth: 30,
                        barHeight: 140
                    )
                    .widgetAccentable(false)
                    
                    // Time grid
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 8) {
                        if countdown.isPast {
                            TimeCardCompactView(value: countdown.daysSince, unit: "Days ago", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        } else {
                            TimeCardCompactView(value: countdown.days, unit: "days", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                            TimeCardCompactView(value: countdown.hours, unit: "hours", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                            TimeCardCompactView(value: countdown.minutes, unit: "minutes", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                            TimeCardCompactView(value: countdown.seconds, unit: "seconds", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        }
                    }
                }
            } else if countdownStyle == .classic {
                // Classic mode - flip clock style
                // In vibrant/accented modes, use simple text instead of flip digits
                if widgetRenderingMode == .vibrant || widgetRenderingMode == .accented {
                    if countdown.isPast {
                        VStack(spacing: 8) {
                            Text("\(countdown.daysSince)")
                                .font(.system(size: 72, weight: .bold))
                                .foregroundColor(foregroundColor)
                            
                            Text(countdown.daysSince == 1 ? "day ago" : "days ago")
                                .font(.system(size: 20))
                                .foregroundColor(mutedColor)
                        }
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            TimeCardLargeView(value: countdown.days, unit: "days", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                            TimeCardLargeView(value: countdown.hours, unit: "hours", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                            TimeCardLargeView(value: countdown.minutes, unit: "minutes", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                            TimeCardLargeView(value: countdown.seconds, unit: "seconds", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        }
                    }
                } else {
                    if countdown.isPast {
                        VStack(spacing: 8) {
                            FlipDigitView(value: countdown.daysSince, fontSize: 48, theme: flipDigitTheme)
                            Text(countdown.daysSince == 1 ? "day ago" : "days ago")
                                .font(.system(size: 20))
                                .foregroundColor(mutedColor)
                        }
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            VStack(spacing: 4) {
                                FlipDigitView(value: countdown.days, fontSize: 48, theme: flipDigitTheme)
                                Text("days")
                                    .font(.system(size: 14))
                                    .foregroundColor(mutedColor)
                            }
                            VStack(spacing: 4) {
                                FlipDigitView(value: countdown.hours, fontSize: 48, theme: flipDigitTheme)
                                Text("hours")
                                    .font(.system(size: 14))
                                    .foregroundColor(mutedColor)
                            }
                            VStack(spacing: 4) {
                                FlipDigitView(value: countdown.minutes, fontSize: 48, theme: flipDigitTheme)
                                Text("minutes")
                                    .font(.system(size: 14))
                                    .foregroundColor(mutedColor)
                            }
                            VStack(spacing: 4) {
                                FlipDigitView(value: countdown.seconds, fontSize: 48, theme: flipDigitTheme)
                                Text("seconds")
                                    .font(.system(size: 14))
                                    .foregroundColor(mutedColor)
                            }
                        }
                    }
                }
            } else {
                // Focus mode - large grid display
                if countdown.isPast {
                    VStack(spacing: 8) {
                        Text("\(countdown.daysSince)")
                            .font(.system(size: 72, weight: .bold))
                            .foregroundColor(foregroundColor)
                        
                        Text(countdown.daysSince == 1 ? "day ago" : "days ago")
                            .font(.system(size: 20))
                            .foregroundColor(mutedColor)
                    }
                } else {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        TimeCardLargeView(value: countdown.days, unit: "days", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        TimeCardLargeView(value: countdown.hours, unit: "hours", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        TimeCardLargeView(value: countdown.minutes, unit: "minutes", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
                        TimeCardLargeView(value: countdown.seconds, unit: "seconds", foregroundColor: foregroundColor, mutedColor: mutedColor, cardColor: cardColor)
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
    
    @ViewBuilder
    private var emojiBadgeView: some View {
        ZStack {
            badgeBackgroundView
            
            // Render emoji as image to preserve colors in Clear/Tinted modes
            if let emojiImage = emojiToImage(event.emoji, size: 28) {
                if #available(iOS 18.0, *) {
                    Image(uiImage: emojiImage)
                        .widgetAccentedRenderingMode(.fullColor)
                } else {
                    Image(uiImage: emojiImage)
                }
            } else {
                Text(event.emoji)
                    .font(.system(size: 28))
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
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.accentColor.opacity(0.3))
                .frame(width: 56, height: 56)
        } else if widgetRenderingMode == .vibrant {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.2))
                .frame(width: 56, height: 56)
        } else if let hexColor = event.emojiColor {
            // For full color mode, use the emoji color gradient
            let color = Color(hex: hexColor)
            RoundedRectangle(cornerRadius: 16)
                .fill(LinearGradient(
                    colors: [color, color.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 56, height: 56)
        } else {
            RoundedRectangle(cornerRadius: 16)
                .fill(LinearGradient(
                    colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 56, height: 56)
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
    
    private var accentColor: Color {
        if let hexColor = event.emojiColor {
            return Color(hex: hexColor)
        }
        return .blue
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        if event.isRecurring {
            formatter.dateFormat = "'Next:' EEEE, MMMM d, yyyy"
        } else {
            formatter.dateFormat = "EEEE, MMMM d, yyyy"
        }
        return formatter.string(from: date)
    }
}

// MARK: - Time Card Compact View

struct TimeCardCompactView: View {
    let value: Int
    let unit: String
    let foregroundColor: Color
    let mutedColor: Color
    let cardColor: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(foregroundColor)
            
            Text(unit)
                .font(.system(size: 10))
                .foregroundColor(mutedColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(cardColor)
        .cornerRadius(12)
    }
}

// MARK: - Time Card Large View

struct TimeCardLargeView: View {
    let value: Int
    let unit: String
    let foregroundColor: Color
    let mutedColor: Color
    let cardColor: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 44, weight: .bold))
                .foregroundColor(foregroundColor)
            
            Text(unit)
                .font(.system(size: 14))
                .foregroundColor(mutedColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(cardColor)
        .cornerRadius(16)
    }
}
