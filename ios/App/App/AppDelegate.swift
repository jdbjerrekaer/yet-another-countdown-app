import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // #region agent log
    private func debugPost(hypothesisId: String, location: String, message: String, data: [String: Any]) {
        guard let url = URL(string: "http://127.0.0.1:7247/ingest/da8e86ed-1870-4def-8922-2bc5c79d9c07") else { return }
        let payload: [String: Any] = [
            "sessionId": "debug-session",
            "runId": "pre-fix",
            "hypothesisId": hypothesisId,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000)
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload, options: []) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        URLSession.shared.dataTask(with: request).resume()
    }
    // #endregion

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        // #region agent log
        let iconsDict = Bundle.main.infoDictionary?["CFBundleIcons"] as? [String: Any]
        let hasAlternateIcons = (iconsDict?["CFBundleAlternateIcons"] != nil)
        let currentStyle = window?.traitCollection.userInterfaceStyle.rawValue ?? -1
        let currentAlt = UIApplication.shared.alternateIconName ?? "nil"
        debugPost(
            hypothesisId: "H1",
            location: "AppDelegate.swift:didFinishLaunching",
            message: "App icon config at launch",
            data: [
                "supportsAlternateIcons": UIApplication.shared.supportsAlternateIcons,
                "hasAlternateIconsInPlist": hasAlternateIcons,
                "alternateIconName": currentAlt,
                "uiStyleRaw": currentStyle
            ]
        )
        // #endregion
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
        // #region agent log
        let currentStyle = window?.traitCollection.userInterfaceStyle.rawValue ?? -1
        let currentAlt = UIApplication.shared.alternateIconName ?? "nil"
        debugPost(
            hypothesisId: "H2",
            location: "AppDelegate.swift:applicationWillEnterForeground",
            message: "App foreground with current UI style",
            data: [
                "alternateIconName": currentAlt,
                "uiStyleRaw": currentStyle
            ]
        )
        // #endregion
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        // #region agent log
        let currentStyle = window?.traitCollection.userInterfaceStyle.rawValue ?? -1
        let currentAlt = UIApplication.shared.alternateIconName ?? "nil"
        debugPost(
            hypothesisId: "H3",
            location: "AppDelegate.swift:applicationDidBecomeActive",
            message: "App active with current UI style",
            data: [
                "alternateIconName": currentAlt,
                "uiStyleRaw": currentStyle,
                "supportsAlternateIcons": UIApplication.shared.supportsAlternateIcons
            ]
        )
        // #endregion
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
