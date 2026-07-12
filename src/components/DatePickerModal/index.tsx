import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { format, differenceInYears } from 'date-fns';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonToggle, IonDatetime, IonIcon } from '@ionic/react';
import { shareOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Share } from '@capacitor/share';
import { Dialog } from '@capacitor/dialog';
import EmojiKeyboardPlugin from '@/plugins/EmojiKeyboardPlugin';
import { CalendarIcon, Clock, RefreshCw, Trash2, Plus, X, Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColorWheelPicker } from '@/components/ColorWheelPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptic } from '@/hooks/useHaptic';
import { useLegacyTimeFormat } from '@/lib/useLegacyTimeFormat';
import { formatRelative } from '@/lib/relativeTime';
import { getEmojiSuggestions } from '@/lib/emojiSuggestions';
import { EmojiShape, normalizeShape } from '@/lib/emojiShapes';
import { EmojiShapePicker } from '@/components/EmojiShapePicker';
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

// Helper to safely normalize a date
function normalizeDate(date: Date | undefined, isEditing: boolean): Date {
  // If date is provided and valid, return it
  if (date && !isNaN(date.getTime())) {
    return date;
  }
  // Otherwise, return today at 8am
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  return today;
}

// Helper to format date for IonDatetime value prop
function formatDateForDatetime(date: Date | undefined): string | undefined {
  if (!date || isNaN(date.getTime())) {
    return undefined;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  return '';
}

function isWebShareAbort(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function getDatetimeValue(event: CustomEvent<{ value?: string | string[] | null }>): string | null {
  const value = event.detail.value;
  return typeof value === 'string' ? value : null;
}

export interface DatePickerModalRef {
  save: () => Promise<void>;
  canSave: () => boolean;
}

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, date: Date, emoji: string, isRecurring: boolean, hasSpecificTime: boolean, emojiColor?: string, emojiShape?: EmojiShape, invertTimeFormat?: boolean) => void | Promise<void>;
  initialTitle?: string;
  initialDate?: Date;
  initialEmoji?: string;
  initialEmojiColor?: string;
  initialEmojiShape?: string;
  initialInvertTimeFormat?: boolean;
  initialIsRecurring?: boolean;
  initialIsImported?: boolean;
  initialImportedFrom?: string;
  isEditing?: boolean;
  onDelete?: () => Promise<boolean> | boolean;
  onConfirmDateChange?: (title: string, oldDate: Date, newDate: Date) => Promise<boolean>;
  onCanSaveChange?: (canSave: boolean) => void;
}

const EMOJI_OPTIONS = ['🎯', '🎉', '✈️', '💍', '🎂', '🎄', '🌟', '🏆', '💪', '🎓', '🏠', '👶'];

