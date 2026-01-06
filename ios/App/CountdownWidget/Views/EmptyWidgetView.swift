import SwiftUI
import WidgetKit

/// Empty state view shown when no countdown is selected or available
struct EmptyWidgetView: View {
    let family: WidgetFamily
    
    var body: some View {
        VStack(spacing: 8) {
            Text("⏳")
                .font(.system(size: emojiSize))
            
            Text("No Countdown")
                .font(.system(size: titleSize, weight: .semibold))
                .foregroundColor(.primary)
            
            if family != .systemSmall {
                Text("Tap to configure")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emojiSize: CGFloat {
        switch family {
        case .systemSmall:
            return 32
        case .systemMedium:
            return 36
        case .systemLarge:
            return 48
        @unknown default:
            return 32
        }
    }
    
    private var titleSize: CGFloat {
        switch family {
        case .systemSmall:
            return 14
        case .systemMedium:
            return 16
        case .systemLarge:
            return 18
        @unknown default:
            return 14
        }
    }
}
