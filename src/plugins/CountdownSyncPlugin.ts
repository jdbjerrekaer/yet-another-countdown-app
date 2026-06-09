import { registerPlugin } from '@capacitor/core';

/**
 * Options for pushing the countdown blob to iCloud key-value storage.
 */
export interface PushCountdownsOptions {
  /** Serialized countdown list (JSON.stringify of CountdownEvent[]). */
  json: string;
  /** ISO timestamp of when the local list was last updated. */
  updatedAt: string;
}

/**
 * Result of a push to iCloud key-value storage.
 */
export interface PushCountdownsResult {
  /** False if the write was skipped (e.g. blob too large) or sync failed. */
  success: boolean;
  /** Set when success is false to explain why (e.g. "tooLarge"). */
  reason?: string;
  byteCount?: number;
}

/**
 * Result of pulling the countdown blob from iCloud key-value storage.
 */
export interface PullCountdownsResult {
  /** Serialized countdown list, or null if iCloud has no data yet. */
  json: string | null;
  /** ISO timestamp stored alongside the blob, or null. */
  updatedAt: string | null;
  hasData: boolean;
}

/**
 * Whether iCloud key-value sync is usable on this device.
 */
export interface IsAvailableResult {
  /** False when the user is not signed into iCloud. */
  available: boolean;
}

/**
 * Bridges the countdown list to iCloud key-value storage
 * (NSUbiquitousKeyValueStore) so it syncs across the user's Apple devices.
 *
 * The web/JS layer remains the source of truth — this plugin only mirrors the
 * `countdowns` JSON blob and notifies JS via the `countdownsChanged` event when
 * another device changes it. JS owns the per-id merge / last-write-wins logic.
 */
export interface CountdownSyncPluginInterface {
  /** Write the countdown blob + timestamp to iCloud. */
  pushCountdowns(options: PushCountdownsOptions): Promise<PushCountdownsResult>;

  /** Read the current iCloud blob + timestamp. */
  pullCountdowns(): Promise<PullCountdownsResult>;

  /** Whether iCloud key-value sync is available (user signed into iCloud). */
  isAvailable(): Promise<IsAvailableResult>;

  /** Fires when another device changes the iCloud countdown blob. */
  addListener(
    eventName: 'countdownsChanged',
    listenerFunc: (data: { json: string; updatedAt: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const CountdownSyncPlugin = registerPlugin<CountdownSyncPluginInterface>('CountdownSyncPlugin', {
  web: () => import('./CountdownSyncPluginWeb').then(m => new m.CountdownSyncPluginWeb()),
});

export default CountdownSyncPlugin;