export const DatePickerModal = forwardRef<DatePickerModalRef, DatePickerModalProps>(function DatePickerModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialDate,
  initialEmoji = '',
  initialEmojiColor,
  initialEmojiShape,
  initialInvertTimeFormat = false,
  initialIsRecurring = false,
  initialIsImported = false,
  initialImportedFrom,
  isEditing = false,
  onDelete,
  onConfirmDateChange,
  onCanSaveChange,
}: DatePickerModalProps, ref) {
  const { t } = useTranslation();
  
  const [title, setTitle] = useState(initialTitle);
  // Initialize with a concrete date so IonDatetime never mounts with an
  // undefined value — an undefined first render can leave the calendar empty.
  const [date, setDate] = useState<Date | undefined>(() => {
    const normalized = new Date(normalizeDate(initialDate, isEditing).getTime());
    if (!isEditing) {
      normalized.setHours(8, 0, 0, 0);
    }
    return normalized;
  });
  const [emoji, setEmoji] = useState(initialEmoji);
  // Default to blue if no initial color provided
  const DEFAULT_COLOR = '#3b82f6';
  const [emojiColor, setEmojiColor] = useState<string>(initialEmojiColor || DEFAULT_COLOR);
  const [emojiShape, setEmojiShape] = useState<EmojiShape>(normalizeShape(initialEmojiShape));
  const [invertTimeFormat, setInvertTimeFormat] = useState<boolean>(initialInvertTimeFormat ?? false);
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring ?? false);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmojiValue, setCustomEmojiValue] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const { trigger } = useHaptic();
  const legacyTimeFormat = useLegacyTimeFormat();
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
  const [datetimeKey, setDatetimeKey] = useState(0);
  const [hasSpecificTime, setHasSpecificTime] = useState(false);
  // Animate the time wheel in/out: `mounted` keeps it in the tree through the
  // collapse so hiding animates too; `open` flips a frame after mount so the
  // grid-rows transition runs from 0fr → 1fr on show.
  const [timeWheelMounted, setTimeWheelMounted] = useState(false);
  const [timeWheelOpen, setTimeWheelOpen] = useState(false);
  useEffect(() => {
    if (hasSpecificTime) {
      setTimeWheelMounted(true);
      const raf = requestAnimationFrame(() => setTimeWheelOpen(true));
      return () => cancelAnimationFrame(raf);
    }
    setTimeWheelOpen(false);
    const t = window.setTimeout(() => setTimeWheelMounted(false), 320);
    return () => window.clearTimeout(t);
  }, [hasSpecificTime]);

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
      // Normalize initial date - ensure it's always valid
      const normalizedDate = normalizeDate(initialDate, isEditing);
      // For new events, ensure time is 8am
      if (!isEditing) {
        normalizedDate.setHours(8, 0, 0, 0);
      }
      setDate(normalizedDate);
      // Force IonDatetime remount by updating key
      setDatetimeKey(prev => prev + 1);
      // Store original date for change detection when editing (create a copy to avoid reference issues)
      if (isEditing && normalizedDate) {
        originalDateRef.current = new Date(normalizedDate.getTime());
      } else {
        originalDateRef.current = undefined;
      }
      setEmoji(initialEmoji ?? '');
      setEmojiColor(initialEmojiColor || DEFAULT_COLOR);
      setEmojiShape(normalizeShape(initialEmojiShape));
      setInvertTimeFormat(initialInvertTimeFormat ?? false);
      setIsRecurring(initialIsRecurring ?? false);
      // Detect specific time: editing with non-default (non-8am) time
      const initTime = initialDate ?? normalizedDate;
      setHasSpecificTime(isEditing && (initTime.getHours() !== 8 || initTime.getMinutes() !== 0));
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
      const initialShouldShow = normalizedDate && !(initialIsRecurring ?? false) && differenceInYears(new Date(), normalizedDate) >= 1;
      setShowYearlySuggestion(initialShouldShow);
      
      setTimeout(() => {
        isInitialOpenRef.current = false;
      }, 500);
      
      // Try to focus immediately when modal opens (while still in user gesture context for Safari mobile)
      // Skip auto-focus when title is prefilled (e.g. from AirDrop import) — keyboard would be unwanted.
      if (!isEditing && !initialTitle && titleInputRef.current) {
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
    // Re-read ion-content dimensions after the modal's entrance animation
    // completes. Without this, --offset-top is computed at mount before the
    // header has laid out, comes back 0, and `fullscreen` silently does
    // nothing — content starts below the header instead of scrolling under
    // it, and the translucent header shows the modal card's solid
    // background through, looking "filled".
    requestAnimationFrame(() => {
      const content = contentRef.current as unknown as { recalculateDimensions?: () => void } | null;
      content?.recalculateDimensions?.();
      window.dispatchEvent(new Event('resize'));
    });

    if (!isEditing && !initialTitle && titleInputRef.current) {
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

  useEffect(() => {
    onCanSaveChange?.(Boolean(title && date && emoji));
  }, [title, date, emoji, onCanSaveChange]);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    canSave,
  }));

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
      
      await onSave(title, date, emoji, isRecurring, hasSpecificTime, emojiColor, emojiShape, invertTimeFormat);
      // Trigger haptic feedback after successful save (for both creating and editing)
      trigger('medium');
      onClose();
    }
  };

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
            setCustomEmojiValue(emojiText);
            setTimeout(() => {
              handleEmojiSelect(emojiText);
            }, 100);
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

  const handleSpecificTimeToggle = (checked: boolean) => {
    trigger('selection');
    setHasSpecificTime(checked);
    if (!checked && date) {
      const reset = new Date(date);
      reset.setHours(8, 0, 0, 0);
      setDate(reset);
    }
  };

  const handleTimeChange = (timeStr: string) => {
    if (!timeStr || !date) return;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;
    const updated = new Date(date);
    updated.setHours(hours, minutes, 0, 0);
    setDate(updated);
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
        } catch (shareError: unknown) {
          const message = getErrorMessage(shareError);
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
          } catch (shareError: unknown) {
            // User cancelled or error occurred
            if (!isWebShareAbort(shareError)) {
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
      <IonHeader translucent className="modal-header-transparent">
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

      <IonContent ref={contentRef} fullscreen className="ion-padding">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                      if (title && date && emoji) {
                        void handleSave();
                      }
                    }
                  }}
                  enterKeyHint="done"
                  placeholder={t('modal.eventNamePlaceholder')}
                  autoFocus={!isEditing && !initialTitle && !Capacitor.isNativePlatform() && !isSafariMobile()}
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
                  
                  // Every tile is the same <div> element with the same key + enter
                  // class so toggling selection reconciles in place (no remount, no
                  // animation replay/flash). The selected tile hosts the shape picker.
                  return (
                    <div
                      key={`${e}-${index}`}
                      style={{
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                        animationDelay: `${index * 30}ms`,
                      }}
                      className="emoji-suggestion-enter w-14 h-14"
                    >
                      {/* Picker is rendered on every tile (selected or not) so selecting
                          via long-press never remounts the element and severs the drag. */}
                      <EmojiShapePicker
                        shape={emojiShape}
                        color={emojiColor}
                        emoji={e}
                        onChange={setEmojiShape}
                        size={56}
                        selected={isSelected}
                        onSelect={() => handleEmojiSelect(e)}
                      />
                    </div>
                  );
                })}
                {/* Custom emoji - show if a custom emoji is selected (not in suggestedEmojis and not in EMOJI_OPTIONS) and input is not showing */}
                {emoji !== '' && !suggestedEmojis.includes(emoji) && !EMOJI_OPTIONS.includes(emoji) && !showCustomEmojiInput && (
                  <div
                    style={{ transform: 'scale(1.1)' }}
                    aria-label={t('aria.selectedEmoji', { emoji })}
                  >
                    <EmojiShapePicker
                      shape={emojiShape}
                      color={emojiColor}
                      emoji={emoji}
                      onChange={setEmojiShape}
                      size={56}
                    />
                  </div>
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
                      key={`datetime-${datetimeKey}`}
                      ref={datetimeRef}
                      presentation="date"
                      value={formatDateForDatetime(date)}
                      onIonChange={(e) => {
                        trigger('medium');
                        const value = getDatetimeValue(e);
                        if (value && typeof value === 'string') {
                          // Parse the date string as local date (YYYY-MM-DD format)
                          const [year, month, day] = value.split('T')[0].split('-').map(Number);
                          const newDate = new Date(year, month - 1, day);
                          // Validate the parsed date
                          if (isNaN(newDate.getTime())) {
    setDate(normalizeDate(date, isEditing));
    return;
                          }
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
                  {/* Specific time — same card as the date, collapsed until toggled on */}
                  <div className="mx-4 border-t border-border/50" />
                  <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('modal.setSpecificTimeLabel')}</p>
                      <p className="text-sm text-muted-foreground">{t('modal.setSpecificTimeSublabel')}</p>
                    </div>
                  </div>
                  <IonToggle
                    checked={hasSpecificTime}
                    onIonChange={(e) => handleSpecificTimeToggle(e.detail.checked)}
                  />
                </div>
                {timeWheelMounted && date && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none"
                    style={{
                      gridTemplateRows: timeWheelOpen ? '1fr' : '0fr',
                      transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="transition-[opacity,transform] duration-300 motion-reduce:transition-none"
                        style={{
                          opacity: timeWheelOpen ? 1 : 0,
                          transform: timeWheelOpen ? 'translateY(0)' : 'translateY(-6px)',
                          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                        }}
                      >
                        <div className="mx-4 border-t border-border/50" />
                        {/* Native Ionic iOS-style time wheel, inline — no popover */}
                        <div className="py-1">
                          <IonDatetime
                            className="datetime-time-inline"
                            presentation="time"
                        value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`}
                        onIonChange={(e) => {
                          trigger('medium');
                          const value = getDatetimeValue(e);
                          if (value && value.includes('T')) {
                            const [h, m] = value.split('T')[1].split(':').map(Number);
                            if (!isNaN(h) && !isNaN(m)) {
                              const updated = new Date(date);
                              updated.setHours(h, m, 0, 0);
                              setDate(updated);
                            }
                          }
                        }}
                        showDefaultTitle={false}
                        showDefaultButtons={false}
                      />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Time-display override — off follows the global setting; on flips it */}
                <div className="mx-4 border-t border-border/50" />
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Hourglass className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('modal.timeFormatLabel')}</p>
                      <p className="text-sm text-muted-foreground">
                        {legacyTimeFormat ? t('modal.timeFormatSublabelToSemantic') : t('modal.timeFormatSublabelToDays')}
                      </p>
                    </div>
                  </div>
                  <IonToggle
                    checked={invertTimeFormat}
                    onIonChange={(e) => { trigger('selection'); setInvertTimeFormat(e.detail.checked); }}
                  />
                </div>
                {/* Live preview of the overridden format — expands when the toggle is on
                    so the effect of the switch is visible immediately */}
                {date && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none"
                    style={{
                      gridTemplateRows: invertTimeFormat ? '1fr' : '0fr',
                      transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="transition-[opacity,transform] duration-300 motion-reduce:transition-none"
                        style={{
                          opacity: invertTimeFormat ? 1 : 0,
                          transform: invertTimeFormat ? 'translateY(0)' : 'translateY(-6px)',
                          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                        }}
                      >
                        <div className="pb-4 pl-[68px] pr-4">
                          <p className="text-sm font-medium text-primary">
                            {/* Always the flipped format — deriving it from invertTimeFormat
                                would flash back to the default mid-collapse */}
                            {emoji || '🎯'} {formatRelative(t, date, new Date(), hasSpecificTime, !legacyTimeFormat)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </div>
                <p className="text-xs text-muted-foreground pl-4 pb-2">
                  {t('modal.dateMaxHelper')}
                </p>
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
                  <span className="font-medium">
                    {format(date, hasSpecificTime ? 'EEEE, MMMM d, yyyy • HH:mm' : 'EEEE, MMMM d, yyyy')}
                  </span>
                  {isRecurring && <RefreshCw className="w-3.5 h-3.5 text-primary" />}
                </div>
              )}
            </div>

            {/* Advanced section - only show when editing */}
            {isEditing && onDelete && (
              <div className="pt-4 border-t border-border/50">
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
            )}
            
            <div className="h-24" aria-hidden="true" />
          </div>
      </IonContent>
    </IonModal>
  );
});
