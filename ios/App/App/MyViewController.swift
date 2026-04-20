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

        // Persist cold-launch URL to UserDefaults (timing-immune). JS reads it via
        // @capacitor/preferences in DeepLinkHandler — avoids the capacitorOpenURL
        // notification race (observer registers in viewDidLoad, after this point).
        if let url = pendingLaunchUrl {
            pendingLaunchUrl = nil
            UserDefaults.standard.set(url.absoluteString, forKey: "CapacitorStorage.pendingColdLaunchUrl")
        }
    }
}
