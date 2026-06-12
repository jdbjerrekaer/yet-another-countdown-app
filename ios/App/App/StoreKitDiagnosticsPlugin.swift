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
        CAPPluginMethod(name: "fetchProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncStore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlements", returnType: CAPPluginReturnPromise)
    ]

    private let snapshotFileName = "storekit_diagnostics_snapshot.json"
    private let productIds = [
        "com.jonatanbjerrekaer.countdown.remove_ads",
        "com.jonatanbjerrekaer.countdown.remove_ads_supporter"
    ]
    private var transactionUpdatesTask: Any?

    public override func load() {
        if #available(iOS 15.0, *) {
            // Forward StoreKit 2 transaction updates to JS so entitlements land
            // even when the Cordova payment-queue events never fire. Observation
            // only — the Cordova plugin owns finishing transactions.
            transactionUpdatesTask = Task.detached { [weak self] in
                for await result in Transaction.updates {
                    guard let self else { return }
                    if case .verified(let transaction) = result,
                       self.productIds.contains(transaction.productID) {
                        var data: [String: Any] = [
                            "productId": transaction.productID,
                            "transactionId": String(transaction.id),
                            "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
                            "transactionState": "verified"
                        ]
                        if let revocationDate = transaction.revocationDate {
                            data["revocationDate"] = ISO8601DateFormatter().string(from: revocationDate)
                        }
                        self.notifyListeners("transactionUpdated", data: data)
                    }
                }
            }
        }
    }

    deinit {
        if #available(iOS 15.0, *) {
            (transactionUpdatesTask as? Task<Void, Never>)?.cancel()
        }
    }

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

    @objc func fetchProducts(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                do {
                    let products = try await fetchStoreKitProducts()
                    await MainActor.run {
                        call.resolve([
                            "timestamp": ISO8601DateFormatter().string(from: Date()),
                            "products": products
                        ])
                    }
                } catch {
                    await MainActor.run {
                        call.resolve([
                            "timestamp": ISO8601DateFormatter().string(from: Date()),
                            "products": [],
                            "error": error.localizedDescription
                        ])
                    }
                }
            }
        } else {
            call.resolve([
                "timestamp": ISO8601DateFormatter().string(from: Date()),
                "products": [],
                "error": "StoreKit 2 requires iOS 15.0+"
            ])
        }
    }
    
    @objc func getEntitlements(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                let entitlements = await currentEntitlementPayloads()
                await MainActor.run {
                    call.resolve([
                        "timestamp": ISO8601DateFormatter().string(from: Date()),
                        "entitlements": entitlements
                    ])
                }
            }
        } else {
            call.resolve([
                "timestamp": ISO8601DateFormatter().string(from: Date()),
                "entitlements": [],
                "error": "StoreKit 2 requires iOS 15.0+"
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
    private func fetchStoreKitProducts() async throws -> [[String: Any]] {
        let products = try await Product.products(for: productIds)
        return productIds.map { productId in
            guard let product = products.first(where: { $0.id == productId }) else {
                return [
                    "productId": productId,
                    "available": false,
                    "error": "Product not found"
                ]
            }

            return [
                "productId": productId,
                "available": true,
                "displayName": product.displayName,
                "description": product.description,
                "price": product.displayPrice,
                "currencyCode": product.priceFormatStyle.currencyCode
            ]
        }
    }

    @available(iOS 15.0, *)
    private func currentEntitlementPayloads() async -> [[String: Any]] {
        var entitlements: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction):
                var entitlement: [String: Any] = [:]
                entitlement["productId"] = transaction.productID
                entitlement["transactionId"] = String(transaction.id)
                entitlement["purchaseDate"] = ISO8601DateFormatter().string(from: transaction.purchaseDate)
                entitlement["transactionState"] = "verified"
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
        return entitlements
    }

    @available(iOS 15.0, *)
    private func collectStoreKit2Snapshot() async throws -> [String: Any] {
        var snapshot: [String: Any] = [:]
        snapshot["timestamp"] = ISO8601DateFormatter().string(from: Date())
        let iosVersion = await MainActor.run { UIDevice.current.systemVersion }
        snapshot["iosVersion"] = iosVersion
        
        snapshot["currentEntitlements"] = await currentEntitlementPayloads()

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
                transactionData["transactionState"] = "verified"
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
                    status["currencyCode"] = product.priceFormatStyle.currencyCode
                    
                    if let subscription = product.subscription {
                        status["subscriptionInfo"] = [
                            "subscriptionGroupId": subscription.subscriptionGroupID,
                            "introductoryOffer": subscription.introductoryOffer != nil,
                            "promotionalOffers": subscription.promotionalOffers.count
                        ]
                    }
                    
                    let transactionStatus = try await product.subscription?.status.first
                    if let statusValue = transactionStatus {
                        status["subscriptionStatus"] = String(describing: statusValue.state)
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
