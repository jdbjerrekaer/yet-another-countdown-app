import SwiftUI
import WidgetKit

#if canImport(ActivityKit)
import ActivityKit

/// Lock-screen Live Activity (and, on capable devices, the Dynamic Island).
///
/// Activities are only ever started on the day itself — see LiveActivityPlugin
/// and lib/liveActivities.ts — so the Dynamic Island never lights up ahead of
/// time. iOS gives no way to run one presentation without the other.
@available(iOS 16.1, *)
struct CountdownLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CountdownActivityAttributes.self) { context in
            HStack(spacing: 12) {
                badge(context.attributes)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.title)
                        .font(.system(size: 15, weight: .semibold))
                        .lineLimit(1)
                    value(context.state)
                        .font(.system(size: 22, weight: .bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                Spacer(minLength: 0)
            }
            .padding(16)
            .activityBackgroundTint(nil)
            .activitySystemActionForegroundColor(.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    badge(context.attributes)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    value(context.state)
                        .font(.system(size: 20, weight: .bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.title)
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                }
            } compactLeading: {
                Text(context.attributes.emoji)
            } compactTrailing: {
                value(context.state)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    // A timer is the widest thing that can land here; without a
                    // ceiling the Island keeps resizing as the digits change.
                    .frame(maxWidth: 56)
            } minimal: {
                Text(context.attributes.emoji)
            }
            .keylineTint(tint(context.attributes))
        }
    }

    /// The moment itself is either still ahead — in which case the system ticks
    /// it down for us, no pushes needed — or it is simply now, and the headline
    /// (already localised by the app) says so.
    @ViewBuilder
    private func value(_ state: CountdownActivityAttributes.ContentState) -> some View {
        if let target = state.targetDate, target > Date() {
            Text(timerInterval: Date()...target, countsDown: true)
                .monospacedDigit()
        } else {
            Text(state.headline)
        }
    }

    @ViewBuilder
    private func badge(_ attributes: CountdownActivityAttributes) -> some View {
        Text(attributes.emoji)
            .font(.system(size: 24))
            .frame(width: 44, height: 44)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(tint(attributes)?.opacity(0.22) ?? Color.secondary.opacity(0.18))
            )
    }

    private func tint(_ attributes: CountdownActivityAttributes) -> Color? {
        guard let hex = attributes.tintHex else { return nil }
        var value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard value.count == 6, let rgb = UInt32(value, radix: 16) else { return nil }
        value = ""
        return Color(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
}
#endif
