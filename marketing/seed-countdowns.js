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

  const events = [
    { title: "Mom's 60th Birthday",     emoji: "🎂", days: 23,  color: "#F4B8C1" },
    { title: "Summer in Santorini",      emoji: "🌊", days: 47,  color: "#8FC7E8" },
    { title: "Coldplay — Copenhagen",    emoji: "🎸", days: 64,  color: "#F4C95D" },
    { title: "Berlin Marathon",          emoji: "🏃", days: 89,  color: "#E89B6C" },
    { title: "Emma & Liam's Wedding",    emoji: "💍", days: 112, color: "#D9C7B8" },
    { title: "Moving Day: Lisbon",       emoji: "✈️", days: 201, color: "#A8C4A2" },
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
