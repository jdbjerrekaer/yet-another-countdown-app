import Foundation

/// Countdown event model matching the TypeScript CountdownEvent interface
struct CountdownEvent: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let targetDate: String
    let emoji: String
    let emojiColor: String?
    /// Shape of the colored emoji container ("squircle"/"heart"/"flower").
    /// Optional + default so older synced payloads decode and existing
    /// CountdownEvent(...) call sites don't need updating; missing → squircle.
    var emojiShape: String? = nil
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
    /// The app's chosen language (e.g. "da") so the widget localises to match.
    let appLanguage: String?

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
    // "%@ ago" / "%@ left" / "Today" per language. Pulled from the app's own
    // translations so the widget reads the same as the in-app cards. Word order
    // (prefix vs suffix) is baked into each template.
    private static let TEMPLATES: [String: (ago: String, left: String, today: String)] = [
        "en": ("%@ ago", "%@ left", "Today! 🎉"),
        "da": ("%@ siden", "%@ tilbage", "I dag! 🎉"),
        "de": ("vor %@", "noch %@", "Heute! 🎉"),
        "es": ("hace %@", "en %@", "¡Hoy! 🎉"),
        "fi": ("%@ sitten", "%@ jäljellä", "Tänään! 🎉"),
        "fr": ("il y a %@", "dans %@", "Aujourd'hui ! 🎉"),
        "it": ("%@ fa", "tra %@", "Oggi! 🎉"),
        "no": ("%@ siden", "%@ igjen", "I dag! 🎉"),
        "pt": ("há %@", "em %@", "Hoje! 🎉"),
        "ru": ("%@ назад", "через %@", "Сегодня! 🎉"),
        "sv": ("%@ sedan", "%@ kvar", "Idag! 🎉"),
    ]

    // Short unit headers shown under the live-countdown numbers (focus/classic).
    private static let LABELS: [String: [String: String]] = [
        "en": ["days": "Days", "hours": "Hours", "min": "Min", "next": "Next"],
        "da": ["days": "Dage", "hours": "Timer", "min": "Min", "next": "Næste"],
        "de": ["days": "Tage", "hours": "Std", "min": "Min", "next": "Nächstes"],
        "es": ["days": "Días", "hours": "Horas", "min": "Min", "next": "Próximo"],
        "fi": ["days": "Päivää", "hours": "Tuntia", "min": "Min", "next": "Seuraava"],
        "fr": ["days": "Jours", "hours": "Heures", "min": "Min", "next": "Prochain"],
        "it": ["days": "Giorni", "hours": "Ore", "min": "Min", "next": "Prossimo"],
        "no": ["days": "Dager", "hours": "Timer", "min": "Min", "next": "Neste"],
        "pt": ["days": "Dias", "hours": "Horas", "min": "Min", "next": "Próximo"],
        "ru": ["days": "Дней", "hours": "Часов", "min": "Мин", "next": "Следующее"],
        "sv": ["days": "Dagar", "hours": "Tim", "min": "Min", "next": "Nästa"],
    ]

    private static func tmpl(_ lang: String) -> (ago: String, left: String, today: String) {
        TEMPLATES[lang] ?? TEMPLATES[String(lang.prefix(2))] ?? TEMPLATES["en"]!
    }

    static func todayText(_ lang: String) -> String { tmpl(lang).today }

    static func label(_ key: String, _ lang: String) -> String {
        (LABELS[lang] ?? LABELS[String(lang.prefix(2))] ?? LABELS["en"]!)[key] ?? key
    }

    // DateComponentsFormatter gives correctly localised, correctly pluralised
    // unit strings (incl. Russian's complex plurals) for free.
    private static func durationString(from: Date, to: Date, units: NSCalendar.Unit,
                                       style: DateComponentsFormatter.UnitsStyle,
                                       maxUnits: Int, lang: String) -> String {
        let f = DateComponentsFormatter()
        f.unitsStyle = style
        f.allowedUnits = units
        f.maximumUnitCount = maxUnits
        f.zeroFormattingBehavior = .dropAll
        var cal = Calendar(identifier: .gregorian)
        cal.locale = Locale(identifier: lang)
        f.calendar = cal
        let s = f.string(from: from, to: to) ?? ""
        return s.isEmpty ? "0" : s
    }

    /// Full "2 years, 4 months, 3 weeks left" — localised, zero-suppressed,
    /// capped at 3 units. `legacy` collapses to whole days; `includeTime` adds h/m.
    static func phrase(target: Date, now: Date = Date(), includeTime: Bool, legacy: Bool, lang: String) -> String {
        let isPast = target <= now
        let (a, b) = isPast ? (target, now) : (now, target)
        let cal = Calendar.current
        let from = includeTime ? a : cal.startOfDay(for: a)
        let to = includeTime ? b : cal.startOfDay(for: b)
        let units: NSCalendar.Unit
        if legacy {
            units = includeTime ? [.day, .hour, .minute] : [.day]
        } else {
            units = includeTime ? [.year, .month, .weekOfMonth, .day, .hour, .minute]
                                 : [.year, .month, .weekOfMonth, .day]
        }
        let dur = durationString(from: from, to: to, units: units, style: .full, maxUnits: 3, lang: lang)
        let t = tmpl(lang)
        let full = String(format: isPast ? t.ago : t.left, dur)
        // Keep each "5 days"/"days left" pair on one line; only allow wrapping at
        // the comma boundaries between units (DCF separates units with ", ").
        let nbsp = "\u{00A0}"
        return full.replacingOccurrences(of: " ", with: nbsp)
                   .replacingOccurrences(of: ",\(nbsp)", with: ", ")
    }

    /// Ultra-compact "2w 6d left" / "3mo 2w 1d ago" — single-letter units, capped
    /// at 3, for the tight lock-screen rectangular accessory. Units (y/mo/w/d/h/m)
    /// are kept universal; only the ago/left wrapper is localized.
    static func compactPhrase(target: Date, now: Date = Date(), includeTime: Bool, legacy: Bool, lang: String) -> String {
        let isPast = target <= now
        let (a, b) = isPast ? (target, now) : (now, target)
        let cal = Calendar.current
        let from = includeTime ? a : cal.startOfDay(for: a)
        let to = includeTime ? b : cal.startOfDay(for: b)
        var pieces: [String] = []
        if legacy {
            let totalDays = cal.dateComponents([.day], from: from, to: to).day ?? 0
            if totalDays > 0 { pieces.append("\(totalDays)d") }
            if includeTime {
                let after = cal.date(byAdding: .day, value: totalDays, to: from) ?? from
                let t = cal.dateComponents([.hour, .minute], from: after, to: to)
                if let h = t.hour, h > 0 { pieces.append("\(h)h") }
                if let m = t.minute, m > 0 { pieces.append("\(m)m") }
            }
        } else {
            let c = cal.dateComponents([.year, .month, .day, .hour, .minute], from: from, to: to)
            if let y = c.year, y > 0 { pieces.append("\(y)y") }
            if let mo = c.month, mo > 0 { pieces.append("\(mo)mo") }
            let totalDays = c.day ?? 0
            let weeks = totalDays / 7
            let days = totalDays % 7
            if weeks > 0 { pieces.append("\(weeks)w") }
            if days > 0 { pieces.append("\(days)d") }
            if includeTime {
                if let h = c.hour, h > 0 { pieces.append("\(h)h") }
                if let m = c.minute, m > 0 { pieces.append("\(m)m") }
            }
        }
        if pieces.isEmpty { pieces.append("0d") }
        let count = min(pieces.count, 3)
        // 1–2 units → room to spell it out ("1 week", "1 week, 3 days");
        // 3 units → stay single-letter ("1mo 2w 5d") so it fits the accessory.
        let body: String
        if count <= 2 {
            let units: NSCalendar.Unit = legacy
                ? (includeTime ? [.day, .hour, .minute] : [.day])
                : (includeTime ? [.year, .month, .weekOfMonth, .day, .hour, .minute]
                               : [.year, .month, .weekOfMonth, .day])
            body = durationString(from: from, to: to, units: units, style: .full, maxUnits: count, lang: lang)
        } else {
            body = pieces.prefix(3).joined(separator: " ")
        }
        // Lock screen stays terse: only the past gets an "ago" suffix; upcoming
        // shows the bare duration (no "left") since the date line implies it.
        return isPast ? String(format: tmpl(lang).ago, body) : body
    }

    /// Compact single-unit "5d" / "5d ago" for the tiny lock-screen accessories.
    static func shortPhrase(target: Date, now: Date = Date(), lang: String) -> String {
        let isPast = target <= now
        let (a, b) = isPast ? (target, now) : (now, target)
        let dur = durationString(from: a, to: b, units: [.day, .hour, .minute],
                                 style: .abbreviated, maxUnits: 1, lang: lang)
        return isPast ? String(format: tmpl(lang).ago, dur) : dur
    }
}
