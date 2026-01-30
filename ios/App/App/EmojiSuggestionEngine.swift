import Foundation

/// Compact emoji data structure matching emojibase-data format
private struct CompactEmoji: Hashable {
    let unicode: String
    let label: String
    let tags: [String]
    let aliases: [String]  // Slang names like Slack uses (e.g., "thumbsup", "smile", "party")
    let order: Int
    
    // Localized versions (optional, falls back to English if nil)
    let labelDa: String?
    let tagsDa: [String]?
    let aliasesDa: [String]?
    
    // Convenience initializer with default nil for Danish
    init(unicode: String, label: String, tags: [String], aliases: [String], labelDa: String? = nil, tagsDa: [String]? = nil, aliasesDa: [String]? = nil, order: Int) {
        self.unicode = unicode
        self.label = label
        self.tags = tags
        self.aliases = aliases
        self.labelDa = labelDa
        self.tagsDa = tagsDa
        self.aliasesDa = aliasesDa
        self.order = order
    }
}

private struct LocaleEmojiEntry: Decodable {
    let unicode: String
    let label: String
    let tags: [String]?
    let group: Int?
    let order: Int?
    
    enum CodingKeys: String, CodingKey {
        case unicode
        case label
        case tags
        case group
        case order
    }
}

/// Emoji suggestion engine that mirrors the TypeScript implementation
/// Uses a curated set of common emojis to keep bundle size small
final class EmojiSuggestionEngine {
    static let shared = EmojiSuggestionEngine()
    
    // Default emoji options matching the UI (from DatePickerModal EMOJI_OPTIONS)
    private static let defaultEmojiOptions = ["🎯", "🎉", "✈️", "💍", "🎂", "🎄", "🌟", "🏆", "💪", "🎓", "🏠", "👶"]
    
    // Fallback emoji if no suggestions found
    private static let fallbackEmoji = "🎯"
    
    private var indexCache: [String: [String: [CompactEmoji]]] = [:]
    private var allEmojis: [CompactEmoji] = []
    
    private let supportedLocales = ["en", "es", "it", "pt", "de", "ru", "fr", "da", "sv", "no", "fi"]
    private let localeAliases = ["no": "nb"]
    private let localeReverseAliases = ["nb": "no"]
    
    private init() {
        buildIndex()
    }
    
