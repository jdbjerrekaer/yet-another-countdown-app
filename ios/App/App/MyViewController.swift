import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {

    var pendingLaunchUrl: URL?

    override open func capacitorDidLoad() {
        // Register local plugins here
        bridge?.registerPluginInstance(CalendarPlugin())
        bridge?.registerPluginInstance(BuildInfoPlugin())
        bridge?.registerPluginInstance(EmojiKeyboardPlugin())
        bridge?.registerPluginInstance(StoreKitDiagnosticsPlugin())

        // Replay cold-launch URL now that viewDidLoad has registered the
        // capacitorOpenURL observer — this sets bridge.launchUrl so that
        // JavaScript's App.getLaunchUrl() returns the correct URL.
        if let url = pendingLaunchUrl {
            pendingLaunchUrl = nil
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: url,
                options: [:]
            )
        }
    }
}
