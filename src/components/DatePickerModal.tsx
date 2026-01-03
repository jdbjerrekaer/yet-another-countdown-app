import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { format } from 'date-fns';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonToggle, IonDatetime } from '@ionic/react';
import { CalendarIcon, RefreshCw, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptic } from '@/hooks/useHaptic';

// Helper to check if a color is a custom color (not in the preset list)
const isCustomColor = (color: string | undefined): boolean => {
  if (!color) return false;
  return !COLOR_OPTIONS.some(c => c.value === color);
};

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
}

export interface DatePickerModalRef {
  save: () => Promise<void>;
  canSave: () => boolean;
}

const EMOJI_OPTIONS = ['🎯', '🎉', '✈️', '💍', '🎂', '🎄', '🌟', '🏆', '💪', '🎓', '🏠', '👶'];

// Predefined color palette for emoji containers
const COLOR_OPTIONS = [
  { id: 'default', label: 'Default', value: undefined, gradient: 'linear-gradient(135deg, hsl(211 100% 50%) 0%, hsl(211 100% 60%) 100%)' },
  { id: 'rose', label: 'Rose', value: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)' },
  { id: 'orange', label: 'Orange', value: '#ea580c', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' },
  { id: 'amber', label: 'Amber', value: '#d97706', gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
  { id: 'emerald', label: 'Emerald', value: '#059669', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { id: 'teal', label: 'Teal', value: '#0d9488', gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' },
  { id: 'cyan', label: 'Cyan', value: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' },
  { id: 'violet', label: 'Violet', value: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' },
  { id: 'fuchsia', label: 'Fuchsia', value: '#c026d3', gradient: 'linear-gradient(135deg, #c026d3 0%, #d946ef 100%)' },
  { id: 'slate', label: 'Slate', value: '#475569', gradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' },
];

export const DatePickerModal = forwardRef<DatePickerModalRef, DatePickerModalProps>(({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialDate,
  initialEmoji = '🎯',
  initialEmojiColor,
  initialIsRecurring = false,
  isEditing = false,
  onDelete,
  onValidityChange,
}, ref) => {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [emojiColor, setEmojiColor] = useState<string | undefined>(initialEmojiColor);
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring ?? false);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmojiValue, setCustomEmojiValue] = useState('');
  const { trigger } = useHaptic();
  const prevIsOpenRef = useRef(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const customEmojiInputRef = useRef<HTMLInputElement>(null);

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
      setEmoji(initialEmoji || '🎯');
      setEmojiColor(initialEmojiColor);
      setIsRecurring(initialIsRecurring ?? false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTitle, initialDate, initialEmoji, initialEmojiColor, initialIsRecurring, isEditing]);

  const handleClose = () => {
    trigger('light');
    onClose();
  };

  const canSave = () => Boolean(title && date);

  // Notify parent when validity changes
  useEffect(() => {
    if (onValidityChange) {
      onValidityChange(canSave());
    }
  }, [title, date, onValidityChange]);

  const handleSave = async () => {
    if (title && date) {
      await onSave(title, date, emoji, isRecurring, emojiColor);
      // Trigger haptic feedback after successful save (for both creating and editing)
      trigger('medium');
      onClose();
    }
  };

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
    canSave,
  }));

  const handleColorSelect = (color: string | undefined) => {
    trigger('light');
    setEmojiColor(color);
  };

  const handleCustomColorClick = () => {
    trigger('light');
    colorInputRef.current?.click();
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    trigger('light');
    setEmojiColor(e.target.value);
  };

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
              <Input
                id="title"
                ref={(el) => {
                  // Auto-focus when modal opens for new events
                  if (el && isOpen && !isEditing) {
                    setTimeout(() => el.focus(), 300);
                  }
                }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event name"
                className="h-12 rounded-xl text-base bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Color picker - above Icon so user picks color first */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Icon Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleColorSelect(color.value)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                      (emojiColor === color.value || (!emojiColor && !color.value))
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.gradient }}
                    title={color.label}
                  >
                    {(emojiColor === color.value || (!emojiColor && !color.value)) && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </button>
                ))}
                {/* Custom color picker button with overlay input for Safari mobile */}
                <div className="relative w-10 h-10">
                  <button
                    onClick={handleCustomColorClick}
                    className={`w-full h-full rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 ${
                      isCustomColor(emojiColor)
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={isCustomColor(emojiColor) ? { background: getGradientFromColor(emojiColor!) } : undefined}
                    title="Custom color"
                  >
                    {isCustomColor(emojiColor) ? (
                      <span className="text-white text-sm">✓</span>
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  {/* Color input overlaid on button for Safari mobile compatibility */}
                  <input
                    ref={colorInputRef}
                    type="color"
                    onChange={handleCustomColorChange}
                    value={emojiColor || '#3b82f6'}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                    aria-label="Custom color picker"
                  />
                </div>
              </div>
            </div>

            {/* Emoji picker - selected emoji shows the chosen color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map((e) => {
                  // Only show as selected if it matches AND the emoji is in the preset list
                  // This prevents preset emojis from showing selected when a custom emoji is used
                  // Also deselect preset emojis when the custom emoji input is open
                  const isCustomEmojiSelected = !EMOJI_OPTIONS.includes(emoji);
                  const isSelected = emoji === e && !isCustomEmojiSelected && !showCustomEmojiInput;
                  const selectedColorGradient = emojiColor 
                    ? (isCustomColor(emojiColor) ? getGradientFromColor(emojiColor) : COLOR_OPTIONS.find(c => c.value === emojiColor)?.gradient)
                    : COLOR_OPTIONS[0].gradient;
                  
                  return (
                    <button
                      key={e}
                      onClick={() => handleEmojiSelect(e)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                        isSelected 
                          ? 'shadow-sm scale-110' 
                          : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                      style={isSelected ? { background: selectedColorGradient } : undefined}
                    >
                      {e}
                    </button>
                  );
                })}
                {/* Custom emoji - show if a custom emoji is selected (not in EMOJI_OPTIONS) */}
                {!EMOJI_OPTIONS.includes(emoji) && (
                  <button
                    onClick={() => {}}
                    className="w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all duration-200 shadow-sm scale-110"
                    style={{ 
                      background: emojiColor 
                        ? (isCustomColor(emojiColor) ? getGradientFromColor(emojiColor) : COLOR_OPTIONS.find(c => c.value === emojiColor)?.gradient)
                        : COLOR_OPTIONS[0].gradient 
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
                        background: emojiColor 
                          ? (isCustomColor(emojiColor) ? getGradientFromColor(emojiColor) : COLOR_OPTIONS.find(c => c.value === emojiColor)?.gradient)
                          : COLOR_OPTIONS[0].gradient,
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
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:scale-105"
                    title="Custom emoji"
                  >
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </button>
                )}
              </div>
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
                    min={(() => {
                      const minDate = new Date();
                      minDate.setFullYear(minDate.getFullYear() - 100);
                      return `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;
                    })()}
                    max={(() => {
                      const maxDate = new Date();
                      maxDate.setFullYear(maxDate.getFullYear() + 100);
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
