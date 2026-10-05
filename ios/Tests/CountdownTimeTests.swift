import Foundation

// Run with TZ=Europe/Copenhagen (see package.json test:swift) so the DST case is real.
@main
struct CountdownTimeTests {
    static func date(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 0, _ min: Int = 0, _ s: Int = 0) -> Date {
        Calendar.current.date(from: DateComponents(year: y, month: m, day: d, hour: h, minute: min, second: s))!
    }

    /// The calendar-day count the list uses (RelativeTime.phrase with includeTime: false).
    static func listDays(_ target: Date, _ now: Date) -> Int {
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: now), to: cal.startOfDay(for: target)).day!
    }

    static func check(_ name: String, _ c: CountdownTime, days: Int, h: Int, m: Int, s: Int? = nil) {
        precondition(!c.isPast && !c.isComplete, "\(name): unexpected past/complete")
        precondition(c.days == days && c.hours == h && c.minutes == m && (s == nil || c.seconds == s!),
                     "\(name): got \(c.days)d \(c.hours)h \(c.minutes)m \(c.seconds)s, want \(days)d \(h)h \(m)m")
    }

    static func main() {
        // Date-only countdowns are stored at 08:00.
        let concert = date(2026, 10, 9, 8)

        // The reported case: after 08:00 the widget used to say 3 while the list said 4.
        let now1 = date(2026, 10, 5, 11, 10)
        check("after 08:00", CountdownTime.calculate(from: concert, now: now1, allDay: true), days: 4, h: 12, m: 50)
        precondition(listDays(concert, now1) == 4)

        check("before 08:00", CountdownTime.calculate(from: concert, now: date(2026, 10, 5, 7)), days: 4, h: 1, m: 0) // old path, unchanged
        check("before 08:00 all-day", CountdownTime.calculate(from: concert, now: date(2026, 10, 5, 7), allDay: true), days: 4, h: 17, m: 0)
        check("exactly midnight", CountdownTime.calculate(from: concert, now: date(2026, 10, 5), allDay: true), days: 4, h: 23, m: 59, s: 59)
        check("one second to midnight", CountdownTime.calculate(from: concert, now: date(2026, 10, 5, 23, 59, 59), allDay: true), days: 4, h: 0, m: 0, s: 1)
        check("day before, late", CountdownTime.calculate(from: concert, now: date(2026, 10, 8, 23, 59), allDay: true), days: 1, h: 0, m: 1)

        // On the day itself: complete ("Today"), with or without a time.
        precondition(CountdownTime.calculate(from: concert, now: date(2026, 10, 9, 6), allDay: true).isComplete)
        precondition(CountdownTime.calculate(from: concert, now: date(2026, 10, 9, 23), allDay: true).isComplete)

        // Count-up: calendar days, matching the list's "N days ago" (old code said 22 before 08:00).
        let quit = date(2026, 9, 12, 8)
        let past = CountdownTime.calculate(from: quit, now: date(2026, 10, 5, 7), allDay: true)
        precondition(past.isPast && past.daysSince == 23, "count-up before 08:00: \(past.daysSince)")
        precondition(CountdownTime.calculate(from: quit, now: date(2026, 10, 5, 11), allDay: true).daysSince == 23)

        // With a time set, nothing changes: exact countdown to that moment.
        check("timed countdown", CountdownTime.calculate(from: concert, now: now1, allDay: false), days: 3, h: 20, m: 50)

        // DST ends 25 Oct 2026 in Copenhagen (a 25-hour day).
        let afterDST = date(2026, 10, 26, 8)
        check("across DST", CountdownTime.calculate(from: afterDST, now: date(2026, 10, 24, 12), allDay: true), days: 2, h: 12, m: 0)
        precondition(listDays(afterDST, date(2026, 10, 24, 12)) == 2)
        check("on the 25h day", CountdownTime.calculate(from: afterDST, now: date(2026, 10, 25, 1), allDay: true), days: 1, h: 23, m: 0)

        // New Year.
        check("new year", CountdownTime.calculate(from: date(2027, 1, 1, 8), now: date(2026, 12, 31, 23), allDay: true), days: 1, h: 1, m: 0)

        // The day count always equals the list's count, at every hour of a week.
        var t = date(2026, 10, 1)
        while t < date(2026, 10, 9) {
            let c = CountdownTime.calculate(from: concert, now: t, allDay: true)
            precondition(c.days == listDays(concert, t), "mismatch at \(t): \(c.days) vs \(listDays(concert, t))")
            t = t.addingTimeInterval(1800)
        }

        print("CountdownTime tests passed")
    }
}
