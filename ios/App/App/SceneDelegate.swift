import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        let vc = MyViewController()
        // Store the cold-launch URL so MyViewController.capacitorDidLoad can fire it
        // after CAPBridgeViewController.viewDidLoad has registered its observers.
        // Calling ApplicationDelegateProxy here is too early — the capacitorOpenURL
        // notification would be missed and getLaunchUrl() would return nil.
        vc.pendingLaunchUrl = connectionOptions.urlContexts.first?.url
        window.rootViewController = vc
        self.window = window
        window.makeKeyAndVisible()
    }

    // Called when the app is already running and receives a URL (AirDrop, custom scheme, etc.)
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: context.url,
                options: [:]
            )
        }
    }
}
