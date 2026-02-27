import Foundation
import Capacitor
import StoreKit
import os.log

@objc(StoreKitDiagnosticsPlugin)
public class StoreKitDiagnosticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitDiagnosticsPlugin"
    public let jsName = "StoreKitDiagnosticsPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "collectSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncStore", returnType: CAPPluginReturnPromise)
    ]
    
    private let snapshotFileName = "storekit_diagnostics_snapshot.json"
    private let productIds = [
        "com.countdown.app.remove_ads",
        "com.countdown.app.remove_ads_supporter"
    ]
    
    @objc func collectSnapshot(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                do {
                    let snapshot = try await collectStoreKit2Snapshot()
                    let jsonData = try JSONSerialization.data(withJSONObject: snapshot, options: [.prettyPrinted])
                    
                    if let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
                        let snapshotPath = documentsPath.appendingPathComponent(snapshotFileName)
                        try jsonData.write(to: snapshotPath)
                        
                        let subsystem = Bundle.main.bundleIdentifier ?? "com.jonatanbjerrekaer.countdown"
                        let logger = OSLog(subsystem: subsystem, category: "StoreKitDiagnostics")
                        os_log("StoreKit diagnostics snapshot saved to: %{public}@", log: logger, type: .info, snapshotPath.path)
                    }
                    
                    await MainActor.run {
                        call.resolve(snapshot)
                    }
                } catch {
                    await MainActor.run {
                        call.reject("Failed to collect snapshot: \(error.localizedDescription)", nil, error)
                    }
                }
            }
        } else {
            call.resolve([
                "error": "StoreKit 2 requires iOS 15.0+",
                "available": false,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ])
        }
    }
    
    @objc func syncStore(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                do {
                    try await AppStore.sync()
                    await MainActor.run {
                        call.resolve(["success": true])
                    }
                } catch {
                    await MainActor.run {
                        call.reject("Failed to sync store: \(error.localizedDescription)", nil, error)
                    }
                }
            }
        } else {
            call.resolve(["success": false, "error": "StoreKit 2 requires iOS 15.0+"])
        }
    }
    
    @available(iOS 15.0, *)
    private func collectStoreKit2Snapshot() async throws -> [String: Any] {
        var snapshot: [String: Any] = [:]
        snapshot["timestamp"] = ISO8601DateFormatter().string(from: Date())
        snapshot["iosVersion"] = UIDevice.current.systemVersion
        
        var entitlements: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction):
                var entitlement: [String: Any] = [:]
                entitlement["productId"] = transaction.productID
                entitlement["transactionId"] = String(transaction.id)
                entitlement["purchaseDate"] = ISO8601DateFormatter().string(from: transaction.purchaseDate)
                entitlement["transactionState"] = String(describing: transaction.transactionState)
                if let revocationDate = transaction.revocationDate {
                    entitlement["revocationDate"] = ISO8601DateFormatter().string(from: revocationDate)
                }
                if let expirationDate = transaction.expirationDate {
                    entitlement["expirationDate"] = ISO8601DateFormatter().string(from: expirationDate)
                }
                entitlements.append(entitlement)
            case .unverified(_, let error):
                var entitlement: [String: Any] = [:]
                entitlement["error"] = error.localizedDescription
                entitlement["verificationFailed"] = true
                entitlements.append(entitlement)
            }
        }
        snapshot["currentEntitlements"] = entitlements
        
        var transactions: [[String: Any]] = []
        var transactionCount = 0
        for await result in Transaction.all {
            transactionCount += 1
            if transactionCount > 50 {
                break
            }
            
            switch result {
            case .verified(let transaction):
                var transactionData: [String: Any] = [:]
                transactionData["productId"] = transaction.productID
                transactionData["transactionId"] = String(transaction.id)
                transactionData["purchaseDate"] = ISO8601DateFormatter().string(from: transaction.purchaseDate)
                transactionData["transactionState"] = String(describing: transaction.transactionState)
                if let revocationDate = transaction.revocationDate {
                    transactionData["revocationDate"] = ISO8601DateFormatter().string(from: revocationDate)
                }
                if let expirationDate = transaction.expirationDate {
                    transactionData["expirationDate"] = ISO8601DateFormatter().string(from: expirationDate)
                }
                transactions.append(transactionData)
            case .unverified(_, let error):
                var transactionData: [String: Any] = [:]
                transactionData["error"] = error.localizedDescription
                transactionData["verificationFailed"] = true
                transactions.append(transactionData)
            }
        }
        snapshot["recentTransactions"] = transactions
        snapshot["transactionCount"] = transactionCount
        
        var productStatuses: [[String: Any]] = []
        for productId in productIds {
            do {
                if let product = try await Product.products(for: [productId]).first {
                    var status: [String: Any] = [:]
                    status["productId"] = productId
                    status["available"] = true
                    status["displayName"] = product.displayName
                    status["description"] = product.description
                    status["price"] = product.price.description
                    status["currencyCode"] = product.priceLocale?.currencyCode ?? "unknown"
                    
                    if let subscription = product.subscription {
                        status["subscriptionInfo"] = [
                            "subscriptionGroupId": subscription.subscriptionGroupID,
                            "introductoryOffer": subscription.introductoryOffer != nil,
                            "promotionalOffers": subscription.promotionalOffers.count
                        ]
                    }
                    
                    if #available(iOS 15.0, *) {
                        let transactionStatus = try await product.subscription?.status.first
                        if let statusValue = transactionStatus {
                            status["subscriptionStatus"] = String(describing: statusValue.state)
                        }
                    }
                    
                    productStatuses.append(status)
                } else {
                    productStatuses.append([
                        "productId": productId,
                        "available": false,
                        "error": "Product not found"
                    ])
                }
            } catch {
                productStatuses.append([
                    "productId": productId,
                    "available": false,
                    "error": error.localizedDescription
                ])
            }
        }
        snapshot["productStatuses"] = productStatuses
        
        if let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            let snapshotPath = documentsPath.appendingPathComponent(snapshotFileName)
            if FileManager.default.fileExists(atPath: snapshotPath.path) {
                if let lastSnapshotData = try? Data(contentsOf: snapshotPath),
                   let lastSnapshot = try? JSONSerialization.jsonObject(with: lastSnapshotData) as? [String: Any],
                   let lastTimestamp = lastSnapshot["timestamp"] as? String {
                    snapshot["previousSnapshotTimestamp"] = lastTimestamp
                }
            }
        }
        
        return snapshot
    }
}
