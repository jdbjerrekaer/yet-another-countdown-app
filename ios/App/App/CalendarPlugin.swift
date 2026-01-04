import Foundation
import Capacitor
import EventKit

@objc(CalendarPlugin)
public class CalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CalendarPlugin"
    public let jsName = "CalendarPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRecurringEvents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCalendars", returnType: CAPPluginReturnPromise)
    ]
    
    private let eventStore = EKEventStore()
    
    /// Check if calendar permission is granted
    @objc func checkPermission(_ call: CAPPluginCall) {
        let status = EKEventStore.authorizationStatus(for: .event)
        let granted = status == .authorized || status == .fullAccess
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
        case .fullAccess:
            return "fullAccess"
        case .writeOnly:
            return "writeOnly"
        @unknown default:
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
