// Paste this whole snippet into Safari Web Inspector → Console while the
// app is running in the simulator. It overwrites the 'countdowns' key
// with six themed lifestyle events (minimal-light aesthetic) and reloads.
//
// Base date assumes 2026-04-23 (offsets chosen to make the list visually
// varied: <30d, 23d / 47d / 64d / 89d / 112d / 201d).
(function () {
  const daysFromNow = (n) => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();

  // Audience mix: teen girls (14–17) + snus-quit streak (count-up, negative days)
  const events = [
    { title: "Emma's birthday",          emoji: "🎀", days: 5,   color: "#F4B8C1" },
    { title: "Taylor Swift — Stockholm", emoji: "🫶", days: 12,  color: "#E8A0BF" },
    { title: "Sommerferie",              emoji: "✈️", days: 33,  color: "#8FC7E8" },
    { title: "Roskilde Festival",        emoji: "🎪", days: 54,  color: "#F4C95D" },
    { title: "Snus-fri",                 emoji: "💪", days: -67, color: "#A8C4A2" },
    { title: "Christmas",                emoji: "🎄", days: 168, color: "#C97C7C" },
  ];

  const payload = events.map((e) => ({
    id: uid(),
    title: e.title,
    targetDate: daysFromNow(e.days),
    emoji: e.emoji,
    emojiColor: e.color,
    isRecurring: false,
    createdAt: now,
  }));

  localStorage.setItem("countdowns", JSON.stringify(payload));
  localStorage.setItem("countdownsLastUpdated", now);
  location.reload();
})();
