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
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]
    
    /// App Group identifier for sharing data with widgets
    private let appGroupIdentifier = "group.countdown.timer.data"
    
    private let eventStore = EKEventStore()
    
    /// Check if calendar permission is granted
    @objc func checkPermission(_ call: CAPPluginCall) {
        let status = EKEventStore.authorizationStatus(for: .event)
        var granted = status == .authorized
        if #available(iOS 17.0, *) {
            granted = granted || status == .fullAccess
        }
        call.resolve(["granted": granted, "status": authStatusToString(status)])
    }
    
    /// Request calendar access permission
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
    
    /// Open the iOS Settings app
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
    
    /// Get list of calendars
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
        
        // Get all calendars including the Birthdays calendar
        let calendars = eventStore.calendars(for: .event)
        
        // Create predicate for events
        let predicate = eventStore.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
        let events = eventStore.events(matching: predicate)
        
        // Filter for recurring events (yearly recurrence like birthdays/anniversaries)
        var recurringEvents: [[String: Any]] = []
        var seenEventIds = Set<String>()
        
        for event in events {
            // Skip duplicates (recurring events may appear multiple times)
            let eventKey = "\(event.title ?? "")-\(event.startDate?.description ?? "")"
            if seenEventIds.contains(eventKey) {
                continue
            }
            
            // Check if event is recurring
            var isYearlyRecurring = false
            var recurrenceRule: String? = nil
            
            if let rules = event.recurrenceRules {
                for rule in rules {
                    if rule.frequency == .yearly {
                        isYearlyRecurring = true
                        recurrenceRule = "FREQ=YEARLY"
                        if rule.interval > 1 {
                            recurrenceRule = "FREQ=YEARLY;INTERVAL=\(rule.interval)"
                        }
                        break
                    }
                }
            }
            
            // Also check if it's from the Birthdays calendar
            let isBirthdayCalendar = event.calendar.type == .birthday
            
            // Include event if it's yearly recurring or from birthdays calendar
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
        
        // Sort by start date
        recurringEvents.sort { event1, event2 in
            let date1 = event1["startDate"] as? String ?? ""
            let date2 = event2["startDate"] as? String ?? ""
            return date1 < date2
        }
        
        call.resolve(["events": recurringEvents])
    }
    
    /// Get ALL events (not just recurring) within a date range, optionally filtered by calendar
    @objc func getAllEvents(_ call: CAPPluginCall) {
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing startDate or endDate parameters")
            return
        }
        
        let calendarId = call.getString("calendarId") // Optional: filter by specific calendar
        
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let startDate = dateFormatter.date(from: startDateString) ?? ISO8601DateFormatter().date(from: startDateString),
              let endDate = dateFormatter.date(from: endDateString) ?? ISO8601DateFormatter().date(from: endDateString) else {
            call.reject("Invalid date format. Use ISO8601 format.")
            return
        }
        
        // Get calendars - either specific one or all
        var calendars: [EKCalendar]
        if let calId = calendarId, let calendar = eventStore.calendar(withIdentifier: calId) {
            calendars = [calendar]
        } else {
            calendars = eventStore.calendars(for: .event)
        }
        
        // Create predicate for events
        let predicate = eventStore.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
        let events = eventStore.events(matching: predicate)
        
        // Convert all events (not filtering for recurring)
        var allEvents: [[String: Any]] = []
        var seenEventIds = Set<String>()
        
        for event in events {
            // Skip duplicates
            let eventKey = "\(event.title ?? "")-\(event.startDate?.description ?? "")"
            if seenEventIds.contains(eventKey) {
                continue
            }
            seenEventIds.insert(eventKey)
            
            // Check if event is recurring
            var isYearlyRecurring = false
            var recurrenceRule: String? = nil
            
            if let rules = event.recurrenceRules {
                for rule in rules {
                    if rule.frequency == .yearly {
                        isYearlyRecurring = true
                        recurrenceRule = "FREQ=YEARLY"
                        if rule.interval > 1 {
                            recurrenceRule = "FREQ=YEARLY;INTERVAL=\(rule.interval)"
                        }
                        break
                    }
                }
            }
            
            // Check if from Birthdays calendar
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
        
        // Sort by start date
        allEvents.sort { event1, event2 in
            let date1 = event1["startDate"] as? String ?? ""
            let date2 = event2["startDate"] as? String ?? ""
            return date1 < date2
        }
        
        call.resolve(["events": allEvents])
    }
    
    /// Update widget data in shared App Group storage
    @objc func updateWidgetData(_ call: CAPPluginCall) {
        guard let eventsArray = call.getArray("events") as? [[String: Any]] else {
            print("CalendarPlugin: Missing events array in updateWidgetData call")
            call.reject("Missing events array")
            return
        }
        
        let appearanceMode = call.getString("appearanceMode") ?? "light"
        let countdownStyle = call.getString("countdownStyle") ?? "focus"
        
        print("CalendarPlugin: Received \(eventsArray.count) events, appearance: \(appearanceMode), style: \(countdownStyle)")
        
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("CalendarPlugin: FAILED to access App Group with identifier: \(appGroupIdentifier)")
            call.reject("Failed to access App Group storage")
            return
        }
        
        print("CalendarPlugin: Successfully accessed App Group: \(appGroupIdentifier)")
        
        // Convert events array - ensure all values are proper types for JSON encoding
        var cleanedEvents: [[String: Any]] = []
        for event in eventsArray {
            var cleanEvent: [String: Any] = [:]
            cleanEvent["id"] = event["id"] as? String ?? ""
            cleanEvent["title"] = event["title"] as? String ?? ""
            cleanEvent["targetDate"] = event["targetDate"] as? String ?? ""
            cleanEvent["emoji"] = event["emoji"] as? String ?? "📅"
            cleanEvent["emojiColor"] = event["emojiColor"] as? String
            cleanEvent["isRecurring"] = event["isRecurring"] as? Bool ?? false
            cleanEvent["createdAt"] = event["createdAt"] as? String ?? ISO8601DateFormatter().string(from: Date())
            cleanedEvents.append(cleanEvent)
            print("CalendarPlugin: Event - \(cleanEvent["title"] ?? "unknown") targeting \(cleanEvent["targetDate"] ?? "unknown")")
        }
        
        // Store widget data as JSON
        let widgetData: [String: Any] = [
            "events": cleanedEvents,
            "appearanceMode": appearanceMode,
            "countdownStyle": countdownStyle,
            "lastUpdated": ISO8601DateFormatter().string(from: Date())
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData, options: [.prettyPrinted])
            userDefaults.set(jsonData, forKey: "widgetData")
            userDefaults.synchronize()
            
            print("CalendarPlugin: Saved \(jsonData.count) bytes to App Group")
            
            // Verify the data was saved
            if let verifyData = userDefaults.data(forKey: "widgetData") {
                print("CalendarPlugin: Verified data exists: \(verifyData.count) bytes")
            } else {
                print("CalendarPlugin: WARNING - Data verification failed!")
            }
            
            // Reload widgets to reflect new data
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
                print("CalendarPlugin: Requested widget timeline reload")
            }
            
            call.resolve(["success": true])
        } catch {
            print("CalendarPlugin: Failed to serialize: \(error)")
            call.reject("Failed to serialize widget data: \(error.localizedDescription)")
        }
    }

    /// Read widget data from shared App Group storage
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
        case .notDetermined:
            return "notDetermined"
        case .restricted:
            return "restricted"
        case .denied:
            return "denied"
        case .authorized:
            return "authorized"
        @unknown default:
            // Handle iOS 17+ cases (fullAccess, writeOnly) via raw value check
            if #available(iOS 17.0, *) {
                if status == .fullAccess {
                    return "fullAccess"
                } else if status == .writeOnly {
                    return "writeOnly"
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
