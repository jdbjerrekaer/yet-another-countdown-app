import SwiftUI

/// Flip clock digit view for Classic widget style
struct FlipDigitView: View {
    let value: Int
    let fontSize: CGFloat
    var theme: FlipDigitTheme = .dark
    
    enum FlipDigitTheme {
        case light
        case dark
        
        var backgroundColor: Color {
            switch self {
            case .light: return Color(red: 0.96, green: 0.96, blue: 0.96) // #f5f5f5
            case .dark: return Color(red: 0.1, green: 0.1, blue: 0.1) // #1a1a1a
            }
        }
        
        var backgroundDarker: Color {
            switch self {
            case .light: return Color(red: 0.91, green: 0.91, blue: 0.91) // #e8e8e8
            case .dark: return Color(red: 0.06, green: 0.06, blue: 0.06) // #0f0f0f
            }
        }
        
        var textColor: Color {
            switch self {
            case .light: return Color(red: 0.12, green: 0.16, blue: 0.22) // #1f2937
            case .dark: return .white
            }
        }
        
        var dividerColor: Color {
            switch self {
            case .light: return Color.black.opacity(0.25)
            case .dark: return Color.black.opacity(0.8)
            }
        }
        
        var dividerShadowColor: Color {
            switch self {
            case .light: return Color.white.opacity(0.5)
            case .dark: return Color.white.opacity(0.1)
            }
        }
        
        var cardShadowOpacity: Double {
            switch self {
            case .light: return 0.15
            case .dark: return 0.3
            }
        }
        
        var topShadowOpacity: Double {
            switch self {
            case .light: return 0.08
            case .dark: return 0.6
            }
        }
    }
    
    // Calculate dimensions based on font size
    private var halfHeight: CGFloat {
        switch fontSize {
        case 28: return 30
        case 36: return 40
        case 48: return 50
        default: return 30
        }
    }
    
    private var cardWidth: CGFloat {
        switch fontSize {
        case 28: return 50
        case 36: return 70
        case 48: return 90
        default: return 50
        }
    }
    
    private var cardHeight: CGFloat {
        return halfHeight * 2
    }
    
    var body: some View {
        ZStack(alignment: .center) {
            // Background card with shadow
            RoundedRectangle(cornerRadius: 6)
                .fill(theme.backgroundColor)
                .shadow(color: .black.opacity(theme.cardShadowOpacity), radius: 2, x: 0, y: 2)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.black.opacity(theme == .light ? 0.08 : 0.2), lineWidth: 1)
                )
            
            // Single centered number
            Text(value.formattedWithoutSeparator)
                .font(.system(size: fontSize, weight: .bold))
                .foregroundColor(theme.textColor)
            
            // Divider line in the middle
            Rectangle()
                .fill(theme.dividerColor)
                .frame(height: 1)
                .shadow(color: theme.dividerShadowColor, radius: 0.5, y: 0.5)
        }
        .frame(width: cardWidth, height: cardHeight)
        .widgetAccentable(false)
    }
}
