import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// "Legacy" (days-only) elapsed-time format. The toggle lives in the iOS
// Settings app (Settings.bundle key `legacy_time_format`), like the language
// picker — so we read it on mount and re-read whenever the app returns to the
// foreground (the user may have just flipped it in Settings).
let cached = false;
let started = false;
const listeners = new Set<(v: boolean) => void>();

async function refresh() {
  try {
    const { value } = await Preferences.get({ key: 'legacy_time_format' });
    const next = value === 'true' || value === '1' || value === 'YES';
    if (next !== cached) {
      cached = next;
      listeners.forEach((l) => l(next));
    }
  } catch {
    // ignore — defaults to semantic (false)
  }
}

function ensureStarted() {
  if (started) return;
  started = true;
  void refresh();
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void refresh();
    });
  }
}

export function useLegacyTimeFormat(): boolean {
  const [value, setValue] = useState(cached);
  useEffect(() => {
    ensureStarted();
    setValue(cached);
    const l = (v: boolean) => setValue(v);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return value;
}
