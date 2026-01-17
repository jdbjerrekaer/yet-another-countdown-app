import Foundation
import Capacitor

@objc(ICloudSyncPlugin)
public class ICloudSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudSyncPlugin"
    public let jsName = "ICloudSyncPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getString", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setString", returnType: CAPPluginReturnPromise)
    ]

    private let store = NSUbiquitousKeyValueStore.default

    public override func load() {
        super.load()
        store.synchronize()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKVSChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: store
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = FileManager.default.ubiquityIdentityToken != nil
        call.resolve(["available": available])
    }

    @objc func getString(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing key")
            return
        }
        let value = store.string(forKey: key)
        call.resolve(["value": value ?? NSNull()])
    }

    @objc func setString(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing key")
            return
        }

        if let value = call.getString("value") {
            store.set(value, forKey: key)
        } else {
            store.removeObject(forKey: key)
        }
        store.synchronize()
        call.resolve(["success": true])
    }

    @objc private func handleKVSChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo else {
            return
        }
        let reason = userInfo[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int ?? 0
        let keys = userInfo[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        notifyListeners("kvStoreDidChange", data: [
            "keys": keys,
            "reason": reason
        ])
    }
}
