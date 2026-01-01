import { useState, useEffect } from 'react';
import { format, setMonth, setYear } from 'date-fns';
import { CalendarIcon, RefreshCw, ChevronLeft, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { IOSWheelPicker } from '@/components/IOSWheelPicker';
import { useHaptic } from '@/hooks/useHaptic';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, date: Date, emoji: string, isRecurring: boolean) => void;
  initialTitle?: string;
  initialDate?: Date;
  initialEmoji?: string;
  initialIsRecurring?: boolean;
  isEditing?: boolean;
  onDelete?: () => void;
}

const EMOJI_OPTIONS = ['🎯', '🎉', '✈️', '💍', '🎂', '🎄', '🌟', '🏆', '💪', '🎓', '🏠', '👶'];

const MONTHS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => ({
  value: currentYear + i,
  label: String(currentYear + i),
}));

type PickerMode = 'form' | 'month' | 'year';

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
  const [pickerMode, setPickerMode] = useState<PickerMode>('form');
  const [displayMonth, setDisplayMonth] = useState<Date>(initialDate || new Date());
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { trigger } = useHaptic();

  // Handle open/close animation state
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 250); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form state when opening
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDate(initialDate);
      setEmoji(initialEmoji);
      setIsRecurring(initialIsRecurring ?? false);
      setDisplayMonth(initialDate || new Date());
      setPickerMode('form');
    }
  }, [isOpen, initialTitle, initialDate, initialEmoji, initialIsRecurring]);

  if (!shouldRender) return null;

  const handleClose = () => {
    trigger('light');
    onClose();
  };

  const handleSave = () => {
    if (title && date) {
      // Only trigger haptic for new countdowns, not edits
      if (!isEditing) {
        trigger('medium');
      }
      onSave(title, date, emoji, isRecurring);
      onClose();
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(displayMonth, monthIndex);
    setDisplayMonth(newDate);
  };

  const handleYearSelect = (year: number) => {
    const newDate = setYear(displayMonth, year);
    setDisplayMonth(newDate);
  };

  const handleHeaderClick = (type: 'month' | 'year') => {
    trigger('selection');
    setPickerMode(type);
  };

  const handleEmojiSelect = (e: string) => {
    trigger('light');
    setEmoji(e);
  };

  const handleRecurringToggle = (checked: boolean) => {
    trigger('selection');
    setIsRecurring(checked);
  };

  const handleBack = () => {
    trigger('light');
    setPickerMode('form');
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      trigger('light');
      onDelete();
      onClose();
    }
  };

  const backdropClass = isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in';
  const contentClass = isClosing ? 'animate-modal-content-out' : 'animate-modal-content-in';

  // Month/Year picker mode - fullscreen
  if (pickerMode === 'month' || pickerMode === 'year') {
    return (
      <div className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-xl ${contentClass}`}>
        {/* Header */}
        <div className="flex items-center h-14 px-4 border-b border-border/50">
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-primary font-medium active:opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-foreground pr-16">
            {pickerMode === 'month' ? 'Select Month' : 'Select Year'}
          </h2>
        </div>
        
        {/* Picker */}
        <div className="flex-1">
          <IOSWheelPicker
            items={pickerMode === 'month' ? MONTHS : YEARS}
            selectedValue={pickerMode === 'month' ? displayMonth.getMonth() : displayMonth.getFullYear()}
            onSelect={pickerMode === 'month' ? handleMonthSelect : handleYearSelect}
            onConfirm={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop with blur */}
      <div className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm ${backdropClass}`} onClick={handleClose} />
      
      {/* Modal content */}
      <div className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col ${contentClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/50">
          <button 
            onClick={handleClose}
            className="text-primary font-medium active:opacity-70 transition-opacity"
          >
            Cancel
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? `Edit ${initialTitle || title || 'Event'}` : 'New Event'}
          </h2>
          <button 
            onClick={handleSave}
            disabled={!title || !date}
            className="text-primary font-semibold active:opacity-70 transition-opacity disabled:opacity-40"
          >
            Save
          </button>
        </div>
      
      {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-6">
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
            <Switch 
              checked={isRecurring} 
              onCheckedChange={handleRecurringToggle}
            />
          </div>
          
          {/* Date picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Date</Label>
            <div className="rounded-2xl bg-secondary/40 overflow-hidden">
              {/* Month/Year header */}
              <div className="flex items-center justify-center gap-2 py-3 border-b border-border/30">
                <button
                  onClick={() => handleHeaderClick('month')}
                  className="px-4 py-2 rounded-lg font-semibold text-primary active:bg-primary/10 transition-colors"
                >
                  {format(displayMonth, 'MMMM')}
                </button>
                <button
                  onClick={() => handleHeaderClick('year')}
                  className="px-4 py-2 rounded-lg font-semibold text-primary active:bg-primary/10 transition-colors"
                >
                  {format(displayMonth, 'yyyy')}
                </button>
              </div>

              {/* Calendar */}
              <div className="p-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    trigger('medium');
                    setDate(d);
                  }}
                  month={displayMonth}
                  onMonthChange={setDisplayMonth}
                  disabled={(d) => !isRecurring && d < new Date()}
                  className="rounded-xl"
                  classNames={{
                    caption: "hidden",
                  }}
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
      </div>
      </div>
    </>
  );
}
