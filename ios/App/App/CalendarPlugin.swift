import Foundation
import Capacitor
import EventKit
import WidgetKit

@objc(CalendarPlugin)
public class CalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CalendarPlugin"
    public let jsName = "CalendarPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRecurringEvents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAllEvents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCalendars", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getInstalledWidgets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]
    
    /// App Group identifier for sharing data with widgets
    private let appGroupIdentifier = "group.countdown.timer.data"
    
    private let eventStore = EKEventStore()
    
    @objc func checkPermission(_ call: CAPPluginCall) {
        let status = EKEventStore.authorizationStatus(for: .event)
        var granted = status == .authorized
        if #available(iOS 17.0, *) {
            granted = granted || status == .fullAccess
        }
        call.resolve(["granted": granted, "status": authStatusToString(status)])
    }
    
    @objc func requestPermission(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents { granted, error in
                DispatchQueue.main.async {
                    if let error = error {
                        call.reject("Failed to request permission: \(error.localizedDescription)")
                        return
                    }
                    call.resolve(["granted": granted])
                }
            }
        } else {
            eventStore.requestAccess(to: .event) { granted, error in
                DispatchQueue.main.async {
                    if let error = error {
                        call.reject("Failed to request permission: \(error.localizedDescription)")
                        return
                    }
                    call.resolve(["granted": granted])
                }
            }
        }
    }
    
    /// Widgets the user has actually placed (Home Screen, Lock Screen, StandBy).
    /// Snapshot, not a subscription — call it on foreground, since the widget is
    /// added while the app is in the background.
    ///
    /// Note: unreliable in the Simulator, which often reports an empty list even
    /// with a widget placed. Verify on device.
    @objc func getInstalledWidgets(_ call: CAPPluginCall) {
        WidgetCenter.shared.getCurrentConfigurations { result in
            switch result {
            case .success(let widgets):
                call.resolve([
                    "count": widgets.count,
                    "families": widgets.map { String(describing: $0.family) }
                ])
            case .failure:
                // "Can't tell" behaves as "none" — the caller only ever uses this
                // to celebrate a success, never to block anything.
                call.resolve(["count": 0, "families": []])
            }
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
                if UIApplication.shared.canOpenURL(settingsUrl) {
                    UIApplication.shared.open(settingsUrl, options: [:]) { success in
                        call.resolve(["opened": success])
                    }
                } else {
                    call.reject("Cannot open Settings")
                }
            } else {
                call.reject("Invalid Settings URL")
            }
        }
    }
    
    @objc func getCalendars(_ call: CAPPluginCall) {
        let calendars = eventStore.calendars(for: .event)
        let calendarData = calendars.map { calendar -> [String: Any] in
            return [
                "id": calendar.calendarIdentifier,
                "title": calendar.title,
                "type": calendarTypeToString(calendar.type),
                "color": colorToHex(calendar.cgColor)
            ]
        }
        call.resolve(["calendars": calendarData])
    }
    
    /// Get recurring events (birthdays, anniversaries) within a date range
    @objc func getRecurringEvents(_ call: CAPPluginCall) {
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing startDate or endDate parameters")
            return
        }
        
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let startDate = dateFormatter.date(from: startDateString) ?? ISO8601DateFormatter().date(from: startDateString),
              let endDate = dateFormatter.date(from: endDateString) ?? ISO8601DateFormatter().date(from: endDateString) else {
            call.reject("Invalid date format. Use ISO8601 format.")
            return
        }
        
        let calendars = eventStore.calendars(for: .event)
        let predicate = eventStore.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
        let events = eventStore.events(matching: predicate)

        var recurringEvents: [[String: Any]] = []
        var seenEventIds = Set<String>()

        for event in events {
            let eventKey = "\(event.title ?? "")-\(event.startDate?.description ?? "")"
            if seenEventIds.contains(eventKey) {
                continue
            }
            
            var isYearlyRecurring = false
            var recurrenceRule: String? = nil

            if let rules = event.recurrenceRules {
                for rule in rules where rule.frequency == .yearly {
                    isYearlyRecurring = true
                    recurrenceRule = rule.interval > 1 ? "FREQ=YEARLY;INTERVAL=\(rule.interval)" : "FREQ=YEARLY"
                    break
                }
            }

            let isBirthdayCalendar = event.calendar.type == .birthday

            if isYearlyRecurring || isBirthdayCalendar {
                seenEventIds.insert(eventKey)
                
                let eventData: [String: Any] = [
                    "id": event.eventIdentifier ?? UUID().uuidString,
                    "title": event.title ?? "Untitled",
                    "startDate": dateFormatter.string(from: event.startDate),
                    "endDate": event.endDate != nil ? dateFormatter.string(from: event.endDate) : "",
                    "isAllDay": event.isAllDay,
                    "isRecurring": true,
                    "recurrenceRule": recurrenceRule ?? (isBirthdayCalendar ? "FREQ=YEARLY" : ""),
                    "calendarId": event.calendar.calendarIdentifier,
                    "calendarTitle": event.calendar.title,
                    "isBirthday": isBirthdayCalendar,
                    "notes": event.notes ?? ""
                ]
                recurringEvents.append(eventData)
            }
        }
        
        recurringEvents.sort { ($0["startDate"] as? String ?? "") < ($1["startDate"] as? String ?? "") }
        
        call.resolve(["events": recurringEvents])
    }
    
    /// Get ALL events (not just recurring) within a date range, optionally filtered by calendar
    @objc func getAllEvents(_ call: CAPPluginCall) {
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing startDate or endDate parameters")
            return
        }
        
        let calendarId = call.getString("calendarId")

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let startDate = dateFormatter.date(from: startDateString) ?? ISO8601DateFormatter().date(from: startDateString),
              let endDate = dateFormatter.date(from: endDateString) ?? ISO8601DateFormatter().date(from: endDateString) else {
            call.reject("Invalid date format. Use ISO8601 format.")
            return
        }

        var calendars: [EKCalendar]
        if let calId = calendarId, let calendar = eventStore.calendar(withIdentifier: calId) {
            calendars = [calendar]
        } else {
            calendars = eventStore.calendars(for: .event)
        }

        let predicate = eventStore.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
        let events = eventStore.events(matching: predicate)

        var allEvents: [[String: Any]] = []
        var seenEventIds = Set<String>()

        for event in events {
            let eventKey = "\(event.title ?? "")-\(event.startDate?.description ?? "")"
            if seenEventIds.contains(eventKey) { continue }
            seenEventIds.insert(eventKey)

            var isYearlyRecurring = false
            var recurrenceRule: String? = nil

            if let rules = event.recurrenceRules {
                for rule in rules where rule.frequency == .yearly {
                    isYearlyRecurring = true
                    recurrenceRule = rule.interval > 1 ? "FREQ=YEARLY;INTERVAL=\(rule.interval)" : "FREQ=YEARLY"
                    break
                }
            }

            let isBirthdayCalendar = event.calendar.type == .birthday
            
            let eventData: [String: Any] = [
                "id": event.eventIdentifier ?? UUID().uuidString,
                "title": event.title ?? "Untitled",
                "startDate": dateFormatter.string(from: event.startDate),
                "endDate": event.endDate != nil ? dateFormatter.string(from: event.endDate) : "",
                "isAllDay": event.isAllDay,
                "isRecurring": isYearlyRecurring || isBirthdayCalendar,
                "recurrenceRule": recurrenceRule ?? (isBirthdayCalendar ? "FREQ=YEARLY" : ""),
                "calendarId": event.calendar.calendarIdentifier,
                "calendarTitle": event.calendar.title,
                "isBirthday": isBirthdayCalendar,
                "notes": event.notes ?? ""
            ]
            allEvents.append(eventData)
        }
        
        allEvents.sort { ($0["startDate"] as? String ?? "") < ($1["startDate"] as? String ?? "") }
        
        call.resolve(["events": allEvents])
    }
    
    @objc func updateWidgetData(_ call: CAPPluginCall) {
        guard let eventsArray = call.getArray("events") as? [[String: Any]] else {
            call.reject("Missing events array")
            return
        }

        let appearanceMode = call.getString("appearanceMode") ?? "light"
        let countdownStyle = call.getString("countdownStyle") ?? "focus"
        let legacyTimeFormat = call.getBool("legacyTimeFormat") ?? false
        let appLanguage = call.getString("appLanguage") ?? "en"

        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            call.reject("Failed to access App Group storage")
            return
        }
        
        var cleanedEvents: [[String: Any]] = []
        for event in eventsArray {
            var cleanEvent: [String: Any] = [:]
            cleanEvent["id"] = event["id"] as? String ?? ""
            cleanEvent["title"] = event["title"] as? String ?? ""
            cleanEvent["targetDate"] = event["targetDate"] as? String ?? ""
            cleanEvent["emoji"] = event["emoji"] as? String ?? "📅"
            cleanEvent["emojiColor"] = event["emojiColor"] as? String
            cleanEvent["emojiShape"] = event["emojiShape"] as? String ?? "squircle"
            cleanEvent["isRecurring"] = event["isRecurring"] as? Bool ?? false
            cleanEvent["createdAt"] = event["createdAt"] as? String ?? ISO8601DateFormatter().string(from: Date())
            cleanEvent["hasTime"] = event["hasTime"] as? Bool ?? false
            cleanEvent["invertTimeFormat"] = event["invertTimeFormat"] as? Bool ?? false
            cleanedEvents.append(cleanEvent)
        }

        let stableWidgetData: [String: Any] = [
            "events": cleanedEvents,
            "appearanceMode": appearanceMode,
            "countdownStyle": countdownStyle,
            "legacyTimeFormat": legacyTimeFormat,
            "appLanguage": appLanguage
        ]
        
        do {
            let stableJsonData = try JSONSerialization.data(withJSONObject: stableWidgetData, options: [.sortedKeys])

            if let existingData = userDefaults.data(forKey: "widgetData"),
               let existingObject = try JSONSerialization.jsonObject(with: existingData) as? [String: Any] {
                let existingStableWidgetData: [String: Any] = [
                    "events": existingObject["events"] as? [[String: Any]] ?? [],
                    "appearanceMode": existingObject["appearanceMode"] as? String ?? "light",
                    "countdownStyle": existingObject["countdownStyle"] as? String ?? "focus",
                    "legacyTimeFormat": existingObject["legacyTimeFormat"] as? Bool ?? false,
                    "appLanguage": existingObject["appLanguage"] as? String ?? "en"
                ]
                let existingStableJsonData = try JSONSerialization.data(withJSONObject: existingStableWidgetData, options: [.sortedKeys])

                if existingStableJsonData == stableJsonData {
                    call.resolve(["success": true])
                    return
                }
            }

            // Store widget data as JSON
            let widgetData: [String: Any] = [
                "events": cleanedEvents,
                "appearanceMode": appearanceMode,
                "countdownStyle": countdownStyle,
                "legacyTimeFormat": legacyTimeFormat,
                "appLanguage": appLanguage,
                "lastUpdated": ISO8601DateFormatter().string(from: Date())
            ]
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData, options: [.prettyPrinted, .sortedKeys])
            userDefaults.set(jsonData, forKey: "widgetData")
            userDefaults.synchronize()

            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            
            call.resolve(["success": true])
        } catch {
            call.reject("Failed to serialize widget data: \(error.localizedDescription)")
        }
    }

    @objc func getWidgetData(_ call: CAPPluginCall) {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            call.reject("Failed to access App Group storage")
            return
        }

        guard let jsonData = userDefaults.data(forKey: "widgetData") else {
            call.resolve(["widgetData": NSNull()])
            return
        }

        do {
            let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options: [])
            if let widgetData = jsonObject as? [String: Any] {
                call.resolve(["widgetData": widgetData])
            } else {
                call.resolve(["widgetData": NSNull()])
            }
        } catch {
            call.reject("Failed to read widget data: \(error.localizedDescription)")
        }
    }

    
    // MARK: - Helper methods
    
    private func authStatusToString(_ status: EKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorized: return "authorized"
        default:
            if #available(iOS 17.0, *) {
                switch status {
                case .fullAccess: return "fullAccess"
                case .writeOnly: return "writeOnly"
                default: break
                }
            }
            return "unknown"
        }
    }
    
    private func calendarTypeToString(_ type: EKCalendarType) -> String {
        switch type {
        case .local:
            return "local"
        case .calDAV:
            return "calDAV"
        case .exchange:
            return "exchange"
        case .subscription:
            return "subscription"
        case .birthday:
            return "birthday"
        @unknown default:
            return "unknown"
        }
    }
    
    private func colorToHex(_ cgColor: CGColor?) -> String {
        guard let color = cgColor,
              let components = color.components,
              components.count >= 3 else {
            return "#000000"
        }
        
        let r = Int(components[0] * 255)
        let g = Int(components[1] * 255)
        let b = Int(components[2] * 255)
        
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}
