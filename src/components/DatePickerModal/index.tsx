import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { format, differenceInYears } from 'date-fns';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonToggle, IonDatetime, IonIcon } from '@ionic/react';
import { shareOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Share } from '@capacitor/share';
import { Dialog } from '@capacitor/dialog';
import EmojiKeyboardPlugin from '@/plugins/EmojiKeyboardPlugin';
import { CalendarIcon, RefreshCw, Trash2, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColorWheelPicker } from '@/components/ColorWheelPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptic } from '@/hooks/useHaptic';
import { getEmojiSuggestions } from '@/lib/emojiSuggestions';
import { isSafariMobile } from '@/lib/utils';
import { encodeEventImportLink } from '@/lib/eventImportLink';
import { toast } from '@/components/ui/sonner';

// Helper to get gradient from a hex color
const getGradientFromColor = (hex: string): string => {
  return `linear-gradient(135deg, ${hex} 0%, ${adjustColorBrightness(hex, 20)} 100%)`;
};

// Helper function to adjust color brightness for gradient
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, date: Date, emoji: string, isRecurring: boolean, emojiColor?: string) => void | Promise<void>;
  initialTitle?: string;
  initialDate?: Date;
  initialEmoji?: string;
  initialEmojiColor?: string;
  initialIsRecurring?: boolean;
  initialIsImported?: boolean;
  initialImportedFrom?: string;
  isEditing?: boolean;
  onDelete?: () => Promise<boolean> | boolean;
  onValidityChange?: (canSave: boolean) => void;
  onConfirmDateChange?: (title: string, oldDate: Date, newDate: Date) => Promise<boolean>;
}

export interface DatePickerModalRef {
  save: () => Promise<void>;
  canSave: () => boolean;
  hasDateChanged: () => boolean;
  getCurrentDate: () => Date | undefined;
  focusInput: () => void;
}

const EMOJI_OPTIONS = ['🎯', '🎉', '✈️', '💍', '🎂', '🎄', '🌟', '🏆', '💪', '🎓', '🏠', '👶'];

