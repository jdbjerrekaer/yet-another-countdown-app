import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var iconChangeWorkItem: DispatchWorkItem?
    private var isChangingIcon = false
    private var previousTraitStyle: UIUserInterfaceStyle = .unspecified

    private func updateAppIconForCurrentStyle() {
        guard !isChangingIcon else { return }
        
        iconChangeWorkItem?.cancel()
        
        let style = window?.traitCollection.userInterfaceStyle ?? .unspecified
        let desiredAltIcon: String? = (style == .dark) ? "AppIconDark" : nil
        let currentAlt = UIApplication.shared.alternateIconName
        
        guard currentAlt != desiredAltIcon else { return }
        guard UIApplication.shared.supportsAlternateIcons else { return }
        
        isChangingIcon = true
        
        iconChangeWorkItem = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            
            let style = self.window?.traitCollection.userInterfaceStyle ?? .unspecified
            let desiredIcon: String? = (style == .dark) ? "AppIconDark" : nil
            let currentIcon = UIApplication.shared.alternateIconName
            
            guard currentIcon != desiredIcon else {
                self.isChangingIcon = false
                return
            }
            
            UIApplication.shared.setAlternateIconName(desiredIcon) { _ in
                self.isChangingIcon = false
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: iconChangeWorkItem!)
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        previousTraitStyle = window?.traitCollection.userInterfaceStyle ?? .unspecified
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
            self?.updateAppIconForCurrentStyle()
        }
        
        setupTraitCollectionObserver()
        return true
    }
    
    private func setupTraitCollectionObserver() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.checkTraitCollectionChange()
        }
        
        NotificationCenter.default.addObserver(
            forName: UIWindow.didBecomeKeyNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.checkTraitCollectionChange()
        }
    }
    
    private func checkTraitCollectionChange() {
        let currentStyle = window?.traitCollection.userInterfaceStyle ?? .unspecified
        if previousTraitStyle != currentStyle {
            previousTraitStyle = currentStyle
            updateAppIconForCurrentStyle()
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        checkTraitCollectionChange()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.updateAppIconForCurrentStyle()
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
