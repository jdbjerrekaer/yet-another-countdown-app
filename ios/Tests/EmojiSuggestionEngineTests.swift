import Foundation

@main
struct EmojiSuggestionEngineTests {
    static func main() {
        let engine = EmojiSuggestionEngine(dataDirectory: URL(fileURLWithPath: "public/emoji"))

        // Mirrors src/lib/emojiSuggestions.test.ts — both engines must agree.
        let cases: [(String, String, String)] = [
            ("en", "Mom's birthday", "🎂"), ("en", "Trip to Japan", "✈️"), ("en", "Exam", "📝"),
            ("en", "Payday", "💰"), ("en", "Moving day", "📦"), ("en", "Due date", "👶"),
            ("da", "Sommerferie", "🏖️"), ("da", "Terminsprøve", "📝"), ("da", "Løn", "💰"), ("da", "Termin", "👶"),
            ("da", "Fodboldkamp", "⚽"), ("da", "Snusfri", "🚭"), ("de", "Umzug", "📦"), ("de", "Sommerurlaub", "🏖️"),
            ("es", "Vacaciones en la playa", "🏖️"), ("it", "Esame di maturità", "🎓"), ("fr", "Déménagement", "📦"),
            ("ru", "День рождения мамы", "🎂"), ("sv", "Lönedag", "💰"), ("no", "Hyttetur", "🏕️"),
            ("fi", "Hammaslääkäri", "🦷"), ("da", "Wedding", "💒"), ("pt", "Festa em casa", "🎉"),
        ]
        for (lang, title, expected) in cases {
            let got = engine.suggestions(for: title, language: lang, limit: 1).first
            precondition(got == expected, "[\(lang)] \(title): expected \(expected), got \(got ?? "nil")")
        }
        precondition(!engine.suggestions(for: "Trip to Japan", language: "en", limit: 5).contains("🇹🇴"))

        // Semantic fallback: only fires under the distance cutoff, only en/de/fr.
        precondition(engine.semanticEmoji(for: "Honeymoon", language: "en") == "💒")
        precondition(engine.semanticEmoji(for: "Kindergarten", language: "en") == "📚")
        precondition(engine.semanticEmoji(for: "Promotion", language: "en") == nil, "weak match must stay silent")
        precondition(engine.semanticEmoji(for: "Børnehave", language: "da") == nil, "no Danish embedding")
        precondition(engine.suggestEmoji(for: "Honeymoon", language: "en") != EmojiSuggestionEngine.fallbackEmoji)
        print("EmojiSuggestionEngine: \(cases.count + 6) checks passed")
    }
}
