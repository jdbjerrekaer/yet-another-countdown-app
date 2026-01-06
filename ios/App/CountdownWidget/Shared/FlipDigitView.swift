import SwiftUI

/// Flip clock digit view for Classic widget style
struct FlipDigitView: View {
    let value: Int
    let fontSize: CGFloat
    
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
            // Background card
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(red: 0.1, green: 0.1, blue: 0.1))
                .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 2)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.black.opacity(0.2), lineWidth: 1)
                )
            
            VStack(spacing: 0) {
                // Top half
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(red: 0.1, green: 0.1, blue: 0.1))
                        .shadow(color: .black.opacity(0.6), radius: 2, x: 0, y: 1)
                    
                    Text("\(value)")
                        .font(.system(size: fontSize, weight: .bold))
                        .foregroundColor(.white)
                }
                .frame(height: halfHeight)
                .clipped()
                
                // Divider line
                Rectangle()
                    .fill(Color.black.opacity(0.8))
                    .frame(height: 1)
                    .shadow(color: .white.opacity(0.1), radius: 0.5, y: 0.5)
                
                // Bottom half
                ZStack {
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.1, green: 0.1, blue: 0.1),
                            Color(red: 0.06, green: 0.06, blue: 0.06)
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .shadow(color: .black.opacity(0.4), radius: 2, x: 0, y: -1)
                    
                    Text("\(value)")
                        .font(.system(size: fontSize, weight: .bold))
                        .foregroundColor(.white.opacity(0.3))
                }
                .frame(height: halfHeight)
                .clipped()
            }
        }
        .frame(width: cardWidth, height: cardHeight)
    }
}
