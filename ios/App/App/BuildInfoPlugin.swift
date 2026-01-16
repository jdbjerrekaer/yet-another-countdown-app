import Foundation
import Capacitor

@objc(BuildInfoPlugin)
public class BuildInfoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BuildInfoPlugin"
    public let jsName = "BuildInfoPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getBuildType", returnType: CAPPluginReturnPromise)
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
}
