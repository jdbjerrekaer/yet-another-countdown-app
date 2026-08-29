import Foundation

#if canImport(ActivityKit)
import ActivityKit

/// Shared between the app (which starts and ends activities) and the widget
/// extension (which draws them).
///
/// The headline is composed in the web layer and handed over as a finished
/// string: all eleven translations already live there, and a Live Activity is
/// only ever started while the app is running, so there is nothing to gain from
/// duplicating the wording in Swift.
@available(iOS 16.1, *)
struct CountdownActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// e.g. "3 years today", "Today", "Tonight at 20:00".
        var headline: String
        /// Set only when the moment is still ahead: the lock screen ticks down
        /// to it on its own, without the app having to push updates.
        var targetDate: Date?
    }

    var eventId: String
    var title: String
    var emoji: String
    /// "#RRGGBB" from the countdown's emoji colour, used to tint the badge.
    var tintHex: String?
}
#endif
