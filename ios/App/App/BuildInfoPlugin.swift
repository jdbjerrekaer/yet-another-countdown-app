import Foundation
import Capacitor
import os.log

@objc(BuildInfoPlugin)
public class BuildInfoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BuildInfoPlugin"
    public let jsName = "BuildInfoPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getBuildType", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "log", returnType: CAPPluginReturnPromise)
    ]

    @objc func getBuildType(_ call: CAPPluginCall) {
        #if DEBUG
        call.resolve([
            "buildType": "debug"
        ])
        #else
        call.resolve([
            "buildType": "release"
        ])
        #endif
    }

    @objc func log(_ call: CAPPluginCall) {
        let message = call.getString("message") ?? ""
        let data = call.getObject("data") ?? [:]
        let subsystem = Bundle.main.bundleIdentifier ?? "com.jonatanbjerrekaer.countdown"
        let logger = OSLog(subsystem: subsystem, category: "debug")
        os_log("[DEBUG-PURCHASE] %{public}@ %{public}@",
               log: logger,
               type: .info,
               message,
               String(describing: data))
        call.resolve()
    }
}