    /// Get the first emoji suggestion for a given title
    /// Returns the first suggestion from the title-based search, or falls back to default emoji
    func suggestEmoji(for title: String) -> String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return Self.defaultEmojiOptions.first ?? Self.fallbackEmoji
        }
        
        let suggestions = getSuggestions(query: trimmed, limit: 1)
        return suggestions.first?.unicode ?? Self.defaultEmojiOptions.first ?? Self.fallbackEmoji
    }
    
    /// Get emoji suggestions based on query (matching TypeScript implementation)
    private func getSuggestions(query: String, limit: Int) -> [CompactEmoji] {
        let locale = getLocaleKey()
        let normalizedQuery = normalize(query)
        
        if normalizedQuery.isEmpty {
            return []
        }
        
        let queryWords = normalizedQuery.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        
        // Score each emoji based on match quality
        var scored: [CompactEmoji: Int] = [:]
        
        func addScore(_ emoji: CompactEmoji, score: Int) {
            scored[emoji] = (scored[emoji] ?? 0) + score
        }
        
        let tokens = indexCache[locale] ?? [:]
        
        for qWord in queryWords {
            // Exact match (highest score)
            if let exactList = tokens[qWord] {
                for emoji in exactList {
                    addScore(emoji, score: 100)
                }
            }
            
            // Prefix + substring matches
            for (token, emojis) in tokens {
                if token == qWord { continue } // already handled exact
                if token.hasPrefix(qWord) {
                    for emoji in emojis {
                        addScore(emoji, score: 50)
                    }
                } else if token.contains(qWord) {
                    for emoji in emojis {
                        addScore(emoji, score: 10)
                    }
                }
            }
        }
        
        // Sort by score descending, then by order
        let sorted = scored.compactMap { (emoji, score) -> (CompactEmoji, Int)? in
            score > 0 ? (emoji, score) : nil
        }.sorted { a, b in
            if b.1 != a.1 {
                return b.1 > a.1
            }
            return a.0.order < b.0.order
        }
        
        // Deduplicate by unicode
        var seen = Set<String>()
        var results: [CompactEmoji] = []
        for (emoji, _) in sorted {
            if seen.contains(emoji.unicode) { continue }
            seen.insert(emoji.unicode)
            results.append(emoji)
            if results.count >= limit { break }
        }
        
        return results
    }
    
    /// Normalize string: remove diacritics and lowercase
    private func normalize(_ str: String) -> String {
        return str
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil)
            .lowercased()
    }
    
    /// Get locale key from current locale
    private func getLocaleKey() -> String {
        let lang = (Locale.current.languageCode ?? "en").lowercased()
        if supportedLocales.contains(lang) {
            return lang
        }
        if let mapped = localeReverseAliases[lang] {
            return mapped
        }
        return "en"
    }
    
    /// Build the search index from curated emoji data
    private func buildIndex() {
        let emojis = getCuratedEmojis()
        allEmojis = emojis
        
        let slangAliasesByUnicode = buildSlangAliasMap(from: emojis)
        
        for locale in supportedLocales {
            var tokens: [String: [CompactEmoji]] = [:]
            let localeEntries = loadLocaleData(locale: locale)
            if !localeEntries.isEmpty {
                for entry in localeEntries {
                    // Skip component emojis (skin tones, hair, etc.)
                    if let group = entry.group, group < 0 { continue }
                    let aliases = slangAliasesByUnicode[entry.unicode] ?? []
                    let words = extractWords(from: entry.label, tags: entry.tags ?? [], aliases: aliases)
                    let mapped = CompactEmoji(
                        unicode: entry.unicode,
                        label: entry.label,
                        tags: entry.tags ?? [],
                        aliases: aliases,
                        order: entry.order ?? 9999
                    )
                    for word in words {
                        if word.isEmpty { continue }
                        if tokens[word] == nil {
                            tokens[word] = []
                        }
                        if !tokens[word]!.contains(where: { $0.unicode == mapped.unicode }) {
                            tokens[word]!.append(mapped)
                        }
                    }
                }
            } else {
                for emoji in emojis {
                    // Use locale-specific labels/tags/aliases, fallback to English
                    let label = locale == "da" ? (emoji.labelDa ?? emoji.label) : emoji.label
                    let tags = locale == "da" ? (emoji.tagsDa ?? emoji.tags) : emoji.tags
                    let aliases = locale == "da" ? (emoji.aliasesDa ?? emoji.aliases) : emoji.aliases
                    
                    let words = extractWords(from: label, tags: tags, aliases: aliases)
                    
                    for word in words {
                        if word.isEmpty { continue }
                        if tokens[word] == nil {
                            tokens[word] = []
                        }
                        if !tokens[word]!.contains(where: { $0.unicode == emoji.unicode }) {
                            tokens[word]!.append(emoji)
                        }
                    }
                }
            }
            
            indexCache[locale] = tokens
        }
    }

    private func buildSlangAliasMap(from emojis: [CompactEmoji]) -> [String: [String]] {
        var map: [String: [String]] = [:]
        for emoji in emojis {
            map[emoji.unicode] = emoji.aliases
        }
        return map
    }

    private func loadLocaleData(locale: String) -> [LocaleEmojiEntry] {
        let bundleLocale = localeAliases[locale] ?? locale
        guard let url = Bundle.main.url(forResource: "emoji-compact-\(bundleLocale)", withExtension: "json") else {
            return []
        }
        do {
            let data = try Data(contentsOf: url)
            return try JSONDecoder().decode([LocaleEmojiEntry].self, from: data)
        } catch {
            return []
        }
    }
    
    /// Extract normalized words from label, tags, and aliases
    private func extractWords(from label: String, tags: [String], aliases: [String]) -> [String] {
        var words: [String] = []
        let normalizedLabel = normalize(label)
        words.append(contentsOf: normalizedLabel.components(separatedBy: .whitespaces))
        
        for tag in tags {
            let normalizedTag = normalize(tag)
            words.append(contentsOf: normalizedTag.components(separatedBy: .whitespaces))
        }
        
        // Add aliases (slang names) - these are already single words/phrases
        for alias in aliases {
            let normalizedAlias = normalize(alias)
            words.append(normalizedAlias)
        }
        
        return words.filter { !$0.isEmpty }
    }
    
    /// Curated set of common emojis with labels and tags
    /// This is a subset focused on event-related emojis to keep bundle size small
    private func getCuratedEmojis() -> [CompactEmoji] {
        return [
            // Default options (high priority - matching UI EMOJI_OPTIONS)
            CompactEmoji(unicode: "🎯", label: "direct hit", tags: ["target", "goal", "aim"], aliases: ["target", "dart", "bullseye", "goal"], labelDa: "direkte træf", tagsDa: ["mål", "målskive", "sigte"], aliasesDa: ["mål", "dart", "målskive"], order: 1),
            CompactEmoji(unicode: "🎉", label: "party popper", tags: ["celebration", "party", "festival"], aliases: ["party", "celebration", "tada", "hooray", "yay"], labelDa: "festkonfetti", tagsDa: ["fest", "fejring", "festival"], aliasesDa: ["fest", "fejring", "hurra"], order: 2),
            CompactEmoji(unicode: "✈️", label: "airplane", tags: ["travel", "flight", "vacation", "trip"], aliases: ["airplane", "plane", "flight", "travel", "trip", "vacation"], labelDa: "flyvemaskine", tagsDa: ["rejse", "flyvning", "ferie", "tur"], aliasesDa: ["fly", "flyvemaskine", "rejse", "ferie"], order: 3),
            CompactEmoji(unicode: "💍", label: "ring", tags: ["wedding", "marriage", "engagement", "proposal"], aliases: ["ring", "wedding", "marriage", "engagement", "proposal", "diamond"], labelDa: "ring", tagsDa: ["bryllup", "ægteskab", "forlovelse"], aliasesDa: ["ring", "bryllup", "forlovelse"], order: 4),
            CompactEmoji(unicode: "🎂", label: "birthday cake", tags: ["birthday", "cake", "celebration"], aliases: ["cake", "birthday", "bday", "celebration"], labelDa: "fødselsdagslagkage", tagsDa: ["fødselsdag", "kage", "fejring"], aliasesDa: ["kage", "fødselsdag", "lagkage"], order: 5),
            CompactEmoji(unicode: "🎄", label: "Christmas tree", tags: ["christmas", "holiday", "xmas"], aliases: ["christmas", "xmas", "tree", "holiday"], labelDa: "juletræ", tagsDa: ["jul", "ferie", "helligdag"], aliasesDa: ["jul", "juletræ", "helligdag"], order: 6),
            CompactEmoji(unicode: "🌟", label: "star", tags: ["star", "special", "important"], aliases: ["star", "sparkles", "special"], labelDa: "stjerne", tagsDa: ["stjerne", "speciel", "vigtig"], aliasesDa: ["stjerne", "speciel"], order: 7),
            CompactEmoji(unicode: "🏆", label: "trophy", tags: ["trophy", "win", "achievement", "award"], aliases: ["trophy", "win", "winner", "award", "achievement"], labelDa: "pokal", tagsDa: ["pokal", "sejr", "præstation", "pris"], aliasesDa: ["pokal", "sejr", "vinder"], order: 8),
            CompactEmoji(unicode: "💪", label: "flexed biceps", tags: ["strength", "workout", "fitness", "gym"], aliases: ["muscle", "strong", "workout", "gym", "fitness", "flex"], labelDa: "spændte biceps", tagsDa: ["styrke", "træning", "fitness", "gym"], aliasesDa: ["muskel", "stærk", "træning", "gym"], order: 9),
            CompactEmoji(unicode: "🎓", label: "graduation cap", tags: ["graduation", "school", "education", "diploma"], aliases: ["graduation", "grad", "diploma", "school", "college"], labelDa: "studiehat", tagsDa: ["eksamen", "skole", "uddannelse", "diplom"], aliasesDa: ["eksamen", "studiehat", "diplom", "skole"], order: 10),
            CompactEmoji(unicode: "🏠", label: "house", tags: ["home", "house", "moving"], aliases: ["house", "home", "moving"], labelDa: "hus", tagsDa: ["hjem", "hus", "flytning"], aliasesDa: ["hus", "hjem", "flytning"], order: 11),
            CompactEmoji(unicode: "👶", label: "baby", tags: ["baby", "birth", "child"], aliases: ["baby", "infant", "birth", "newborn"], labelDa: "baby", tagsDa: ["baby", "fødsel", "barn"], aliasesDa: ["baby", "spædbarn", "fødsel"], order: 12),
            
            // Common event emojis
            CompactEmoji(unicode: "🎈", label: "balloon", tags: ["party", "celebration", "birthday"], aliases: ["balloon", "party"], labelDa: "ballon", tagsDa: ["fest", "fejring", "fødselsdag"], aliasesDa: ["ballon", "fest"], order: 13),
            CompactEmoji(unicode: "🎁", label: "wrapped gift", tags: ["gift", "present", "birthday", "christmas"], aliases: ["gift", "present", "box"], labelDa: "indpakket gave", tagsDa: ["gave", "fødselsdag", "jul"], aliasesDa: ["gave", "pakke"], order: 14),
            CompactEmoji(unicode: "🎪", label: "circus tent", tags: ["circus", "event", "show"], aliases: ["circus", "tent"], labelDa: "cirkustelt", tagsDa: ["cirkus", "begivenhed", "show"], aliasesDa: ["cirkus", "telt"], order: 15),
            CompactEmoji(unicode: "🎭", label: "performing arts", tags: ["theater", "show", "performance"], aliases: ["theater", "drama", "masks"], labelDa: "scenekunst", tagsDa: ["teater", "show", "forestilling"], aliasesDa: ["teater", "drama"], order: 16),
            CompactEmoji(unicode: "🎨", label: "artist palette", tags: ["art", "creative", "painting"], aliases: ["art", "palette", "paint", "artist"], labelDa: "kunstnerpalet", tagsDa: ["kunst", "kreativ", "maleri"], aliasesDa: ["kunst", "palet", "maleri"], order: 17),
            CompactEmoji(unicode: "🎬", label: "clapper board", tags: ["movie", "film", "cinema"], aliases: ["movie", "film", "cinema", "clapper"], labelDa: "klapbræt", tagsDa: ["film", "biograf"], aliasesDa: ["film", "biograf"], order: 18),
            CompactEmoji(unicode: "🎤", label: "microphone", tags: ["music", "concert", "singing"], aliases: ["mic", "microphone", "karaoke", "singing"], labelDa: "mikrofon", tagsDa: ["musik", "koncert", "sang"], aliasesDa: ["mikrofon", "karaoke", "sang"], order: 19),
            CompactEmoji(unicode: "🎵", label: "musical note", tags: ["music", "song", "concert"], aliases: ["music", "note", "song"], labelDa: "musiknode", tagsDa: ["musik", "sang", "koncert"], aliasesDa: ["musik", "node", "sang"], order: 20),
            CompactEmoji(unicode: "🎸", label: "guitar", tags: ["music", "guitar", "concert"], aliases: ["guitar", "rock"], labelDa: "guitar", tagsDa: ["musik", "guitar", "koncert"], aliasesDa: ["guitar"], order: 21),
            CompactEmoji(unicode: "🎹", label: "musical keyboard", tags: ["music", "piano", "keyboard"], aliases: ["piano", "keyboard", "keys"], labelDa: "musiktastatur", tagsDa: ["musik", "klaver", "piano"], aliasesDa: ["piano", "klaver"], order: 22),
            CompactEmoji(unicode: "🎺", label: "trumpet", tags: ["music", "trumpet", "jazz"], aliases: ["trumpet", "jazz"], labelDa: "trompet", tagsDa: ["musik", "trompet", "jazz"], aliasesDa: ["trompet"], order: 23),
            CompactEmoji(unicode: "🎻", label: "violin", tags: ["music", "violin", "orchestra"], aliases: ["violin", "fiddle"], labelDa: "violin", tagsDa: ["musik", "violin", "orkester"], aliasesDa: ["violin"], order: 24),
            CompactEmoji(unicode: "🥁", label: "drum", tags: ["music", "drum", "concert"], aliases: ["drum", "drums"], labelDa: "tromme", tagsDa: ["musik", "tromme", "koncert"], aliasesDa: ["tromme"], order: 25),
            CompactEmoji(unicode: "🏀", label: "basketball", tags: ["basketball", "sport", "game"], aliases: ["basketball", "basket", "bball"], labelDa: "basketball", tagsDa: ["basketball", "sport", "spil"], aliasesDa: ["basketball"], order: 26),
            CompactEmoji(unicode: "⚽", label: "soccer ball", tags: ["soccer", "football", "sport"], aliases: ["soccer", "football", "futbol"], labelDa: "fodbold", tagsDa: ["fodbold", "sport"], aliasesDa: ["fodbold"], order: 27),
            CompactEmoji(unicode: "🏈", label: "american football", tags: ["football", "sport", "game"], aliases: ["football", "nfl", "americanfootball"], labelDa: "amerikansk fodbold", tagsDa: ["fodbold", "sport", "spil"], aliasesDa: ["fodbold"], order: 28),
            CompactEmoji(unicode: "⚾", label: "baseball", tags: ["baseball", "sport", "game"], aliases: ["baseball", "mlb"], labelDa: "baseball", tagsDa: ["baseball", "sport", "spil"], aliasesDa: ["baseball"], order: 29),
            CompactEmoji(unicode: "🎾", label: "tennis", tags: ["tennis", "sport", "game"], aliases: ["tennis", "racket"], labelDa: "tennis", tagsDa: ["tennis", "sport", "spil"], aliasesDa: ["tennis"], order: 30),
            CompactEmoji(unicode: "🏐", label: "volleyball", tags: ["volleyball", "sport", "beach"], aliases: ["volleyball", "beach"], order: 31),
            CompactEmoji(unicode: "🏉", label: "rugby football", tags: ["rugby", "sport", "game"], aliases: ["rugby"], order: 32),
            CompactEmoji(unicode: "🎱", label: "pool 8 ball", tags: ["pool", "billiards", "game"], aliases: ["8ball", "pool", "billiards"], order: 33),
            CompactEmoji(unicode: "🏓", label: "ping pong", tags: ["ping pong", "table tennis", "sport"], aliases: ["pingpong", "tabletennis"], order: 34),
            CompactEmoji(unicode: "🏸", label: "badminton", tags: ["badminton", "sport", "game"], aliases: ["badminton"], order: 35),
            CompactEmoji(unicode: "🥊", label: "boxing glove", tags: ["boxing", "sport", "fight"], aliases: ["boxing", "boxer"], order: 36),
            CompactEmoji(unicode: "🥋", label: "martial arts uniform", tags: ["martial arts", "karate", "sport"], aliases: ["karate", "martialarts"], order: 37),
            CompactEmoji(unicode: "⛳", label: "flag in hole", tags: ["golf", "sport", "game"], aliases: ["golf", "flag"], order: 38),
            CompactEmoji(unicode: "🏌️", label: "golfer", tags: ["golf", "sport", "game"], aliases: ["golfer", "golfing"], order: 39),
            CompactEmoji(unicode: "🏇", label: "horse racing", tags: ["horse", "racing", "sport"], aliases: ["horseracing", "horse", "racing"], order: 40),
            CompactEmoji(unicode: "🏂", label: "snowboarder", tags: ["snowboard", "snow", "winter", "sport"], aliases: ["snowboard", "snowboarding"], order: 41),
            CompactEmoji(unicode: "⛷️", label: "skier", tags: ["ski", "snow", "winter", "sport"], aliases: ["ski", "skiing"], order: 42),
            CompactEmoji(unicode: "🏄", label: "surfer", tags: ["surf", "beach", "ocean", "sport"], aliases: ["surf", "surfing"], order: 43),
            CompactEmoji(unicode: "🏊", label: "swimmer", tags: ["swim", "swimming", "sport", "pool"], aliases: ["swim", "swimming"], order: 44),
            CompactEmoji(unicode: "🚗", label: "car", tags: ["car", "vehicle", "drive", "road trip"], aliases: ["car", "redcar", "auto"], labelDa: "bil", tagsDa: ["bil", "køretøj", "kørsel"], aliasesDa: ["bil"], order: 45),
            CompactEmoji(unicode: "🚕", label: "taxi", tags: ["taxi", "cab", "transport"], aliases: ["taxi", "cab"], labelDa: "taxi", tagsDa: ["taxi", "transport"], aliasesDa: ["taxi"], order: 46),
            CompactEmoji(unicode: "🚙", label: "sport utility vehicle", tags: ["suv", "car", "vehicle"], aliases: ["suv", "jeep"], labelDa: "suv", tagsDa: ["suv", "bil"], aliasesDa: ["suv"], order: 47),
            CompactEmoji(unicode: "🚌", label: "bus", tags: ["bus", "transport", "travel"], aliases: ["bus"], labelDa: "bus", tagsDa: ["bus", "transport", "rejse"], aliasesDa: ["bus"], order: 48),
            CompactEmoji(unicode: "🚎", label: "trolleybus", tags: ["bus", "trolley", "transport"], aliases: ["trolleybus", "trolley"], order: 49),
            CompactEmoji(unicode: "🏎️", label: "racing car", tags: ["race", "racing", "car", "speed"], aliases: ["racecar", "racing"], order: 50),
            CompactEmoji(unicode: "🚓", label: "police car", tags: ["police", "cop", "law"], aliases: ["police", "cop"], order: 51),
            CompactEmoji(unicode: "🚑", label: "ambulance", tags: ["ambulance", "emergency", "hospital"], aliases: ["ambulance"], order: 52),
            CompactEmoji(unicode: "🚒", label: "fire engine", tags: ["fire", "truck", "emergency"], aliases: ["firetruck", "fire"], order: 53),
            CompactEmoji(unicode: "🚐", label: "minibus", tags: ["bus", "van", "transport"], aliases: ["minibus", "van"], order: 54),
            CompactEmoji(unicode: "🚚", label: "delivery truck", tags: ["truck", "delivery", "shipping"], aliases: ["truck", "delivery"], order: 55),
            CompactEmoji(unicode: "🚛", label: "articulated lorry", tags: ["truck", "lorry", "transport"], aliases: ["truck", "lorry"], order: 56),
            CompactEmoji(unicode: "🚜", label: "tractor", tags: ["tractor", "farm", "agriculture"], aliases: ["tractor"], order: 57),
            CompactEmoji(unicode: "🛴", label: "kick scooter", tags: ["scooter", "transport"], aliases: ["scooter"], order: 58),
            CompactEmoji(unicode: "🚲", label: "bicycle", tags: ["bike", "bicycle", "cycling", "sport"], aliases: ["bike", "bicycle", "bicyclist"], order: 59),
            CompactEmoji(unicode: "🛵", label: "motor scooter", tags: ["scooter", "motorcycle", "transport"], aliases: ["motorbike", "scooter"], order: 60),
            CompactEmoji(unicode: "🏍️", label: "motorcycle", tags: ["motorcycle", "bike", "transport"], aliases: ["motorcycle", "motorbike"], order: 61),
            CompactEmoji(unicode: "🚨", label: "police car light", tags: ["police", "emergency", "alert"], aliases: ["rotatinglight", "police", "emergency"], order: 62),
            CompactEmoji(unicode: "🚔", label: "oncoming police car", tags: ["police", "cop", "law"], aliases: ["police", "cop"], order: 63),
            CompactEmoji(unicode: "🚍", label: "oncoming bus", tags: ["bus", "transport"], aliases: ["bus"], order: 64),
            CompactEmoji(unicode: "🚘", label: "oncoming automobile", tags: ["car", "vehicle"], aliases: ["car"], order: 65),
            CompactEmoji(unicode: "🚖", label: "oncoming taxi", tags: ["taxi", "cab"], aliases: ["taxi"], order: 66),
            CompactEmoji(unicode: "🚡", label: "aerial tramway", tags: ["cable car", "tramway", "mountain"], aliases: ["cablecar", "tramway"], order: 67),
            CompactEmoji(unicode: "🚠", label: "mountain cableway", tags: ["cable car", "mountain", "ski"], aliases: ["cablecar", "mountain"], order: 68),
            CompactEmoji(unicode: "🚟", label: "suspension railway", tags: ["railway", "train", "transport"], aliases: ["suspensionrailway"], order: 69),
            CompactEmoji(unicode: "🚃", label: "railway car", tags: ["train", "railway", "transport"], aliases: ["train", "railway"], order: 70),
            CompactEmoji(unicode: "🚋", label: "tram car", tags: ["tram", "trolley", "transport"], aliases: ["tram"], order: 71),
            CompactEmoji(unicode: "🚞", label: "mountain railway", tags: ["train", "mountain", "railway"], aliases: ["mountainrailway"], order: 72),
            CompactEmoji(unicode: "🚝", label: "monorail", tags: ["monorail", "train", "transport"], aliases: ["monorail"], order: 73),
            CompactEmoji(unicode: "🚄", label: "high-speed train", tags: ["train", "fast", "railway"], aliases: ["bullettrain", "fasttrain"], order: 74),
            CompactEmoji(unicode: "🚅", label: "bullet train", tags: ["train", "fast", "japan"], aliases: ["bullettrain", "shinkansen"], order: 75),
            CompactEmoji(unicode: "🚈", label: "light rail", tags: ["train", "railway", "transport"], aliases: ["lightrail"], order: 76),
            CompactEmoji(unicode: "🚂", label: "locomotive", tags: ["train", "steam", "railway"], aliases: ["steamlocomotive", "steam"], order: 77),
            CompactEmoji(unicode: "🚆", label: "train", tags: ["train", "railway", "transport"], aliases: ["train"], order: 78),
            CompactEmoji(unicode: "🚇", label: "metro", tags: ["subway", "metro", "underground"], aliases: ["metro", "subway"], order: 79),
            CompactEmoji(unicode: "🚊", label: "tram", tags: ["tram", "trolley", "transport"], aliases: ["tram"], order: 80),
            CompactEmoji(unicode: "🚉", label: "station", tags: ["station", "train", "railway"], aliases: ["station"], order: 81),
            CompactEmoji(unicode: "🚁", label: "helicopter", tags: ["helicopter", "aircraft", "flight"], aliases: ["helicopter"], order: 82),
            CompactEmoji(unicode: "🛩️", label: "small airplane", tags: ["airplane", "flight", "aircraft"], aliases: ["smallairplane", "plane"], order: 83),
            CompactEmoji(unicode: "✈️", label: "airplane", tags: ["airplane", "flight", "travel"], aliases: ["airplane", "plane"], order: 84),
            CompactEmoji(unicode: "🛫", label: "airplane departure", tags: ["departure", "flight", "airport"], aliases: ["flightdeparture", "departure"], order: 85),
            CompactEmoji(unicode: "🛬", label: "airplane arrival", tags: ["arrival", "flight", "airport"], aliases: ["flightarrival", "arrival"], order: 86),
            CompactEmoji(unicode: "🛰️", label: "satellite", tags: ["satellite", "space", "technology"], aliases: ["satellite"], order: 87),
            CompactEmoji(unicode: "💺", label: "seat", tags: ["seat", "chair", "theater"], aliases: ["seat"], order: 88),
            CompactEmoji(unicode: "🚀", label: "rocket", tags: ["rocket", "space", "launch"], aliases: ["rocket", "launch"], order: 89),
            CompactEmoji(unicode: "🛸", label: "flying saucer", tags: ["ufo", "alien", "space"], aliases: ["ufo", "alienship"], order: 90),
            CompactEmoji(unicode: "⛵", label: "sailboat", tags: ["sailboat", "boat", "sailing", "ocean"], aliases: ["sailboat", "sailing"], order: 91),
            CompactEmoji(unicode: "🛥️", label: "motor boat", tags: ["boat", "motor", "ocean"], aliases: ["motorboat"], order: 92),
            CompactEmoji(unicode: "🚤", label: "speedboat", tags: ["speedboat", "boat", "fast"], aliases: ["speedboat"], order: 93),
            CompactEmoji(unicode: "⛴️", label: "ferry", tags: ["ferry", "boat", "transport"], aliases: ["ferry"], order: 94),
            CompactEmoji(unicode: "🛳️", label: "passenger ship", tags: ["ship", "cruise", "ocean"], aliases: ["cruise", "ship"], order: 95),
            CompactEmoji(unicode: "🚢", label: "ship", tags: ["ship", "boat", "ocean"], aliases: ["ship", "boat"], order: 96),
            CompactEmoji(unicode: "⚓", label: "anchor", tags: ["anchor", "ship", "nautical"], aliases: ["anchor"], order: 97),
            CompactEmoji(unicode: "⛽", label: "fuel pump", tags: ["gas", "fuel", "station"], aliases: ["fuelpump", "gas", "gasstation"], order: 98),
            CompactEmoji(unicode: "🚧", label: "construction", tags: ["construction", "work", "building"], aliases: ["construction", "roadwork"], order: 99),
            CompactEmoji(unicode: "🚦", label: "vertical traffic light", tags: ["traffic", "light", "signal"], aliases: ["trafficlight"], order: 100),
            CompactEmoji(unicode: "🚥", label: "horizontal traffic light", tags: ["traffic", "light", "signal"], aliases: ["trafficlight"], order: 101),
            CompactEmoji(unicode: "🗺️", label: "world map", tags: ["map", "world", "travel"], aliases: ["map", "worldmap"], order: 102),
            CompactEmoji(unicode: "🗿", label: "moai", tags: ["moai", "easter island", "statue"], aliases: ["moai", "easterisland"], order: 103),
            CompactEmoji(unicode: "🗽", label: "Statue of Liberty", tags: ["statue", "liberty", "new york"], aliases: ["statueofliberty", "liberty", "nyc"], order: 104),
            CompactEmoji(unicode: "🗼", label: "Tokyo tower", tags: ["tower", "tokyo", "japan"], aliases: ["tokyotower", "tower"], order: 105),
            CompactEmoji(unicode: "🏰", label: "castle", tags: ["castle", "fortress", "medieval"], aliases: ["castle", "europeancastle"], order: 106),
            CompactEmoji(unicode: "🏯", label: "Japanese castle", tags: ["castle", "japan", "fortress"], aliases: ["japanesecastle"], order: 107),
            CompactEmoji(unicode: "🏟️", label: "stadium", tags: ["stadium", "sport", "arena"], aliases: ["stadium"], order: 108),
            CompactEmoji(unicode: "🎡", label: "ferris wheel", tags: ["ferris wheel", "amusement", "park"], aliases: ["ferriswheel"], order: 109),
            CompactEmoji(unicode: "🎢", label: "roller coaster", tags: ["roller coaster", "amusement", "park"], aliases: ["rollercoaster"], order: 110),
            CompactEmoji(unicode: "🎠", label: "carousel horse", tags: ["carousel", "amusement", "park"], aliases: ["carousel"], order: 111),
            CompactEmoji(unicode: "⛲", label: "fountain", tags: ["fountain", "water", "park"], aliases: ["fountain"], order: 112),
            CompactEmoji(unicode: "⛱️", label: "umbrella on ground", tags: ["beach", "umbrella", "vacation"], aliases: ["beachumbrella"], order: 113),
            CompactEmoji(unicode: "🏖️", label: "beach with umbrella", tags: ["beach", "vacation", "ocean"], aliases: ["beach"], order: 114),
            CompactEmoji(unicode: "🏝️", label: "desert island", tags: ["island", "desert", "tropical"], aliases: ["desertisland", "island"], order: 115),
            CompactEmoji(unicode: "🏜️", label: "desert", tags: ["desert", "sand", "arid"], aliases: ["desert"], order: 116),
            CompactEmoji(unicode: "🌋", label: "volcano", tags: ["volcano", "mountain", "eruption"], aliases: ["volcano"], order: 117),
            CompactEmoji(unicode: "⛰️", label: "mountain", tags: ["mountain", "peak", "hiking"], aliases: ["mountain"], order: 118),
            CompactEmoji(unicode: "🏔️", label: "snow-capped mountain", tags: ["mountain", "snow", "peak"], aliases: ["snowcappedmountain"], order: 119),
            CompactEmoji(unicode: "🗻", label: "mount fuji", tags: ["fuji", "mountain", "japan"], aliases: ["mountfuji", "fuji"], order: 120),
            CompactEmoji(unicode: "🏕️", label: "camping", tags: ["camping", "tent", "outdoor"], aliases: ["camping"], order: 121),
            CompactEmoji(unicode: "⛺", label: "tent", tags: ["tent", "camping", "outdoor"], aliases: ["tent"], order: 122),
            CompactEmoji(unicode: "🏞️", label: "national park", tags: ["park", "nature", "outdoor"], aliases: ["nationalpark", "park"], order: 123),
            CompactEmoji(unicode: "🛣️", label: "motorway", tags: ["highway", "road", "motorway"], aliases: ["motorway", "highway"], order: 124),
            CompactEmoji(unicode: "🛤️", label: "railway track", tags: ["railway", "track", "train"], aliases: ["railwaytrack"], order: 125),
            CompactEmoji(unicode: "🌉", label: "bridge at night", tags: ["bridge", "night", "city"], aliases: ["bridge"], order: 126),
            CompactEmoji(unicode: "🌁", label: "foggy", tags: ["fog", "weather", "cloudy"], aliases: ["foggy"], order: 127),
            CompactEmoji(unicode: "🌃", label: "night with stars", tags: ["night", "stars", "city"], aliases: ["night", "citynight"], order: 128),
            CompactEmoji(unicode: "🌆", label: "cityscape at dusk", tags: ["city", "dusk", "skyline"], aliases: ["cityscape", "dusk"], order: 129),
            CompactEmoji(unicode: "🌇", label: "sunset", tags: ["sunset", "dusk", "evening"], aliases: ["sunset", "dusk"], order: 130),
            CompactEmoji(unicode: "🌄", label: "sunrise over mountains", tags: ["sunrise", "morning", "mountain"], aliases: ["sunrise"], order: 131),
            CompactEmoji(unicode: "🌅", label: "sunrise", tags: ["sunrise", "morning", "dawn"], aliases: ["sunrise"], order: 132),
            CompactEmoji(unicode: "🌠", label: "shooting star", tags: ["shooting star", "star", "wish"], aliases: ["shootingstar", "wish"], order: 133),
            CompactEmoji(unicode: "🌌", label: "milky way", tags: ["galaxy", "stars", "space"], aliases: ["milkyway", "galaxy"], order: 134),
            CompactEmoji(unicode: "🌉", label: "bridge at night", tags: ["bridge", "night", "city"], aliases: ["bridge"], order: 135),
            CompactEmoji(unicode: "🎆", label: "fireworks", tags: ["fireworks", "celebration", "festival"], aliases: ["fireworks"], order: 136),
            CompactEmoji(unicode: "🎇", label: "sparkler", tags: ["sparkler", "fireworks", "celebration"], aliases: ["sparkler"], order: 137),
            CompactEmoji(unicode: "🎊", label: "confetti ball", tags: ["confetti", "celebration", "party"], aliases: ["confetti"], order: 138),
            CompactEmoji(unicode: "🎋", label: "tanabata tree", tags: ["tanabata", "festival", "japan"], aliases: ["tanabata"], order: 139),
            CompactEmoji(unicode: "🎍", label: "pine decoration", tags: ["pine", "decoration", "japan"], aliases: ["pinedecoration"], order: 140),
            CompactEmoji(unicode: "🎎", label: "Japanese dolls", tags: ["dolls", "japan", "festival"], aliases: ["japanesedolls"], order: 141),
            CompactEmoji(unicode: "🎏", label: "carp streamer", tags: ["carp", "flag", "japan"], aliases: ["carpstreamer"], order: 142),
            CompactEmoji(unicode: "🎐", label: "wind chime", tags: ["wind chime", "decoration", "summer"], aliases: ["windchime"], order: 143),
            CompactEmoji(unicode: "🎑", label: "moon viewing ceremony", tags: ["moon", "ceremony", "japan"], aliases: ["moonviewing"], order: 144),
            CompactEmoji(unicode: "🎀", label: "ribbon", tags: ["ribbon", "gift", "decoration"], aliases: ["ribbon"], order: 145),
            CompactEmoji(unicode: "🎗️", label: "reminder ribbon", tags: ["ribbon", "reminder", "awareness"], aliases: ["reminderribbon"], order: 146),
            CompactEmoji(unicode: "🎟️", label: "admission tickets", tags: ["ticket", "admission", "event"], aliases: ["tickets"], order: 147),
            CompactEmoji(unicode: "🎫", label: "ticket", tags: ["ticket", "admission", "event"], aliases: ["ticket"], order: 148),
            CompactEmoji(unicode: "🎖️", label: "military medal", tags: ["medal", "military", "award"], aliases: ["militarymedal"], order: 149),
            CompactEmoji(unicode: "🏅", label: "sports medal", tags: ["medal", "sport", "award"], aliases: ["medal", "sportsmedal"], order: 150),
        ]
    }
}
