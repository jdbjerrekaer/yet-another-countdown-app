import Foundation
import NaturalLanguage

/// Emoji suggestions for a countdown title — native twin of src/lib/emojiSuggestions.ts
/// (keep the matching rules in sync). Used by Siri/Shortcuts, and by the web app
/// through EmojiSemanticPlugin for the on-device semantic fallback.
///
/// Reads the same files the web app fetches, bundled under public/emoji/:
///  - keywords.json: event-word map, all 11 app languages
///  - <lang>.json: emojibase labels + tags (scripts/build-emoji-data.mjs)
final class EmojiSuggestionEngine {
    static let shared = EmojiSuggestionEngine()

    static let fallbackEmoji = "🎯"
    static let languages = ["en", "es", "it", "pt", "de", "ru", "fr", "da", "sv", "no", "fi"]

    /// Apple ships word embeddings for these app languages only (measured on iOS/macOS 26).
    private static let embeddingLanguages: [String: NLLanguage] = ["en": .english, "de": .german, "fr": .french]
    /// Cosine distance cutoff for the semantic fallback. Held-out test: every
    /// match under 0.95 was right; wrong guesses sat at 1.0+.
    static let semanticMaxDistance = 0.95

    private static let stopwords: Set<String> = [
        "the", "and", "for", "with", "from", "our", "your", "day", "days", "date", "time", "next", "first", "last", "week", "year",
        "los", "las", "del", "con", "para", "por", "una", "dia", "della", "per", "giorno", "das", "dos", "com", "uma",
        "der", "die", "und", "mit", "von", "zum", "zur", "ein", "eine", "tag", "для", "это", "день",
        "les", "des", "une", "pour", "avec", "jour", "med", "til", "fra", "den", "det", "dag", "min", "mit", "vores", "hos",
        "och", "till", "fran", "mitt", "kanssa", "paiva",
    ]

    private struct Keyword { let emoji: String; let lang: String; let kw: String; let raw: String; let phrase: Bool }
    private struct Entry { let unicode: String; let order: Int }

    private let dataDirectory: URL?
    private var keywords: [Keyword]?
    private var datasets: [String: [String: [Entry]]] = [:]
    private let lock = NSLock()

    init(dataDirectory: URL? = Bundle.main.resourceURL?.appendingPathComponent("public/emoji")) {
        self.dataDirectory = dataDirectory
    }

    // MARK: - Public API

    /// Best single emoji for a title: keyword layers first, then the semantic fallback.
    func suggestEmoji(for title: String, language: String? = nil) -> String {
        let lang = language ?? Self.appLanguage()
        return suggestions(for: title, language: lang, limit: 1).first
            ?? semanticEmoji(for: title, language: lang)
            ?? Self.fallbackEmoji
    }

    func suggestions(for title: String, language: String, limit: Int = 12) -> [String] {
        let titleWords = Self.words(title)
        guard !titleWords.isEmpty else { return [] }
        lock.lock(); defer { lock.unlock() }

        let fromMap = keywordMatches(titleWords, lang: language)
        var fromData = datasetResults(titleWords, lang: language)
        if fromData.isEmpty && language != "en" { fromData = datasetResults(titleWords, lang: "en") }

        var seen = Set<String>()
        return (fromMap + fromData).filter { seen.insert($0).inserted }.prefix(limit).map { $0 }
    }

    /// Nearest event word by meaning, via Apple's on-device word embeddings.
    /// Only English, German and French have one; other languages return nil.
    func semanticEmoji(for title: String, language: String) -> String? {
        guard let nlLang = Self.embeddingLanguages[language],
              let embedding = NLEmbedding.wordEmbedding(for: nlLang) else { return nil }
        lock.lock()
        // Embeddings are keyed by accented words ("école"), so use the raw forms here.
        let candidates = loadKeywords().filter { $0.lang == language && !$0.phrase && embedding.contains($0.raw) }
        lock.unlock()

        var best: (emoji: String, distance: Double)?
        let rawWords = title.lowercased().components(separatedBy: CharacterSet.letters.inverted).filter { !$0.isEmpty }
        for word in rawWords where word.count >= 3 && !Self.stopwords.contains(Self.normalize(word)) && embedding.contains(word) {
            for c in candidates {
                let d = embedding.distance(between: word, and: c.raw)
                if d < (best?.distance ?? .infinity) { best = (c.emoji, d) }
            }
        }
        guard let best, best.distance < Self.semanticMaxDistance else { return nil }
        return best.emoji
    }

