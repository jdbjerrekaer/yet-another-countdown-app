import SwiftUI
import WidgetKit

/// Triple large widget view (329x329) displaying three countdown events
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
                EventRowView(
                    event: event1,
                    appearanceMode: appearanceMode,
                    widgetRenderingMode: widgetRenderingMode,
                    colorScheme: colorScheme
                )
            } else {
                EmptyRowView(appearanceMode: appearanceMode)
            }
            
            Divider()
                .background(dividerColor)
            
            if let event2 = event2 {
                EventRowView(
                    event: event2,
                    appearanceMode: appearanceMode,
                    widgetRenderingMode: widgetRenderingMode,
                    colorScheme: colorScheme
                )
            } else {
                EmptyRowView(appearanceMode: appearanceMode)
            }
            
            Divider()
                .background(dividerColor)
            
            if let event3 = event3 {
                EventRowView(
                    event: event3,
                    appearanceMode: appearanceMode,
                    widgetRenderingMode: widgetRenderingMode,
                    colorScheme: colorScheme
                )
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

// MARK: - Event Row View

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
        .frame(height: 109) // Divide 329 by 3, accounting for dividers
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
    
    @ViewBuilder
    private var emojiBadgeView: some View {
        ZStack {
            badgeBackgroundView
            
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

// MARK: - Empty Row View

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
