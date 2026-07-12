import Foundation

@main
struct EmojiParserTests {
    static func main() {
        let emoji = ["🇩🇰", "🇺🇸", "🇬🇧", "🇯🇵", "🇧🇷", "🏳️‍🌈", "👨‍👩‍👧‍👦", "👍🏽"]

        for value in emoji {
            precondition(EmojiParser.containsOnlyEmoji(value), "Rejected emoji: \(value)")
            precondition(EmojiParser.firstEmoji(in: value) == value, "Split emoji: \(value)")
        }

        precondition(EmojiParser.firstEmoji(in: "A") == nil)
        precondition(!EmojiParser.containsOnlyEmoji("5"))
        precondition(!EmojiParser.containsOnlyEmoji("🇩🇰A"))

        let firstRegionalIndicator = "\u{1F1E9}"
        precondition(EmojiParser.isIncompleteFlag(firstRegionalIndicator))
        precondition(EmojiParser.firstEmoji(in: firstRegionalIndicator) == nil)
        precondition(!EmojiParser.isIncompleteFlag("🇩🇰"))
    }
}
