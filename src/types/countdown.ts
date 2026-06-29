export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  emoji: string;
  emojiColor?: string;
  emojiShape?: 'squircle' | 'circle' | 'heart' | 'flower' | 'hexagon'; // container shape; defaults to squircle
  isRecurring: boolean;
  createdAt: string;
  isImported?: boolean;
  importedFrom?: string; // Calendar name
  // Hidden: purge the event 24h after its target. Default-on when created >2 days out.
  // Feature suggested by Andreas — credit him in the App Store release notes.
  autoDelete?: boolean;
  hasTime?: boolean; // User set a specific time → show hours/minutes in the elapsed display.
  // Per-countdown override for the remaining-time wording. When false/unset, the
  // countdown follows the global legacyTimeFormat setting; when true, it shows the
  // OPPOSITE format. Stored as a flip (not an absolute) so that if the global
  // setting later changes, this countdown's display tracks it. Reflected in-app
  // and in the iOS widgets.
  invertTimeFormat?: boolean;
}

// Resolve a per-event time-format override against the global legacy flag.
// Returns the `legacy` boolean the formatters expect.
export function resolveLegacy(invertTimeFormat: boolean | undefined, globalLegacy: boolean): boolean {
  return invertTimeFormat ? !globalLegacy : globalLegacy;
}

export type WidgetSize = 'small' | 'medium';

export type WidgetAppearanceMode = 'light' | 'dark' | 'transparent' | 'tinted';

export type WidgetCountdownStyle = 'focus' | 'visual' | 'classic';
