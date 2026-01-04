import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { format } from 'date-fns';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonToggle, IonDatetime } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { CalendarIcon, RefreshCw, Trash2, Plus, X } from 'lucide-react';
import { ColorWheelPicker } from '@/components/ColorWheelPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptic } from '@/hooks/useHaptic';
import { getEmojiSuggestions } from '@/lib/emojiSuggestions';

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
  isEditing?: boolean;
  onDelete?: () => Promise<boolean> | boolean;
  onValidityChange?: (canSave: boolean) => void;
  onConfirmDateChange?: (title: string) => Promise<boolean>;
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
  isEditing = false,
  onDelete,
  onValidityChange,
  onConfirmDateChange,
}, ref) => {
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
  const [colorPickerKey, setColorPickerKey] = useState(0);
  const [emojiAnimationKey, setEmojiAnimationKey] = useState(0);
  const prevSuggestedEmojisRef = useRef<string[]>([]);

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
    return results.map((r) => r.unicode);
  }, [title]);

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
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTitle, initialDate, initialEmoji, initialEmojiColor, initialIsRecurring, isEditing]);

  const handleClose = () => {
    trigger('light');
    onClose();
  };

  // Handle modal presentation - focus input after modal is fully presented (Safari mobile fix)
  const handleModalPresent = async () => {
    if (!isEditing && titleInputRef.current) {
      const input = titleInputRef.current;
      const isNative = Capacitor.isNativePlatform();
      
      // On native iOS, use Capacitor Keyboard plugin after a short delay
      setTimeout(async () => {
        if (!input) return;
        
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
      }, 300);
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

  const handleSave = async () => {
    if (title && date && emoji) {
      // If editing and date has changed, show confirmation dialog
      if (isEditing && hasDateChanged() && onConfirmDateChange) {
        const confirmed = await onConfirmDateChange(title);
        if (!confirmed) {
          // User cancelled, don't save
          trigger('light');
          return;
        }
      }
      
      await onSave(title, date, emoji, isRecurring, emojiColor);
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
  useImperativeHandle(ref, () => ({
    save: handleSave,
    canSave,
    hasDateChanged,
    getCurrentDate: () => date,
    focusInput,
  }));

  const handleEmojiSelect = (e: string) => {
    trigger('light');
    setEmoji(e);
    setShowCustomEmojiInput(false);
  };

  const handleCustomEmojiClick = () => {
    trigger('light');
    setShowCustomEmojiInput(true);
    setCustomEmojiValue('');
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      customEmojiInputRef.current?.focus();
    }, 100);
  };

  const handleCustomEmojiInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Filter to only allow emoji characters (Extended Pictographic, Emoji Modifier, etc.)
    const emojiRegex = /[\p{Emoji}\p{Extended_Pictographic}]/gu;
    const emojis = value.match(emojiRegex);
    if (emojis && emojis.length > 0) {
      // Only keep emoji characters
      setCustomEmojiValue(emojis.join(''));
    } else {
      // Clear if no emoji found
      setCustomEmojiValue('');
    }
  };

  const handleCustomEmojiSubmit = () => {
    if (customEmojiValue.trim()) {
      // Get the first emoji from the input
      const emojiMatch = customEmojiValue.match(/[\p{Emoji}\p{Extended_Pictographic}]/u);
      if (emojiMatch) {
        handleEmojiSelect(emojiMatch[0]);
      }
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

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleClose}
      onDidPresent={handleModalPresent}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleClose}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>
            {isEditing ? `Edit ${initialTitle || title || 'Event'}` : 'New Event'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Form content */}
          <div className="space-y-6">
            {/* Title input */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">
                Event Name
              </Label>
              <div className="relative">
                <Input
                  ref={titleInputRef}
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => setIsTitleFocused(true)}
                  onBlur={() => setIsTitleFocused(false)}
                  placeholder="Enter event name"
                  className="h-12 rounded-xl text-base bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 pr-10"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary/80 active:bg-secondary text-muted-foreground hover:text-foreground animate-blur-in"
                    aria-label="Clear input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Emoji picker - selected emoji shows the chosen color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Icon</Label>
              <div className="flex gap-2 flex-wrap" key={`emoji-list-${emojiAnimationKey}`}>
                {suggestedEmojis.map((e, index) => {
                  const isCustomEmojiSelected = emoji !== '' && !suggestedEmojis.includes(emoji);
                  const isSelected = emoji === e && !isCustomEmojiSelected && !showCustomEmojiInput;
                  
                  return (
                    <button
                      key={`${e}-${index}-${emojiAnimationKey}`}
                      onClick={() => handleEmojiSelect(e)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
                        emojiAnimationKey > 0 ? 'emoji-suggestion-enter' : ''
                      } ${
                        isSelected
                          ? 'border-[3px] border-white/90 text-xl'
                          : 'bg-secondary/50 hover:bg-secondary text-2xl'
                      }`}
                      style={{
                        ...(isSelected ? { 
                          backgroundColor: emojiColor,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
                        } : {}),
                        animationDelay: `${index * 30}ms`,
                        transform: isSelected ? 'scale(1.1)' : undefined,
                      }}
                    >
                      {e}
                    </button>
                  );
                })}
                {/* Custom emoji - show if a custom emoji is selected (not in suggestedEmojis) */}
                {emoji !== '' && !suggestedEmojis.includes(emoji) && (
                  <button
                    onClick={() => {}}
                    className="w-12 h-12 rounded-xl text-xl flex items-center justify-center transition-all duration-300 border-[3px] border-white/90"
                    style={{
                      backgroundColor: emojiColor,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
                      transform: 'scale(1.1)'
                    }}
                  >
                    {emoji}
                  </button>
                )}
                {/* Custom emoji input or button */}
                {showCustomEmojiInput ? (
                  <div className="flex items-center gap-1">
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
                        }
                        // Prevent non-emoji characters
                        const key = e.key;
                        if (key.length === 1 && !/[\p{Emoji}\p{Extended_Pictographic}]/u.test(key)) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow button click to register
                        setTimeout(() => {
                          if (!customEmojiValue) {
                            setShowCustomEmojiInput(false);
                          }
                        }, 150);
                      }}
                      placeholder="🎨"
                      className="w-12 h-12 rounded-xl text-2xl text-center border-2 border-primary/50 focus:border-primary outline-none"
                      style={{
                        background: getGradientFromColor(emojiColor),
                        color: 'white'
                      }}
                      maxLength={4}
                      enterKeyHint="done"
                      // Note: inputMode="emoji" is not standard, but we filter input to only allow emojis
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    {/* OK button only visible on larger screens - mobile uses keyboard return key */}
                    <button
                      onClick={handleCustomEmojiSubmit}
                      className="hidden md:flex w-10 h-10 rounded-xl bg-primary text-primary-foreground items-center justify-center text-sm font-medium"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCustomEmojiClick}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:scale-105 ${
                      emojiAnimationKey > 0 ? 'emoji-suggestion-enter' : ''
                    }`}
                    style={{
                      animationDelay: `${suggestedEmojis.length * 30}ms`,
                    }}
                    title="Custom emoji"
                  >
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Color picker wheel */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground -mt-4">Icon Color</Label>
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

            {/* Recurring toggle */}
            <div className="bg-secondary/40 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Repeat Yearly</p>
                  <p className="text-sm text-muted-foreground">For birthdays, anniversaries</p>
                </div>
              </div>
              <IonToggle 
                checked={isRecurring} 
                onIonChange={(e) => handleRecurringToggle(e.detail.checked)}
              />
            </div>
            
            {/* Date picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <div className="rounded-2xl bg-secondary/40 overflow-hidden">
                {/* Native Ionic Calendar */}
                <div className="p-2 flex justify-center">
                  <IonDatetime
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
                      '--color': 'var(--ion-color-primary)',
                      width: '100%',
                      // maxWidth: '350px',
                    } as React.CSSProperties}
                    className="datetime-fixed-width"
                  />
                </div>
              </div>
              
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
                    Advanced
                  </h3>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="w-full py-3 px-4 rounded-xl bg-destructive/10 text-destructive font-medium active:opacity-70 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                </div>
              </div>
            )}
          </div>
      </IonContent>
    </IonModal>
  );
});
