import { WebPlugin } from '@capacitor/core';
import type { 
  EmojiKeyboardPluginInterface,
  ShowEmojiKeyboardOptions,
  ShowEmojiKeyboardResult,
  HideEmojiKeyboardResult,
  GetEmojiTextResult,
  SetEmojiTextOptions,
  SetEmojiTextResult
} from './EmojiKeyboardPlugin';

export class EmojiKeyboardPluginWeb extends WebPlugin implements EmojiKeyboardPluginInterface {
  private currentText: string = '';

  async showEmojiKeyboard(options?: ShowEmojiKeyboardOptions): Promise<ShowEmojiKeyboardResult> {
    if (options?.initialText) {
      this.currentText = options.initialText;
    }
    return {
      success: true,
      text: this.currentText,
    };
  }

  async hideEmojiKeyboard(): Promise<HideEmojiKeyboardResult> {
    return {
      success: true,
    };
  }

  async getEmojiText(): Promise<GetEmojiTextResult> {
    return {
      text: this.currentText,
    };
  }

  async setEmojiText(options: SetEmojiTextOptions): Promise<SetEmojiTextResult> {
    this.currentText = options.text;
    return {
      success: true,
      text: this.currentText,
    };
  }

  async addListener(
    eventName: 'emojiTextChanged',
    listenerFunc: (data: { text: string }) => void
  ): Promise<{ remove: () => Promise<void> }> {
    return {
      remove: async () => {},
    };
  }
}
