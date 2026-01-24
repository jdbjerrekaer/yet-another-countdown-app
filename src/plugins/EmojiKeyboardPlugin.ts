import { registerPlugin } from '@capacitor/core';

/**
 * Options for showing emoji keyboard
 */
export interface ShowEmojiKeyboardOptions {
  initialText?: string;
}

/**
 * Result from showEmojiKeyboard
 */
export interface ShowEmojiKeyboardResult {
  success: boolean;
  text: string;
}

/**
 * Result from hideEmojiKeyboard
 */
export interface HideEmojiKeyboardResult {
  success: boolean;
}

/**
 * Result from getEmojiText
 */
export interface GetEmojiTextResult {
  text: string;
}

/**
 * Options for setting emoji text
 */
export interface SetEmojiTextOptions {
  text: string;
}

/**
 * Result from setEmojiText
 */
export interface SetEmojiTextResult {
  success: boolean;
  text: string;
}

/**
 * EmojiKeyboardPlugin interface for accessing native emoji keyboard
 */
export interface EmojiKeyboardPluginInterface {
  /**
   * Show emoji keyboard and return current text
   */
  showEmojiKeyboard(options?: ShowEmojiKeyboardOptions): Promise<ShowEmojiKeyboardResult>;

  /**
   * Hide emoji keyboard
   */
  hideEmojiKeyboard(): Promise<HideEmojiKeyboardResult>;

  /**
   * Get current emoji text
   */
  getEmojiText(): Promise<GetEmojiTextResult>;

  /**
   * Set emoji text programmatically
   */
  setEmojiText(options: SetEmojiTextOptions): Promise<SetEmojiTextResult>;

  /**
   * Add listener for emoji text changes
   */
  addListener(
    eventName: 'emojiTextChanged',
    listenerFunc: (data: { text: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const EmojiKeyboardPlugin = registerPlugin<EmojiKeyboardPluginInterface>('EmojiKeyboardPlugin', {
  web: () => import('./EmojiKeyboardPluginWeb').then(m => new m.EmojiKeyboardPluginWeb()),
});

export default EmojiKeyboardPlugin;
