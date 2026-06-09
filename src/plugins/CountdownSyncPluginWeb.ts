import { WebPlugin } from '@capacitor/core';
import type {
  CountdownSyncPluginInterface,
  PushCountdownsOptions,
  PushCountdownsResult,
  PullCountdownsResult,
} from './CountdownSyncPlugin';

/**
 * Web fallback — iCloud key-value storage is Apple-only, so on web every
 * operation is a graceful no-op. The app keeps working with localStorage only.
 */
export class CountdownSyncPluginWeb
  extends WebPlugin
  implements CountdownSyncPluginInterface
{
  async pushCountdowns(_options: PushCountdownsOptions): Promise<PushCountdownsResult> {
    return { success: false, reason: 'unsupported' };
  }

  async pullCountdowns(): Promise<PullCountdownsResult> {
    return { json: null, updatedAt: null, hasData: false };
  }

  async getRemoveAds(): Promise<{ value: boolean }> {
    return { value: false };
  }

  async setRemoveAds(): Promise<{ success: boolean }> {
    return { success: false };
  }
}
