#!/usr/bin/env python3
"""Capture the raw App Store screens for each locale set in locales.json.

  python3 capture.py en-US de ...   # specific sets
  python3 capture.py all            # every set

Per set: switch the simulator language (reboot), seed that market's countdowns
into the app's WebKit localStorage, then grab home / lock / list / style / shape
into raw/<set>/. The placed home- and lock-screen widgets are bound to the slot
ids in locales.json, so they pick up each set's events without re-configuring.
"""
import json, sqlite3, subprocess, sys, time
from datetime import datetime, timedelta
from pathlib import Path

SIM = "979B6F20-9A70-4310-A3D9-B28D09691BDE"
BUNDLE = "com.jonatanbjerrekaer.countdown"
AXE = str(next(Path.home().glob(".npm/_npx/*/node_modules/xcodebuildmcp/bundled/axe")))
HERE = Path(__file__).parent
CFG = json.loads((HERE / "locales.json").read_text())

# Points on iPhone 17 Pro Max (440x956). Row 2 = the birthday event.
BIRTHDAY_ROW = (220, 273)
EMOJI_BUTTON = (113, 307)  # 2nd emoji tile: the picker opens beside it, not clipped at the screen edge


def sh(*args, check=True):
    return subprocess.run(args, check=check, capture_output=True, text=True).stdout


def simctl(*args, check=True):
    return sh("xcrun", "simctl", *args, check=check)


def axe(*args):
    sh(AXE, *args, "--udid", SIM)


def ui_nodes():
    """Flattened accessibility tree of whatever is on screen (app or SpringBoard)."""
    out = subprocess.run([AXE, "describe-ui", "--udid", SIM], capture_output=True, text=True).stdout
    try:
        stack, flat = json.loads(out), []
    except json.JSONDecodeError:
        return []
    while stack:
        n = stack.pop()
        flat.append(n)
        stack.extend(n.get("children") or [])
    return flat


def wait_for_list(timeout=60):
    """Block until the list has rendered (first launch after a reboot is slow).

    The WKWebView content isn't in the accessibility tree, so check pixels: the
    first row's emoji tile is a saturated colour once drawn, near-white before.
    """
    from PIL import Image
    probe = HERE / "raw" / ".probe.png"
    end = time.time() + timeout
    while time.time() < end:
        simctl("io", SIM, "screenshot", str(probe))
        r, g, b = Image.open(probe).convert("RGB").getpixel((120, 545))
        if max(r, g, b) - min(r, g, b) > 40:
            probe.unlink()
            return
        time.sleep(1)
    raise TimeoutError("list never rendered")


def allow_live_activities():
    """Tap the right-hand button of the 'Allow Live Activities?' lock-screen prompt if it is up.

    Matched by position, not label, so it works in every system language.
    """
    for n in ui_nodes():
        f = n.get("frame") or {}
        if n.get("role") == "AXButton" and f.get("x", 0) > 200 and 600 < f.get("y", 0) < 760:
            axe("tap", "-x", str(int(f["x"] + f["width"] / 2)), "-y", str(int(f["y"] + f["height"] / 2)))
            time.sleep(2)
            return True
    return False


