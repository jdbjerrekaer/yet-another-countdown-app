import Foundation

enum EmojiParser {
    static func firstEmoji(in text: String) -> String? {
        text.first(where: isEmoji).map(String.init)
    }

    static func containsOnlyEmoji(_ text: String) -> Bool {
        !text.isEmpty && text.allSatisfy(isEmoji)
    }

    static func isIncompleteFlag(_ text: String) -> Bool {
        let scalars = text.unicodeScalars
        return scalars.count == 1 && scalars.allSatisfy {
            (0x1F1E6...0x1F1FF).contains($0.value)
        }
    }

    private static func isEmoji(_ character: Character) -> Bool {
        let scalars = character.unicodeScalars
        if isIncompleteFlag(String(character)) { return false }
        return scalars.contains { $0.properties.isEmojiPresentation }
            || (scalars.count > 1 && scalars.contains { $0.properties.isEmoji })
    }
}
