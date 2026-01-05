import Foundation

/// Countdown event model matching the TypeScript CountdownEvent interface
struct CountdownEvent: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let targetDate: String
    let emoji: String
    let emojiColor: String?
    let isRecurring: Bool
    let createdAt: String
    
    /// Parse the targetDate string to a Date object
    var targetDateAsDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: targetDate) ?? ISO8601DateFormatter().date(from: targetDate)
    }
    
    /// Parse the createdAt string to a Date object
    var createdAtAsDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt)
    }
    
    /// Get the next recurring date for yearly recurring events
    func getNextRecurringDate() -> Date? {
        guard isRecurring, let target = targetDateAsDate else {
            return targetDateAsDate
        }
        
        let calendar = Calendar.current
        let now = Date()
        
        // Get the month and day of the original date
        let components = calendar.dateComponents([.month, .day, .hour, .minute], from: target)
        
        // Try this year first
        var nextComponents = calendar.dateComponents([.year], from: now)
        nextComponents.month = components.month
        nextComponents.day = components.day
        nextComponents.hour = components.hour
        nextComponents.minute = components.minute
        
        if let thisYear = calendar.date(from: nextComponents) {
            // If this year's occurrence has passed, use next year
            if thisYear > now {
                return thisYear
            }
            
            // Check if it's today
            if calendar.isDateInToday(thisYear) {
                return thisYear
            }
            
            // Use next year
            nextComponents.year = (nextComponents.year ?? 0) + 1
            return calendar.date(from: nextComponents)
        }
        
        return target
    }
}

/// Widget appearance modes
enum WidgetAppearanceMode: String, Codable {
    case light
    case dark
    case transparent
    case tinted
}

/// Widget countdown styles
enum WidgetCountdownStyle: String, Codable {
    case focus
    case visual
}

/// Container for all widget data synced from the React app
struct WidgetData: Codable {
    let events: [CountdownEvent]
    let appearanceMode: String
    let countdownStyle: String
    let lastUpdated: String?
    
    var appearanceModeEnum: WidgetAppearanceMode {
        WidgetAppearanceMode(rawValue: appearanceMode) ?? .light
    }
    
    var countdownStyleEnum: WidgetCountdownStyle {
        WidgetCountdownStyle(rawValue: countdownStyle) ?? .focus
    }
}

/// Countdown time calculation result
struct CountdownTime {
    let days: Int
    let hours: Int
    let minutes: Int
    let seconds: Int
    let isPast: Bool
    let isComplete: Bool
    let daysSince: Int
    
    static func calculate(from target: Date?) -> CountdownTime {
        guard let target = target else {
            return CountdownTime(days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isComplete: false, daysSince: 0)
        }
        
        let now = Date()
        let calendar = Calendar.current
        
        // Check if it's today
        if calendar.isDateInToday(target) {
            return CountdownTime(days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isComplete: true, daysSince: 0)
        }
        
        let isPast = target < now
        
        if isPast {
            // Calculate days since
            let components = calendar.dateComponents([.day], from: target, to: now)
            let daysSince = components.day ?? 0
            return CountdownTime(days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isComplete: false, daysSince: daysSince)
        } else {
            // Calculate time remaining
            let components = calendar.dateComponents([.day, .hour, .minute, .second], from: now, to: target)
            return CountdownTime(
                days: components.day ?? 0,
                hours: components.hour ?? 0,
                minutes: components.minute ?? 0,
                seconds: components.second ?? 0,
                isPast: false,
                isComplete: false,
                daysSince: 0
            )
        }
    }
}
