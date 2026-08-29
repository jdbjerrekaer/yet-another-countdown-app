import { registerPlugin } from '@capacitor/core';

export interface LiveActivityRequest {
  eventId: string;
  title: string;
  emoji: string;
  tintHex?: string;
  /** Localised fallback shown when there is nothing left to tick down to. */
  headline: string;
  /** ISO string; present only while the moment is still ahead. */
  targetDate?: string;
}

export interface LiveActivityPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  /** Starts what is missing and ends what no longer belongs. */
  sync(options: { activities: LiveActivityRequest[] }): Promise<{ started: string[]; supported: boolean }>;
  endAll(): Promise<void>;
}

const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivityPlugin');

export default LiveActivity;
