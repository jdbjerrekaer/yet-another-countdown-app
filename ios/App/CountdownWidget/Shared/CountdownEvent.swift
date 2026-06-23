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
    /// Whether the user set a specific time → include hours/minutes in the
    /// elapsed/remaining phrase. Optional + default so older synced payloads
    /// decode and existing CountdownEvent(...) call sites don't need updating.
    var hasTime: Bool? = nil

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
    
    /// Gets the number of times a yearly recurring event has occurred since the original date
    func getRepetitionCount() -> Int {
        guard isRecurring, let target = targetDateAsDate else {
            return 0
        }
        
        let calendar = Calendar.current
        let now = Date()
        let yearsDiff = calendar.dateComponents([.year], from: target, to: now).year ?? 0
        
        if yearsDiff < 0 {
            return 0
        }
        
        let targetComponents = calendar.dateComponents([.month, .day, .hour, .minute], from: target)
        var thisYearComponents = calendar.dateComponents([.year], from: now)
        thisYearComponents.month = targetComponents.month
        thisYearComponents.day = targetComponents.day
        thisYearComponents.hour = targetComponents.hour
        thisYearComponents.minute = targetComponents.minute
        
        guard let thisYearOccurrence = calendar.date(from: thisYearComponents) else {
            return yearsDiff
        }
        
        if now >= thisYearOccurrence || calendar.isDateInToday(thisYearOccurrence) {
            return yearsDiff + 1
        } else {
            return yearsDiff
        }
    }
    
    /// Gets the next occurrence number for a recurring event
    func getNextOccurrenceNumber() -> Int? {
        guard isRecurring else {
            return nil
        }
        
        return getRepetitionCount() + 1
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
    case classic
}

/// Container for all widget data synced from the React app
struct WidgetData: Codable {
    let events: [CountdownEvent]
    let appearanceMode: String
    let countdownStyle: String
    let lastUpdated: String?
    /// Mirror of the app's "days-only" Settings toggle. Optional → defaults off.
    let legacyTimeFormat: Bool?

    var appearanceModeEnum: WidgetAppearanceMode {
        WidgetAppearanceMode(rawValue: appearanceMode) ?? .light
    }
    
    var countdownStyleEnum: WidgetCountdownStyle {
        WidgetCountdownStyle(rawValue: countdownStyle) ?? .focus
    }
}

extension Int {
    var formattedWithoutSeparator: String {
        let formatter = NumberFormatter()
        formatter.usesGroupingSeparator = false
        return formatter.string(from: NSNumber(value: self)) ?? "\(self)"
    }
    
    var digitCount: Int {
        return String(abs(self)).count
    }
    
    func scaledFontSize(baseSize: CGFloat) -> CGFloat {
        switch digitCount {
        case 1: return baseSize
        case 2: return baseSize * 0.85
        case 3: return baseSize * 0.7
        case 4: return baseSize * 0.6
        default: return baseSize * 0.5
        }
    }
    
    func scaledUnitFontSize(baseSize: CGFloat) -> CGFloat {
        switch digitCount {
        case 1: return baseSize
        case 2: return baseSize * 0.9
        case 3: return baseSize * 0.8
        case 4: return baseSize * 0.7
        default: return baseSize * 0.65
        }
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
    
    static func calculate(from target: Date?, now: Date = Date()) -> CountdownTime {
        guard let target = target else {
            return CountdownTime(days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isComplete: false, daysSince: 0)
        }

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

/// Semantic elapsed/remaining phrase — mirrors the web app's relativeTime.ts so
/// the widget reads the same as the in-app cards ("1 year, 2 weeks, 3 days ago").
/// `legacy` collapses everything to whole days ("400 days ago"); `includeTime`
/// appends hours/minutes when the event has a specific time set.
enum RelativeTime {
    private struct Part { let value: Int; let unit: String }

    private static func parts(from: Date, to: Date, includeTime: Bool, legacy: Bool) -> [Part] {
        let cal = Calendar.current
        let start = includeTime ? from : cal.startOfDay(for: from)
        let end = includeTime ? to : cal.startOfDay(for: to)

        if legacy {
            let totalDays = cal.dateComponents([.day], from: start, to: end).day ?? 0
            var result: [Part] = []
            if totalDays > 0 { result.append(Part(value: totalDays, unit: "day")) }
            if includeTime {
                let afterDays = cal.date(byAdding: .day, value: totalDays, to: start) ?? start
                let t = cal.dateComponents([.hour, .minute], from: afterDays, to: end)
                if let h = t.hour, h > 0 { result.append(Part(value: h, unit: "hour")) }
                if let m = t.minute, m > 0 { result.append(Part(value: m, unit: "minute")) }
            }
            if result.isEmpty { result.append(Part(value: 0, unit: includeTime ? "minute" : "day")) }
            return result
        }

        let c = cal.dateComponents([.year, .month, .day, .hour, .minute], from: start, to: end)
        let totalDays = c.day ?? 0
        var result: [Part] = []
        if let y = c.year, y > 0 { result.append(Part(value: y, unit: "year")) }
        if let mo = c.month, mo > 0 { result.append(Part(value: mo, unit: "month")) }
        let weeks = totalDays / 7
        let days = totalDays % 7
        if weeks > 0 { result.append(Part(value: weeks, unit: "week")) }
        if days > 0 { result.append(Part(value: days, unit: "day")) }
        if includeTime {
            if let h = c.hour, h > 0 { result.append(Part(value: h, unit: "hour")) }
            if let m = c.minute, m > 0 { result.append(Part(value: m, unit: "minute")) }
        }
        if result.isEmpty { result.append(Part(value: 0, unit: includeTime ? "minute" : "day")) }
        return result
    }

    /// Localised-ish "x, y, z ago" / "... left". English-only here, matching the
    /// widget's existing hardcoded strings.
    static func phrase(target: Date, now: Date = Date(), includeTime: Bool, legacy: Bool) -> String {
        let isPast = target <= now
        let (from, to) = isPast ? (target, now) : (now, target)
        let joined = parts(from: from, to: to, includeTime: includeTime, legacy: legacy)
            .map { "\($0.value) \($0.unit)\($0.value == 1 ? "" : "s")" }
            .joined(separator: ", ")
        return isPast ? "\(joined) ago" : "\(joined) left"
    }
}
