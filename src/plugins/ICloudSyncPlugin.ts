import { registerPlugin } from '@capacitor/core';

export interface ICloudSyncAvailability {
  available: boolean;
}

export interface ICloudSyncGetOptions {
  key: string;
}

export interface ICloudSyncSetOptions {
  key: string;
  value?: string | null;
}

export interface ICloudSyncGetResult {
  value: string | null;
}

export interface ICloudSyncSetResult {
  success: boolean;
}

export interface ICloudSyncChangeEvent {
  keys: string[];
  reason?: number;
}

export interface ICloudSyncPluginInterface {
  isAvailable(): Promise<ICloudSyncAvailability>;
  getString(options: ICloudSyncGetOptions): Promise<ICloudSyncGetResult>;
  setString(options: ICloudSyncSetOptions): Promise<ICloudSyncSetResult>;
  addListener(
    eventName: 'kvStoreDidChange',
    listenerFunc: (event: ICloudSyncChangeEvent) => void
  ): Promise<{ remove: () => Promise<void> }>;
  removeAllListeners(): Promise<void>;
}

const ICloudSyncPlugin = registerPlugin<ICloudSyncPluginInterface>('ICloudSyncPlugin', {
  web: () => import('./ICloudSyncPluginWeb').then(m => new m.ICloudSyncPluginWeb()),
});

export default ICloudSyncPlugin;
