import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonToggle, IonDatetime } from '@ionic/react';
import { CalendarIcon, RefreshCw, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptic } from '@/hooks/useHaptic';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, date: Date, emoji: string, isRecurring: boolean) => void | Promise<void>;
  initialTitle?: string;
  initialDate?: Date;
  initialEmoji?: string;
  initialIsRecurring?: boolean;
  isEditing?: boolean;
  onDelete?: () => Promise<boolean> | boolean;
}

const EMOJI_OPTIONS = ['🎯', '🎉', '✈️', '💍', '🎂', '🎄', '🌟', '🏆', '💪', '🎓', '🏠', '👶'];

export function DatePickerModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialDate,
  initialEmoji = '🎯',
  initialIsRecurring = false,
  isEditing = false,
  onDelete,
}: DatePickerModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring ?? false);
  const { trigger } = useHaptic();
  const prevIsOpenRef = useRef(false);

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
      setIsRecurring(initialIsRecurring ?? false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTitle, initialDate, initialEmoji, initialIsRecurring, isEditing]);

  const handleClose = () => {
    trigger('light');
    onClose();
  };

  const handleSave = async () => {
    if (title && date) {
      // Only trigger haptic for new countdowns, not edits
      if (!isEditing) {
        trigger('medium');
      }
      await onSave(title, date, emoji, isRecurring);
      onClose();
    }
  };


  const handleEmojiSelect = (e: string) => {
    trigger('light');
    setEmoji(e);
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
          <IonButtons slot="end">
            <IonButton 
              onClick={handleSave} 
              disabled={!title || !date}
              strong={true}
            >
              Save
            </IonButton>
          </IonButtons>
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event name"
                className="h-12 rounded-xl text-base bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Emoji picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleEmojiSelect(e)}
                    className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                      emoji === e 
                        ? 'bg-primary shadow-sm scale-110' 
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    {e}
                  </button>
                ))}
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
                    min={isRecurring ? undefined : (() => {
                      const today = new Date();
                      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    })()}
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
}
