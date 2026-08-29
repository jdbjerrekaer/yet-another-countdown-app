import Foundation
import Capacitor

#if canImport(ActivityKit)
import ActivityKit
#endif

/// Starts and ends lock-screen Live Activities for countdowns that land today.
///
/// ActivityKit can only be asked for an activity while the app is in the
/// foreground (push-to-start needs an APNs server this app does not have), so
/// the web layer calls `sync` on launch and on every return to the foreground
/// and hands over the full set of countdowns that should be showing.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivityPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAll", returnType: CAPPluginReturnPromise)
    ]

    private let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private func date(from value: String?) -> Date? {
        guard let value else { return nil }
        return iso.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
            return
        }
        #endif
        call.resolve(["supported": false])
    }

    /// Reconcile the running activities with the list the app wants showing:
    /// start what is missing, end what no longer belongs. An activity the user
    /// dismissed is simply gone, and the web layer decides whether to offer it
    /// again — it does not, until the next day.
    @objc func sync(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.1, *), ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": [], "supported": false])
            return
        }

        let wanted = call.getArray("activities", JSObject.self) ?? []
        let wantedIds = Set(wanted.compactMap { $0["eventId"] as? String })
        var live = Set<String>()

        for activity in Activity<CountdownActivityAttributes>.activities {
            if wantedIds.contains(activity.attributes.eventId) {
                live.insert(activity.attributes.eventId)
            } else {
                Task { await activity.end(nil, dismissalPolicy: .immediate) }
            }
        }

        var started: [String] = []
        for item in wanted {
            guard let eventId = item["eventId"] as? String, !live.contains(eventId) else { continue }
            let attributes = CountdownActivityAttributes(
                eventId: eventId,
                title: item["title"] as? String ?? "",
                emoji: item["emoji"] as? String ?? "⏳",
                tintHex: item["tintHex"] as? String
            )
            let state = CountdownActivityAttributes.ContentState(
                headline: item["headline"] as? String ?? "",
                targetDate: date(from: item["targetDate"] as? String)
            )
            do {
                if #available(iOS 16.2, *) {
                    _ = try Activity.request(
                        attributes: attributes,
                        content: .init(state: state, staleDate: state.targetDate),
                        pushType: nil
                    )
                } else {
                    _ = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
                }
                started.append(eventId)
            } catch {
                // Out of activity slots, or the user turned them off for this
                // app between the check above and here. Nothing to recover.
                continue
            }
        }
        call.resolve(["started": started, "supported": true])
        #else
        call.resolve(["started": [], "supported": false])
        #endif
    }

    @objc func endAll(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            for activity in Activity<CountdownActivityAttributes>.activities {
                Task { await activity.end(nil, dismissalPolicy: .immediate) }
            }
        }
        #endif
        call.resolve()
    }
}