    /// The language picked in the app (Capacitor Preferences → UserDefaults), else the device's.
    static func appLanguage() -> String {
        let stored = UserDefaults.standard.string(forKey: "CapacitorStorage.app_language")
        var lang = String((stored ?? Locale.preferredLanguages.first ?? "en").prefix(2)).lowercased()
        if lang == "nb" || lang == "nn" { lang = "no" }
        return languages.contains(lang) ? lang : "en"
    }

    // MARK: - Matching (mirrors emojiSuggestions.ts)

    static func normalize(_ s: String) -> String {
        let scalars = s.decomposedStringWithCanonicalMapping.unicodeScalars.filter {
            $0.properties.generalCategory != .nonspacingMark
        }
        return String(String.UnicodeScalarView(scalars)).lowercased()
    }

    static func words(_ s: String) -> [String] {
        normalize(s).components(separatedBy: CharacterSet.letters.union(.decimalDigits).inverted).filter { !$0.isEmpty }
    }

    private func keywordMatches(_ titleWords: [String], lang: String) -> [String] {
        var scores: [String: Int] = [:]
        var firstSeen: [String: Int] = [:]
        let joined = " \(titleWords.joined(separator: " ")) "
        func bump(_ emoji: String, _ s: Int) {
            if firstSeen[emoji] == nil { firstSeen[emoji] = firstSeen.count }
            scores[emoji] = max(scores[emoji] ?? 0, s)
        }

        for k in loadKeywords() {
            let same = k.lang == lang
            let len = k.kw.count
            if !same && len < 4 { continue }
            if k.phrase {
                if joined.contains(" \(k.kw) ") { bump(k.emoji, (same ? 1000 : 500) + len) }
                continue
            }
            for w in titleWords {
                if w == k.kw { bump(k.emoji, (same ? 1000 : 500) + len) }
                else if same && ((len >= 5 && w.contains(k.kw)) || (len == 4 && w.hasSuffix(k.kw))) { bump(k.emoji, 700 + len) }
            }
        }
        // Ties keep keywords.json order, like the TS Map's insertion order.
        return scores.keys.sorted { scores[$0]! != scores[$1]! ? scores[$0]! > scores[$1]! : firstSeen[$0]! < firstSeen[$1]! }
    }

    private func datasetResults(_ titleWords: [String], lang: String) -> [String] {
        let tokens = loadDataset(lang)
        guard !tokens.isEmpty else { return [] }
        var scored: [String: (score: Int, order: Int)] = [:]
        for q in titleWords where q.count >= 3 && !Self.stopwords.contains(q) {
            for (token, list) in tokens {
                let s = token == q ? 100 : token.hasPrefix(q) ? 50 : (q.count >= 4 && token.contains(q)) ? 10 : 0
                guard s > 0 else { continue }
                for e in list { scored[e.unicode] = ((scored[e.unicode]?.score ?? 0) + s, e.order) }
            }
        }
        return scored.sorted { $0.value.score != $1.value.score ? $0.value.score > $1.value.score : $0.value.order < $1.value.order }.map(\.key)
    }

    // MARK: - Data (call with lock held)

    private func readJSON(_ file: String) -> Any? {
        guard let url = dataDirectory?.appendingPathComponent(file), let data = try? Data(contentsOf: url) else {
            NSLog("[EmojiSuggestionEngine] missing %@", file)
            return nil
        }
        return try? JSONSerialization.jsonObject(with: data)
    }

    private func loadKeywords() -> [Keyword] {
        if let keywords { return keywords }
        var list: [Keyword] = []
        for row in readJSON("keywords.json") as? [[Any]] ?? [] {
            guard row.count == 2, let emoji = row[0] as? String, let byLang = row[1] as? [String: [String]] else { continue }
            for (lang, ws) in byLang {
                for w in ws {
                    let kw = Self.words(w).joined(separator: " ")
                    list.append(Keyword(emoji: emoji, lang: lang, kw: kw, raw: w.lowercased(), phrase: kw.contains(" ")))
                }
            }
        }
        keywords = list
        return list
    }

    private func loadDataset(_ lang: String) -> [String: [Entry]] {
        if let cached = datasets[lang] { return cached }
        var tokens: [String: [Entry]] = [:]
        for (order, row) in (readJSON("\(lang).json") as? [[Any]] ?? []).enumerated() {
            guard row.count == 3, let unicode = row[0] as? String, let label = row[1] as? String, let tags = row[2] as? [String] else { continue }
            for w in Set(([label] + tags).flatMap(Self.words)) {
                tokens[w, default: []].append(Entry(unicode: unicode, order: order))
            }
        }
        datasets[lang] = tokens
        return tokens
    }
}