export const DatePickerModal = forwardRef<DatePickerModalRef, DatePickerModalProps>(({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialDate,
  initialEmoji = '',
  initialEmojiColor,
  initialIsRecurring = false,
  initialIsImported = false,
  initialImportedFrom,
  isEditing = false,
  onDelete,
  onValidityChange,
  onConfirmDateChange,
}, ref) => {
  const { t } = useTranslation();
  
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [emoji, setEmoji] = useState(initialEmoji);
  // Default to blue if no initial color provided
  const DEFAULT_COLOR = '#3b82f6';
  const [emojiColor, setEmojiColor] = useState<string>(initialEmojiColor || DEFAULT_COLOR);
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring ?? false);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmojiValue, setCustomEmojiValue] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const { trigger } = useHaptic();
  const prevIsOpenRef = useRef(false);
  const customEmojiInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const originalDateRef = useRef<Date | undefined>(undefined);
  const colorManuallyChangedRef = useRef(false);
  const emojiKeyboardListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);
  const [colorPickerKey, setColorPickerKey] = useState(0);
  const [emojiAnimationKey, setEmojiAnimationKey] = useState(0);
  const prevSuggestedEmojisRef = useRef<string[]>([]);
  const yearlySuggestionBannerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const datetimeRef = useRef<HTMLIonDatetimeElement | null>(null);
  const isInitialOpenRef = useRef(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [modalSessionKey, setModalSessionKey] = useState(0);
  const [showYearlySuggestion, setShowYearlySuggestion] = useState(false);
  const [isYearlySuggestionExiting, setIsYearlySuggestionExiting] = useState(false);

  // Compute suggested emojis based on title input
  const suggestedEmojis = useMemo(() => {
    const trimmed = title.trim();
    if (!trimmed) {
      // No title yet: show defaults
      return EMOJI_OPTIONS;
    }
    const results = getEmojiSuggestions(trimmed, 12);
    if (results.length === 0) {
      // No matches: fall back to defaults
      return EMOJI_OPTIONS;
    }
    let list = results.map((r) => r.unicode);
    // If current emoji is in EMOJI_OPTIONS but not in suggestions, add it so it can be highlighted
    // This ensures standard emojis aren't treated as custom when editing
    if (emoji && EMOJI_OPTIONS.includes(emoji) && !list.includes(emoji)) {
      // Ensure current emoji is always included, even if list is full
      if (list.length >= 12) {
        list = list.slice(0, 11); // Make room for the current emoji
      }
      list = [...list, emoji];
    }
    return list;
  }, [title, emoji]);

  // Track emoji list changes to trigger animations
  useEffect(() => {
    const prevEmojis = prevSuggestedEmojisRef.current.join(',');
    const currentEmojis = suggestedEmojis.join(',');
    
    if (prevEmojis !== currentEmojis && prevEmojis !== '') {
      // Emoji list changed, trigger animation
      setEmojiAnimationKey(prev => prev + 1);
    }
    
    prevSuggestedEmojisRef.current = suggestedEmojis;
  }, [suggestedEmojis]);

  // Reset form state only when modal opens (not on every prop change)
  useEffect(() => {
    // Only reset when transitioning from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      isInitialOpenRef.current = true;
      setHasAnimated(false);
      setModalSessionKey(prev => prev + 1);
      
      setTitle(initialTitle || '');
      // Ensure initial date has 8am time for new events
      let dateToSet = initialDate;
      if (!initialDate && !isEditing) {
        const today = new Date();
        today.setHours(8, 0, 0, 0);
        dateToSet = today;
      }
      setDate(dateToSet);
      // Store original date for change detection when editing (create a copy to avoid reference issues)
      if (isEditing && initialDate) {
        originalDateRef.current = new Date(initialDate.getTime());
      } else {
        originalDateRef.current = undefined;
      }
      setEmoji(initialEmoji ?? '');
      setEmojiColor(initialEmojiColor || DEFAULT_COLOR);
      setIsRecurring(initialIsRecurring ?? false);
      // Reset manual change flag when modal opens
      colorManuallyChangedRef.current = false;
      // Increment key to force ColorWheelPicker remount with correct initial value
      setColorPickerKey(prev => prev + 1);
      
      // Reset emoji animation state when modal opens
      setEmojiAnimationKey(0);
      prevSuggestedEmojisRef.current = [];
      
      // Initialize yearly suggestion state based on initial conditions
      setIsYearlySuggestionExiting(false);
      // Check if banner should be shown based on initial props
      const initialShouldShow = dateToSet && !(initialIsRecurring ?? false) && differenceInYears(new Date(), dateToSet) >= 1;
      setShowYearlySuggestion(initialShouldShow);
      
      setTimeout(() => {
        isInitialOpenRef.current = false;
      }, 500);
      
      // Try to focus immediately when modal opens (while still in user gesture context for Safari mobile)
      if (!isEditing && titleInputRef.current) {
        // Immediate attempt while in user gesture context
        const input = titleInputRef.current;
        // Try focus immediately (within user gesture context)
        try {
          input.focus();
        } catch (e) {
          // Ignore focus errors
        }
        
        // Also try after a short delay
        requestAnimationFrame(() => {
          if (input && document.activeElement !== input) {
            try {
              input.focus();
              // Ensure input is visible
              if (input.offsetParent === null) {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } catch (e) {
              // Ignore focus errors
            }
          }
        });
      }
    }
    if (!isOpen && prevIsOpenRef.current) {
      isInitialOpenRef.current = false;
      if (emojiKeyboardListenerRef.current) {
        emojiKeyboardListenerRef.current.remove().catch(() => {});
        emojiKeyboardListenerRef.current = null;
      }
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        EmojiKeyboardPlugin.hideEmojiKeyboard().catch(() => {});
      }
      setShowCustomEmojiInput(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTitle, initialDate, initialEmoji, initialEmojiColor, initialIsRecurring, isEditing]);

  const handleClose = () => {
    trigger('light');
    onClose();
  };

  const handleDismiss = () => {
    onClose();
  };

  // Handle modal presentation - focus input after modal is fully presented
  const handleModalPresent = async () => {
    if (!isEditing && titleInputRef.current) {
      const input = titleInputRef.current;
      const isNative = Capacitor.isNativePlatform();
      
      // Multiple focus attempts with increasing delays (works for desktop and mobile)
      const attempts = [100, 250, 400, 600];
      
      attempts.forEach(async (delay, index) => {
        setTimeout(async () => {
          if (!input) return;
          
          // Check if input is visible and ready
          const isVisible = input.offsetParent !== null && 
                           input.offsetWidth > 0 && 
                           input.offsetHeight > 0;
          
          if (isVisible) {
            try {
              // Focus the input
              input.focus();
              
              // Set selection to trigger cursor
              if (input.setSelectionRange) {
                input.setSelectionRange(0, 0);
              }
              
              // On native iOS, explicitly show keyboard using Capacitor (only on last attempt)
              if (isNative && index === attempts.length - 1) {
                try {
                  await Keyboard.show();
                } catch (e) {
                  // Keyboard plugin may not be available
                }
              }
            } catch (e) {
              // Ignore errors
            }
          }
        }, delay);
      });
    }
  };

  const canSave = () => Boolean(title && date && emoji);

  // Check if the date has changed from the original (for editing mode)
  const hasDateChanged = (): boolean => {
    if (!isEditing || !originalDateRef.current || !date) {
      return false;
    }
    // Compare both date and time - ensure both are valid dates
    if (isNaN(originalDateRef.current.getTime()) || isNaN(date.getTime())) {
      return false;
    }
    return originalDateRef.current.getTime() !== date.getTime();
  };

  // Notify parent when validity changes
  useEffect(() => {
    if (onValidityChange) {
      onValidityChange(canSave());
    }
  }, [title, date, emoji, onValidityChange]);

  // Manage yearly suggestion banner visibility with exit animation
  useEffect(() => {
    const shouldShow = date && !isRecurring && differenceInYears(new Date(), date) >= 1;
    
    if (shouldShow) {
      // Banner should appear
      if (!showYearlySuggestion) {
        // Reset exit state and show it
        setIsYearlySuggestionExiting(false);
        setShowYearlySuggestion(true);
      } else if (isYearlySuggestionExiting) {
        // If it's currently exiting but should show, cancel the exit
        setIsYearlySuggestionExiting(false);
      }
    } else {
      // Banner should disappear
      if (showYearlySuggestion && !isYearlySuggestionExiting) {
        // Trigger exit animation
        setIsYearlySuggestionExiting(true);
        
        // After animation completes, hide the banner
        const timer = setTimeout(() => {
          setShowYearlySuggestion(false);
          setIsYearlySuggestionExiting(false);
        }, 350); // Match animation duration
        
        return () => clearTimeout(timer);
      }
    }
  }, [date, isRecurring, showYearlySuggestion, isYearlySuggestionExiting]);

  // Close month/year picker when a month or year is selected
  useEffect(() => {
    if (!isOpen) return;
    
    const datetimeElement = datetimeRef.current;
    if (!datetimeElement) return;
    
    let observer: MutationObserver | null = null;
    let columnObservers: MutationObserver[] = [];
    
    const closeMonthYearPicker = () => {
      const shadowRoot = datetimeElement.shadowRoot;
      if (shadowRoot && datetimeElement.classList.contains('month-year-picker-open')) {
        const toggleButton = shadowRoot.querySelector('.calendar-month-year-toggle');
        if (toggleButton instanceof HTMLElement) {
          toggleButton.click();
        }
      }
    };
    
    const setupPickerObservers = () => {
      const shadowRoot = datetimeElement.shadowRoot;
      if (!shadowRoot) return;
      
      // Find picker columns in the datetime-year section
      const pickerColumns = shadowRoot.querySelectorAll('.datetime-year ion-picker-column');
      
      pickerColumns.forEach(column => {
        const colObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.attributeName === 'value') {
              setTimeout(closeMonthYearPicker, 200);
              break;
            }
          }
        });
        colObserver.observe(column, { attributes: true, attributeFilter: ['value'] });
        columnObservers.push(colObserver);
      });
    };
    
    // Watch for when month-year picker opens
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          if (datetimeElement.classList.contains('month-year-picker-open')) {
            // Picker opened - set up column observers
            setTimeout(setupPickerObservers, 100);
          } else {
            // Picker closed - clean up column observers
            columnObservers.forEach(obs => obs.disconnect());
            columnObservers = [];
          }
        }
      }
    });
    
    observer.observe(datetimeElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      observer?.disconnect();
      columnObservers.forEach(obs => obs.disconnect());
    };
  }, [isOpen]);

  // Smooth scroll when yearly suggestion banner appears
  useEffect(() => {
    if (showYearlySuggestion && !isYearlySuggestionExiting && yearlySuggestionBannerRef.current && !isInitialOpenRef.current) {
      // Small delay to ensure the element is rendered and animation starts
      const timer = setTimeout(async () => {
        if (yearlySuggestionBannerRef.current) {
          const contentElement = contentRef.current;
          
          if (contentElement) {
            try {
              // Get current scroll position
              const scrollElement = await contentElement.getScrollElement();
              if (scrollElement && yearlySuggestionBannerRef.current) {
                // Get the banner's position relative to the scroll container
                const bannerRect = yearlySuggestionBannerRef.current.getBoundingClientRect();
                const containerRect = scrollElement.getBoundingClientRect();
                
                // Calculate how much to scroll to bring banner into view
                const scrollAmount = bannerRect.top - containerRect.top - 20; // 20px padding from top
                
                if (scrollAmount > 0) {
                  scrollElement.scrollBy({
                    top: scrollAmount,
                    behavior: 'smooth',
                  });
                }
              }
            } catch (error) {
              // Fallback to scrollIntoView if getScrollElement fails
              yearlySuggestionBannerRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            }
          } else {
            // Fallback to scrollIntoView
            yearlySuggestionBannerRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showYearlySuggestion, isYearlySuggestionExiting]);

  const handleSave = async () => {
    if (title && date && emoji) {
      // If editing and date has changed, show confirmation dialog
      if (isEditing && hasDateChanged() && onConfirmDateChange && originalDateRef.current) {
        const confirmed = await onConfirmDateChange(title, originalDateRef.current, date);
        if (!confirmed) {
          // User cancelled, don't save
          trigger('light');
          return;
        }
      }
      
      // Check if creating a new event with a date > 1 year in the past and not recurring
      let finalIsRecurring = isRecurring;
      if (!isEditing && !isRecurring && differenceInYears(new Date(), date) >= 1) {
        // Prompt user to make it yearly using native Dialog (wider, with highlighted primary button)
        let shouldMakeYearly = false;
        
        try {
          const { value } = await Dialog.confirm({
            title: t('dialogs.suggestYearly.title'),
            message: t('dialogs.suggestYearly.message'),
            okButtonTitle: t('dialogs.suggestYearly.enable'),
            cancelButtonTitle: t('dialogs.suggestYearly.keepOneTime'),
          });
          shouldMakeYearly = value;
          
          if (shouldMakeYearly) {
            finalIsRecurring = true;
          }
        } catch (error) {
          // If dialog is dismissed, treat it as "keep one-time" - don't make it yearly
          // shouldMakeYearly already defaults to false, so event will be created as one-time
          console.error('Yearly suggestion dialog dismissed or failed:', error);
        }
      }
      
      await onSave(title, date, emoji, finalIsRecurring, emojiColor);
      // Trigger haptic feedback after successful save (for both creating and editing)
      trigger('medium');
      onClose();
    }
  };

  // Focus input method - transfers focus from proxy input to modal input (Safari mobile fix)
  const focusInput = async () => {
    if (isEditing) return;
    
    // On native iOS, use Capacitor Keyboard plugin to show keyboard
    const isNative = Capacitor.isNativePlatform();
    
    // Schedule focus attempts for when modal and input are ready
    const attempts = [100, 250, 400, 600, 800];
    attempts.forEach((delay) => {
      setTimeout(async () => {
        const input = titleInputRef.current;
        if (!input) return;
        
        // Check if input is visible and ready
        const isVisible = input.offsetParent !== null && 
                         input.offsetWidth > 0 && 
                         input.offsetHeight > 0;
        
        if (isVisible) {
          try {
            // Focus the input
            input.focus();
            
            // Set selection to trigger cursor
            if (input.setSelectionRange) {
              input.setSelectionRange(0, 0);
            }
            
            // On native iOS, explicitly show keyboard using Capacitor
            if (isNative) {
              try {
                await Keyboard.show();
              } catch (e) {
                // Keyboard plugin may not be available
              }
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }, delay);
    });
  };

  // Expose save method to parent via ref
  // Must include all dependencies that handleSave and other functions use
  // to prevent stale closures when called from parent
  useImperativeHandle(ref, () => ({
    save: handleSave,
    canSave,
    hasDateChanged,
    getCurrentDate: () => date,
    focusInput,
  }), [title, date, emoji, isRecurring, emojiColor, isEditing, onConfirmDateChange, onSave, onClose, trigger]);

  const handleEmojiSelect = async (e: string) => {
    trigger('light');
    setEmoji(e);
    
    // Clean up listener
    if (emojiKeyboardListenerRef.current) {
      await emojiKeyboardListenerRef.current.remove();
      emojiKeyboardListenerRef.current = null;
    }
    
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      EmojiKeyboardPlugin.hideEmojiKeyboard().catch(() => {});
    }
    
    setShowCustomEmojiInput(false);
  };

  const handleCustomEmojiClick = async () => {
    trigger('light');
    setShowCustomEmojiInput(true);
    setCustomEmojiValue('');
    
    if (emojiKeyboardListenerRef.current) {
      await emojiKeyboardListenerRef.current.remove();
      emojiKeyboardListenerRef.current = null;
    }
    
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      try {
        await EmojiKeyboardPlugin.showEmojiKeyboard({ initialText: '' });
        const listener = await EmojiKeyboardPlugin.addListener('emojiTextChanged', (data) => {
          const emojiText = data.text || '';
          if (emojiText) {
            const emojiMatch = emojiText.match(/[\p{Emoji}\p{Extended_Pictographic}]/u);
            if (emojiMatch) {
              setCustomEmojiValue(emojiMatch[0]);
              setTimeout(() => {
                handleEmojiSelect(emojiMatch[0]);
              }, 100);
            }
          }
        });
        emojiKeyboardListenerRef.current = listener;
      } catch (error) {
        console.warn('Failed to show emoji keyboard plugin, falling back to HTML input:', error);
        setTimeout(() => {
          customEmojiInputRef.current?.focus();
        }, 100);
      }
    } else {
      setTimeout(() => {
        customEmojiInputRef.current?.focus();
      }, 100);
    }
  };

  const handleCustomEmojiInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const emojiRegex = /[\p{Emoji}\p{Extended_Pictographic}]/gu;
    const emojis = value.match(emojiRegex);
    if (emojis && emojis.length > 0) {
      setCustomEmojiValue(emojis[0]);
      setTimeout(() => {
        handleEmojiSelect(emojis[0]);
      }, 100);
    } else {
      setCustomEmojiValue('');
    }
  };

  const handleCustomEmojiSubmit = async () => {
    // Clean up listener
    if (emojiKeyboardListenerRef.current) {
      await emojiKeyboardListenerRef.current.remove();
      emojiKeyboardListenerRef.current = null;
    }
    
    if (customEmojiValue.trim()) {
      const emojiMatch = customEmojiValue.match(/[\p{Emoji}\p{Extended_Pictographic}]/u);
      if (emojiMatch) {
        handleEmojiSelect(emojiMatch[0]);
      }
    }
    
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      EmojiKeyboardPlugin.hideEmojiKeyboard().catch(() => {});
    }
    
    setShowCustomEmojiInput(false);
  };

  const handleRecurringToggle = (checked: boolean) => {
    trigger('selection');
    setIsRecurring(checked);
  };


  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      trigger('light');
      const shouldClose = await onDelete();
      // Only close the modal if deletion was confirmed
      if (shouldClose) {
        onClose();
      }
    }
  };

  const handleShareClick = async () => {
    if (!title || !date || !emoji) {
      return;
    }

    trigger('light');

    try {
      const importLink = encodeEventImportLink({
        title,
        targetDate: date.toISOString(),
        emoji,
        emojiColor,
        isRecurring,
      });

      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Use Capacitor Share plugin for native platforms
        try {
          await Share.share({
            title: `${emoji} ${title}`,
            text: `${emoji} ${title}`,
            url: importLink,
            dialogTitle: t('modal.shareEvent'),
          });
        } catch (shareError: any) {
          const message = shareError?.message?.toLowerCase() || '';
          if (message.includes('cancel') || message.includes('dismiss')) {
            return;
          }
          throw shareError;
        }
      } else {
        // Web fallback: Use Web Share API if available
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${emoji} ${title}`,
              text: `${emoji} ${title}`,
              url: importLink,
            });
          } catch (shareError: any) {
            // User cancelled or error occurred
            if (shareError.name !== 'AbortError') {
              // Only show error if it wasn't a cancellation
              throw shareError;
            }
          }
        } else {
          // Fallback: Copy to clipboard
          await navigator.clipboard.writeText(importLink);
          toast.success(t('modal.shareLinkCopied'));
        }
      }
    } catch (error) {
      console.error('Failed to share event:', error);
      toast.error(t('modal.shareError'));
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleDismiss}
      onDidPresent={handleModalPresent}
      aria-labelledby="modal-title"
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleClose}>{t('modal.cancel')}</IonButton>
          </IonButtons>
          <IonTitle id="modal-title">
            {isEditing ? t('modal.editEvent') : t('modal.newEvent')}
          </IonTitle>
          {isEditing && title && date && emoji && (
            <IonButtons slot="end">
              <IonButton onClick={handleShareClick} aria-label={t('aria.shareEvent')}>
                <IonIcon icon={shareOutline} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="ion-padding">
        {/* Form content */}
          <div 
            key={`modal-content-${modalSessionKey}`}
            className="space-y-6"
          >
            {/* Title input */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-muted-foreground pl-4">
                {t('modal.titleLabel')}
              </Label>
              <div className="relative">
                <Input
                  ref={titleInputRef}
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => setIsTitleFocused(true)}
                  onBlur={() => setIsTitleFocused(false)}
                  placeholder={t('modal.eventNamePlaceholder')}
                  autoFocus={!isEditing && !Capacitor.isNativePlatform() && !isSafariMobile()}
                  className="h-12 rounded-xl text-base bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 pr-10 pl-4"
                />
                {isTitleFocused && title && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTitle('');
                      // Use setTimeout to ensure the input stays focused after clearing
                      setTimeout(() => {
                        titleInputRef.current?.focus();
                      }, 0);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center hover:bg-secondary/80 active:bg-secondary text-muted-foreground hover:text-foreground animate-blur-in"
                    aria-label={t('aria.clearInput')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isEditing && initialIsImported && initialImportedFrom && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 pl-4">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{t('modal.importedFrom', { calendar: initialImportedFrom })}</span>
                </div>
              )}
            </div>

            {/* Emoji picker - selected emoji shows the chosen color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground pl-4">{t('modal.emojiLabel')}</Label>
              <div 
                key={suggestedEmojis.join(',')}
                className="flex gap-2 flex-wrap"
              >
                {suggestedEmojis.map((e, index) => {
                  const isCustomEmojiSelected = emoji !== '' && !suggestedEmojis.includes(emoji) && !EMOJI_OPTIONS.includes(emoji);
                  const isSelected = emoji === e && !isCustomEmojiSelected && !showCustomEmojiInput;
                  
                  return (
                    <button
                      key={`${e}-${index}`}
                      style={{
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease, box-shadow 150ms ease',
                        animationDelay: `${index * 30}ms`,
                        ...(isSelected ? { 
                          backgroundColor: emojiColor,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
                        } : {}),
                      }}
                      onClick={() => handleEmojiSelect(e)}
                      className={`w-14 h-14 rounded-xl flex items-center justify-center active:scale-90 emoji-suggestion-enter ${
                        isSelected
                          ? 'border-[3px] border-white/90 text-xl'
                          : 'bg-secondary/50 hover:bg-secondary text-2xl'
                      }`}
                    >
                      {e}
                    </button>
                  );
                })}
                {/* Custom emoji - show if a custom emoji is selected (not in suggestedEmojis and not in EMOJI_OPTIONS) and input is not showing */}
                {emoji !== '' && !suggestedEmojis.includes(emoji) && !EMOJI_OPTIONS.includes(emoji) && !showCustomEmojiInput && (
                  <button
                    style={{
                      transform: 'scale(1.1)',
                      transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                      backgroundColor: emojiColor,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
                      animationDelay: `${suggestedEmojis.length * 30}ms`,
                    }}
                    onClick={() => {}}
                    className="w-14 h-14 rounded-xl text-xl flex items-center justify-center border-[3px] border-white/90 emoji-suggestion-enter"
                    aria-label={t('aria.selectedEmoji', { emoji })}
                  >
                    {emoji}
                  </button>
                )}
                {/* Custom emoji input or button */}
                {showCustomEmojiInput ? (
                  <div 
                    className="flex items-center gap-1 emoji-suggestion-enter"
                    style={{
                      animationDelay: `${(suggestedEmojis.length + 1) * 30}ms`,
                    }}
                  >
                    <input
                      ref={customEmojiInputRef}
                      type="text"
                      value={customEmojiValue}
                      onChange={handleCustomEmojiInput}
                      onInput={handleCustomEmojiInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomEmojiSubmit();
                        } else if (e.key === 'Escape') {
                          setShowCustomEmojiInput(false);
                          if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
                            EmojiKeyboardPlugin.hideEmojiKeyboard().catch(() => {});
                          }
                        }
                        // Prevent non-emoji characters
                        const key = e.key;
                        if (key.length === 1 && !/[\p{Emoji}\p{Extended_Pictographic}]/u.test(key)) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={async () => {
                        if (emojiKeyboardListenerRef.current) {
                          await emojiKeyboardListenerRef.current.remove();
                          emojiKeyboardListenerRef.current = null;
                        }
                        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
                          EmojiKeyboardPlugin.hideEmojiKeyboard().catch(() => {});
                        }
                        setTimeout(() => {
                          if (!customEmojiValue) {
                            setShowCustomEmojiInput(false);
                          }
                        }, 150);
                      }}
                      placeholder={t('modal.customEmojiPlaceholder')}
                      className="w-14 h-14 rounded-xl text-2xl text-center border-2 border-primary/50 focus:border-primary outline-none [&::placeholder]:opacity-30"
                      style={{
                        background: getGradientFromColor(emojiColor),
                        color: 'white'
                      }}
                      maxLength={2}
                      inputMode="text"
                      enterKeyHint="done"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                  </div>
                ) : (
                  <button
                    style={{
                      transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                      animationDelay: `${(suggestedEmojis.length + 1) * 30}ms`,
                    }}
                    className="w-14 h-14 rounded-xl flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:scale-105 active:scale-90 emoji-suggestion-enter"
                    onClick={handleCustomEmojiClick}
                    aria-label={t('modal.customEmojiTitle')}
                  >
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Color picker wheel */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground pl-4" style={{ position: 'relative', top: '-8px' }}>{t('modal.colorLabel')}</Label>
              <ColorWheelPicker 
                key={colorPickerKey}
                value={emojiColor} 
                onChange={setEmojiColor}
                emoji={emoji}
                onManualChange={() => {
                  colorManuallyChangedRef.current = true;
                }}
              />
            </div>
            
            {/* Date picker, recurring toggle, and date display grouped with reduced spacing */}
            <div className="space-y-3">
              {/* Date picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground pl-4">{t('modal.dateLabel')}</Label>
                <div className="bg-secondary/40 rounded-2xl overflow-hidden">
                  {/* Native Ionic Calendar */}
                  <div className="p-2 flex justify-center">
                    <IonDatetime
                      ref={datetimeRef}
                      presentation="date"
                      value={date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : undefined}
                      onIonChange={(e) => {
                        trigger('medium');
                        const value = (e.detail as any).value;
                        if (value && typeof value === 'string') {
                          // Parse the date string as local date (YYYY-MM-DD format)
                          const [year, month, day] = value.split('T')[0].split('-').map(Number);
                          const newDate = new Date(year, month - 1, day);
                          // For new events, set time to 8am; for editing, preserve existing time
                          if (!isEditing) {
                            newDate.setHours(8, 0, 0, 0);
                          } else if (date) {
                            // Preserve the time from the existing date when editing
                            newDate.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
                          }
                          setDate(newDate);
                        }
                      }}
                      min="1900-01-01"
                      max={(() => {
                        const maxDate = new Date();
                        maxDate.setFullYear(maxDate.getFullYear() + 5);
                        return `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
                      })()}
                      firstDayOfWeek={1}
                      showDefaultTitle={false}
                      showDefaultButtons={false}
                      style={{
                        width: '100%',
                        // maxWidth: '350px',
                      } as React.CSSProperties}
                      className="datetime-fixed-width"
                    />
                  </div>
                </div>
              </div>

              {/* Recurring toggle with expandable suggestion */}
              <div 
                className="bg-secondary/40 rounded-2xl overflow-hidden"
              >
                {/* Main recurring toggle row */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('modal.repeatYearlyLabel')}</p>
                      <p className="text-sm text-muted-foreground">{t('modal.repeatYearlySublabel')}</p>
                    </div>
                  </div>
                  <IonToggle 
                    checked={isRecurring} 
                    onIonChange={(e) => handleRecurringToggle(e.detail.checked)}
                  />
                </div>
                
                {/* Yearly suggestion - slides out from bottom when date is old */}
                {showYearlySuggestion && !isYearlySuggestionExiting && (
                  <div 
                    className="overflow-hidden animate-slide-down"
                  >
                    {/* Divider */}
                    <div className="mx-4 border-t border-border/50" />
                    
                    {/* Suggestion content */}
                    <div className="p-4 pl-[68px] flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{t('modal.yearlySuggestionHint')}</p>
                        <p className="text-sm text-muted-foreground">{t('modal.yearlySuggestionReason')}</p>
                      </div>
                      <IonButton
                        onClick={() => {
                          trigger('medium');
                          setIsRecurring(true);
                        }}
                        size="small"
                        fill="solid"
                        className="font-bold tracking-tight m-0 h-8 black-button min-w-[80px]"
                      >
                        {t('modal.enableYearly')}
                      </IonButton>
                    </div>
                  </div>
                )}
              </div>

              {/* Date display */}
              {date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center pt-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</span>
                  {isRecurring && <RefreshCw className="w-3.5 h-3.5 text-primary" />}
                </div>
              )}
            </div>

            {/* Advanced section - only show when editing */}
            {isEditing && onDelete && (
              <div className="pt-4 border-t border-border/50">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('modal.advancedLabel')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="w-full py-3 px-4 rounded-xl bg-destructive/10 text-destructive font-medium active:opacity-70 transition-opacity flex items-center justify-center gap-2"
                    aria-label={t('aria.deleteEvent')}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('modal.delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
      </IonContent>
    </IonModal>
  );
});
