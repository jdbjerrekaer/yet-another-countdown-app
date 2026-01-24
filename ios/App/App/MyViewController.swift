import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    
    override open func capacitorDidLoad() {
        // Register local plugins here
        bridge?.registerPluginInstance(CalendarPlugin())
        bridge?.registerPluginInstance(BuildInfoPlugin())
        bridge?.registerPluginInstance(EmojiKeyboardPlugin())
    }
}
