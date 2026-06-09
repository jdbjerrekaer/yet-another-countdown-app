import Foundation
import Capacitor

/// Syncs the countdown list across the user's Apple devices via iCloud
/// key-value storage (NSUbiquitousKeyValueStore).
///
/// The web/JS layer remains the source of truth: it owns the `countdowns`
/// JSON blob and a `countdownsLastUpdated` timestamp. This plugin only mirrors
/// that blob into iCloud and notifies JS when another device changes it. JS is
/// responsible for the actual per-id merge / last-write-wins reconciliation.
@objc(CountdownSyncPlugin)
public class CountdownSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CountdownSyncPlugin"
    public let jsName = "CountdownSyncPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pushCountdowns", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pullCountdowns", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]

    private let jsonKey = "countdownsJSON"
    private let updatedAtKey = "countdownsUpdatedAt"

    /// NSUbiquitousKeyValueStore allows up to 1 MB total. Keep a margin so a
    /// single oversized blob can never wedge the whole store.
    private let maxValueBytes = 900_000

    private let store = NSUbiquitousKeyValueStore.default

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(storeDidChangeExternally(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: store
        )
        // Pull the latest cloud values into the local store on launch.
        store.synchronize()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    /// Fired when another device (or initial sync) changes the cloud store.
    @objc func storeDidChangeExternally(_ notification: Notification) {
        // Only react to changes that actually touched our keys.
        if let userInfo = notification.userInfo,
           let changedKeys = userInfo[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String],
           !changedKeys.contains(jsonKey) {
            return
        }

        let json = store.string(forKey: jsonKey)
        let updatedAt = store.string(forKey: updatedAtKey)
        guard let json = json else { return }

        notifyListeners("countdownsChanged", data: [
            "json": json,
            "updatedAt": updatedAt ?? ""
        ])
    }

    /// Informational only — do NOT gate sync on this. `ubiquityIdentityToken`
    /// reflects iCloud Drive / document-container availability, which is a
    /// DIFFERENT capability from key-value storage. A KVS-only app with no
    /// iCloud container often gets nil here even when fully signed into iCloud,
    /// so using it as a gate silently disables a working KVS sync.
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = FileManager.default.ubiquityIdentityToken != nil
        call.resolve(["available": available])
    }

    /// Diagnostic snapshot for debugging sync during testing.
    @objc func getStatus(_ call: CAPPluginCall) {
        store.synchronize()
        let json = store.string(forKey: jsonKey)
        let hasUbiquityToken = FileManager.default.ubiquityIdentityToken != nil
        call.resolve([
            "ubiquityTokenPresent": hasUbiquityToken,
            "hasData": json != nil,
            "byteCount": json?.lengthOfBytes(using: .utf8) ?? 0,
            "updatedAt": store.string(forKey: updatedAtKey) as Any
        ])
    }

    @objc func pushCountdowns(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Missing json parameter")
            return
        }
        let updatedAt = call.getString("updatedAt") ?? ISO8601DateFormatter().string(from: Date())

        let byteCount = json.lengthOfBytes(using: .utf8)
        if byteCount > maxValueBytes {
            // Don't write — would risk exceeding the KVS quota. Surface so JS
            // can warn / fall back rather than silently dropping the sync.
            call.resolve([
                "success": false,
                "reason": "tooLarge",
                "byteCount": byteCount
            ])
            return
        }

        store.set(json, forKey: jsonKey)
        store.set(updatedAt, forKey: updatedAtKey)
        let synced = store.synchronize()

        call.resolve([
            "success": synced,
            "byteCount": byteCount
        ])
    }

    @objc func pullCountdowns(_ call: CAPPluginCall) {
        store.synchronize()
        let json = store.string(forKey: jsonKey)
        let updatedAt = store.string(forKey: updatedAtKey)

        call.resolve([
            "json": json as Any,
            "updatedAt": updatedAt as Any,
            "hasData": json != nil
        ])
    }
}