def shot(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    simctl("io", SIM, "screenshot", str(path))
    print("  ✓", path.relative_to(HERE))


def set_language(s):
    simctl("terminate", SIM, BUNDLE, check=False)
    simctl("spawn", SIM, "defaults", "write", "-g", "AppleLanguages", "-array", s["simLang"])
    simctl("spawn", SIM, "defaults", "write", "-g", "AppleLocale", "-string", s["simLocale"])
    simctl("shutdown", SIM, check=False)
    simctl("boot", SIM)
    simctl("bootstatus", SIM, "-b")
    time.sleep(8)  # SpringBoard settles after bootstatus returns
    simctl("status_bar", SIM, "override", "--time", "9:41", "--batteryState", "charged",
           "--batteryLevel", "100", "--cellularBars", "4", "--wifiBars", "3", "--operatorName", " ")


def event_date(days, now):
    if days == "today":
        # ponytail: Live Activities only start for same-day events, so stay before midnight.
        end_of_day = now.replace(hour=23, minute=59, second=0, microsecond=0)
        return min(now + timedelta(hours=3, minutes=39, seconds=39), end_of_day), True
    return (now + timedelta(days=days)).replace(hour=9, minute=0, second=0, microsecond=0), False


def seed(name, s):
    now = datetime.now().astimezone()
    events = []
    for slot in CFG["slots"]:
        k = slot["key"]
        days = s.get("days", {}).get(k, slot["days"])
        at, has_time = event_date(days, now)
        events.append({
            # The concert drives the Live Activity, whose title is fixed at start: a per-set id makes
            # the app end the previous set's activity and start a fresh, localized one.
            "id": f'{slot["id"]}-{name}' if days == "today" else slot["id"], "title": s["events"][k], "emoji": s.get("emoji", {}).get(k, slot["emoji"]),
            "emojiColor": slot["color"], "emojiShape": "squircle", "targetDate": at.astimezone().isoformat(),
            "hasTime": has_time, "isRecurring": False, "invertTimeFormat": False,
            "createdAt": now.isoformat(),
        })
    data = Path(simctl("get_app_container", SIM, BUNDLE, "data").strip())
    db = next((data / "Library/WebKit").rglob("localstorage.sqlite3"))
    values = {"countdowns": json.dumps(events, ensure_ascii=False), "countdownsLastUpdated": now.isoformat(),
              "i18nextLng": s["appLang"],
              # iCloud sync would merge other sets' concerts back in; tombstone them.
              "countdownsDeleted": json.dumps({f"{CFG['slots'][0]['id']}-{n}": now.isoformat()
                                               for n in CFG["sets"] if n != name}
                                              | {CFG['slots'][0]['id']: now.isoformat()}), "firstRunShown": "1", "widgetTipShown": "1", "reviewRequested": "1"}
    con = sqlite3.connect(db)
    for k, v in values.items():
        con.execute("INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)", (k, v.encode("utf-16-le")))
    con.commit()
    con.close()
    # The native Capacitor preference wins over the web i18nextLng on launch.
    # Must target the app container's plist; a bare domain write lands in a different store.
    simctl("spawn", SIM, "defaults", "write", str(data / "Library/Preferences" / BUNDLE),
           "CapacitorStorage.app_language", "-string", s["appLang"])


def capture(name):
    s = CFG["sets"][name]
    out = HERE / "raw" / name
    print(f"[{name}]")
    set_language(s)
    seed(name, s)
    simctl("launch", SIM, BUNDLE)
    wait_for_list()
    time.sleep(2)
    shot(out / "list.png")

    axe("tap", "-x", str(BIRTHDAY_ROW[0]), "-y", str(BIRTHDAY_ROW[1]))
    time.sleep(4)
    shot(out / "style.png")
    # Select a non-edge tile first (the selected tile opens the picker), then double-tap it.
    # A synthetic long-press never fires the 450ms pointer timer; the double-tap path does.
    axe("tap", "-x", str(EMOJI_BUTTON[0]), "-y", str(EMOJI_BUTTON[1]))
    time.sleep(1)
    for _ in range(2):
        axe("tap", "-x", str(EMOJI_BUTTON[0]), "-y", str(EMOJI_BUTTON[1]))
    time.sleep(1.5)
    shot(out / "shape.png")

    # Relaunch so the editor is closed and widgets/Live Activity sync from a clean list.
    simctl("terminate", SIM, BUNDLE, check=False)
    simctl("launch", SIM, BUNDLE)
    wait_for_list()
    time.sleep(3)
    axe("button", "home")
    time.sleep(4)
    shot(out / "home.png")

    axe("button", "lock")
    time.sleep(2)
    axe("button", "home")  # wake to the lock screen
    time.sleep(4)
    if allow_live_activities():
        print("  · allowed Live Activities")
    shot(out / "lock.png")
    axe("swipe", "--start-x", "220", "--start-y", "940", "--end-x", "220", "--end-y", "300")
    time.sleep(2)


def capture_shape(name):
    """Re-shoot only the shape picker: in-app screen, so no reboot needed."""
    s = CFG["sets"][name]
    simctl("terminate", SIM, BUNDLE, check=False)
    simctl("spawn", SIM, "defaults", "write", "-g", "AppleLanguages", "-array", s["simLang"])
    simctl("spawn", SIM, "defaults", "write", "-g", "AppleLocale", "-string", s["simLocale"])
    seed(name, s)
    simctl("launch", SIM, BUNDLE)
    wait_for_list()
    time.sleep(2)
    axe("tap", "-x", str(BIRTHDAY_ROW[0]), "-y", str(BIRTHDAY_ROW[1]))
    time.sleep(4)
    axe("tap", "-x", str(EMOJI_BUTTON[0]), "-y", str(EMOJI_BUTTON[1]))
    time.sleep(1)
    for _ in range(2):
        axe("tap", "-x", str(EMOJI_BUTTON[0]), "-y", str(EMOJI_BUTTON[1]))
    time.sleep(1.5)
    shot(HERE / "raw" / name / "shape.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    fn = capture_shape if args[:1] == ["--shape"] else capture
    args = args[1:] if fn is capture_shape else args
    for n in (list(CFG["sets"]) if args == ["all"] else args):
        print(f"[{n}]") if fn is capture_shape else None
        fn(n)
