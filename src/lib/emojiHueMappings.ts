// Emoji category color mappings based on unicode ranges and common associations
// This maps emoji code point ranges to hue values (0-360)
export const EMOJI_HUE_MAPPINGS: Array<{ start: number; end: number; hue: number }> = [
  // Hearts (red/pink)
  { start: 0x2764, end: 0x2764, hue: 350 }, // ❤️
  { start: 0x1F493, end: 0x1F49F, hue: 340 }, // 💓-💟 hearts
  
  // Nature - flowers (pink/magenta)
  { start: 0x1F337, end: 0x1F33E, hue: 320 }, // 🌷-🌾 flowers
  { start: 0x1F940, end: 0x1F940, hue: 320 }, // 🥀
  
  // Food - fruits (orange/red)
  { start: 0x1F34E, end: 0x1F353, hue: 15 }, // 🍎-🍓 fruits
  { start: 0x1F95D, end: 0x1F95D, hue: 120 }, // 🥝 kiwi - green
  
  // Food - vegetables (green)
  { start: 0x1F951, end: 0x1F952, hue: 120 }, // 🥑-🥒
  { start: 0x1F966, end: 0x1F96C, hue: 120 }, // 🥦-🥬
  
  // Food - sushi/japanese (red - Japan flag colors)
  { start: 0x1F363, end: 0x1F363, hue: 0 }, // 🍣 sushi - red (Japan)
  { start: 0x1F371, end: 0x1F371, hue: 0 }, // 🍱 bento - red (Japan)
  { start: 0x1F35C, end: 0x1F35C, hue: 0 }, // 🍜 ramen - red (Japan)
  { start: 0x1F362, end: 0x1F362, hue: 0 }, // 🍢 oden - red (Japan)
  
  // Trees/plants (green)
  { start: 0x1F332, end: 0x1F335, hue: 140 }, // 🌲-🌵 trees
  { start: 0x1F384, end: 0x1F384, hue: 0 }, // 🎄 christmas tree - red (Christmas colors)
  { start: 0x1F33F, end: 0x1F343, hue: 140 }, // 🌿-🍃
  
  // Sun/stars (yellow)
  { start: 0x2600, end: 0x2600, hue: 45 }, // ☀️
  { start: 0x1F31E, end: 0x1F31E, hue: 45 }, // 🌞
  { start: 0x2B50, end: 0x2B50, hue: 45 }, // ⭐
  { start: 0x1F31F, end: 0x1F320, hue: 45 }, // 🌟-🌠
  
  // Moon (blue/purple)
  { start: 0x1F311, end: 0x1F31D, hue: 240 }, // 🌑-🌝 moons
  
  // Water/ocean (blue/cyan)
  { start: 0x1F30A, end: 0x1F30A, hue: 200 }, // 🌊
  { start: 0x1F3CA, end: 0x1F3CA, hue: 200 }, // 🏊
  { start: 0x1F4A7, end: 0x1F4A7, hue: 200 }, // 💧
  
  // Fire (orange/red)
  { start: 0x1F525, end: 0x1F525, hue: 25 }, // 🔥
  
  // Sky/clouds (light blue)
  { start: 0x2601, end: 0x2601, hue: 210 }, // ☁️
  { start: 0x1F324, end: 0x1F32C, hue: 210 }, // 🌤-🌬
  
  // Rainbow (multicolor - use purple)
  { start: 0x1F308, end: 0x1F308, hue: 280 }, // 🌈
  
  // Animals - cats/dogs (orange/brown)
  { start: 0x1F408, end: 0x1F408, hue: 30 }, // 🐈
  { start: 0x1F415, end: 0x1F415, hue: 30 }, // 🐕
  { start: 0x1F436, end: 0x1F43E, hue: 30 }, // 🐶-🐾
  
  // Animals - birds (varies)
  { start: 0x1F426, end: 0x1F426, hue: 200 }, // 🐦 blue bird
  { start: 0x1F427, end: 0x1F427, hue: 190 }, // 🐧 penguin
  
  // Animals - fish/ocean (blue)
  { start: 0x1F41F, end: 0x1F421, hue: 200 }, // 🐟-🐡
  { start: 0x1F42C, end: 0x1F42D, hue: 200 }, // 🐬-🐭
  
  // Sports (green for grass sports)
  { start: 0x26BD, end: 0x26BD, hue: 120 }, // ⚽
  { start: 0x1F3C8, end: 0x1F3C8, hue: 30 }, // 🏈 football - brown
  { start: 0x1F3C0, end: 0x1F3C0, hue: 25 }, // 🏀 basketball - orange
  
  // Celebration/party (purple/pink)
  { start: 0x1F389, end: 0x1F38A, hue: 300 }, // 🎉-🎊
  { start: 0x1F381, end: 0x1F381, hue: 350 }, // 🎁 gift - red
  
  // Music (purple)
  { start: 0x1F3B5, end: 0x1F3BC, hue: 280 }, // 🎵-🎼
  
  // Technology (blue)
  { start: 0x1F4BB, end: 0x1F4BF, hue: 220 }, // 💻-💿
  { start: 0x1F4F1, end: 0x1F4F1, hue: 220 }, // 📱
  
  // Money (green)
  { start: 0x1F4B0, end: 0x1F4B8, hue: 140 }, // 💰-💸
  
  // Love/romance (red/pink)
  { start: 0x1F48B, end: 0x1F48B, hue: 350 }, // 💋
  { start: 0x1F46B, end: 0x1F46D, hue: 340 }, // 👫-👭
  
  // Baby/family (pink/blue)
  { start: 0x1F476, end: 0x1F476, hue: 340 }, // 👶
  { start: 0x1F46A, end: 0x1F46A, hue: 200 }, // 👪
  
  // Buildings (gray/blue)
  { start: 0x1F3E0, end: 0x1F3F0, hue: 220 }, // 🏠-🏰
  
  // Vehicles (varies)
  { start: 0x1F697, end: 0x1F697, hue: 0 }, // 🚗 red car
  { start: 0x1F699, end: 0x1F699, hue: 200 }, // 🚙 blue SUV
  { start: 0x1F6EB, end: 0x1F6EC, hue: 200 }, // ✈️ airplane - blue
  
  // Flags - use varied colors
  { start: 0x1F1E6, end: 0x1F1FF, hue: 220 }, // Regional indicators
  
  // Default emoji ranges
  { start: 0x1F600, end: 0x1F64F, hue: 45 }, // Emoticons - yellow
  { start: 0x1F900, end: 0x1F9FF, hue: 45 }, // Supplemental symbols - yellow
];
