import { WebPlugin } from '@capacitor/core';
import type {
  ICloudSyncAvailability,
  ICloudSyncChangeEvent,
  ICloudSyncGetOptions,
  ICloudSyncGetResult,
  ICloudSyncPluginInterface,
  ICloudSyncSetOptions,
  ICloudSyncSetResult,
} from './ICloudSyncPlugin';

export class ICloudSyncPluginWeb extends WebPlugin implements ICloudSyncPluginInterface {
  async isAvailable(): Promise<ICloudSyncAvailability> {
    return { available: false };
  }

  async getString(_options: ICloudSyncGetOptions): Promise<ICloudSyncGetResult> {
    return { value: null };
  }

  async setString(_options: ICloudSyncSetOptions): Promise<ICloudSyncSetResult> {
    return { success: false };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async addListener(
    _eventName: 'kvStoreDidChange',
    _listenerFunc: (event: ICloudSyncChangeEvent) => void
  ): Promise<{ remove: () => Promise<void> }> {
    return {
      remove: async () => {},
    };
  }
}
