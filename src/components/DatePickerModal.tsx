import { useState } from 'react';
import { format, setMonth, setYear } from 'date-fns';
import { CalendarIcon, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type PickerMode = 'calendar' | 'month' | 'year';

export function DatePickerModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialDate,
  initialEmoji = '🎯',
  initialIsRecurring = false,
}: DatePickerModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring);
  const [pickerMode, setPickerMode] = useState<PickerMode>('calendar');
  const [displayMonth, setDisplayMonth] = useState<Date>(initialDate || new Date());
  const { trigger } = useHaptic();

  if (!isOpen) return null;

  const handleSave = () => {
    if (title && date) {
      trigger('medium');
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
    if (pickerMode === type) {
      setPickerMode('calendar');
    } else {
      setPickerMode(type);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-foreground/10 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Modal - iOS liquid glass design */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 max-h-[90dvh] flex flex-col rounded-3xl overflow-hidden animate-slide-up ios-glass ios-shadow-lg border border-white/20">
        {/* Liquid glass overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white/10 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-foreground">New Countdown</h2>
          <button 
            onClick={() => {
              trigger('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full ios-glass flex items-center justify-center hover:bg-white/30 transition-all duration-200 active:scale-95"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Content - scrollable */}
        <div className="relative flex-1 overflow-y-auto p-5 space-y-5">
          {/* Emoji picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => handleEmojiSelect(e)}
                  className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                    emoji === e 
                      ? 'gradient-accent shadow-ios scale-105' 
                      : 'ios-glass hover:bg-white/30'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          
          {/* Title input - liquid glass style */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">
              Event Name
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Special Event"
              className="h-12 rounded-xl text-base ios-glass border-white/20 focus:ring-2 focus:ring-primary/50 focus:border-transparent placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Recurring toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Recurring Event</Label>
            <div className="ios-glass rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Repeat Yearly</p>
                  <p className="text-xs text-muted-foreground">For birthdays, anniversaries, etc.</p>
                </div>
              </div>
              <Switch 
                checked={isRecurring} 
                onCheckedChange={handleRecurringToggle}
              />
            </div>
          </div>
          
          {/* Date picker - with iOS month/year selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Target Date</Label>
            <div className="rounded-2xl ios-glass border border-white/20 overflow-hidden">
              {/* Custom header with tappable month/year */}
              <div className="flex items-center justify-center gap-1 p-3 border-b border-white/10">
                <button
                  onClick={() => handleHeaderClick('month')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
                    pickerMode === 'month' 
                      ? 'gradient-accent text-primary-foreground' 
                      : 'ios-glass hover:bg-white/30 text-foreground'
                  }`}
                >
                  {format(displayMonth, 'MMMM')}
                </button>
                <button
                  onClick={() => handleHeaderClick('year')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
                    pickerMode === 'year' 
                      ? 'gradient-accent text-primary-foreground' 
                      : 'ios-glass hover:bg-white/30 text-foreground'
                  }`}
                >
                  {format(displayMonth, 'yyyy')}
                </button>
              </div>

              {/* Picker content */}
              <div className="p-3">
                {pickerMode === 'calendar' && (
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
                      caption: "hidden", // Hide default caption, using custom header
                    }}
                  />
                )}
                
                {pickerMode === 'month' && (
                  <IOSWheelPicker
                    items={MONTHS}
                    selectedValue={displayMonth.getMonth()}
                    onSelect={(month) => {
                      handleMonthSelect(month);
                      setPickerMode('calendar');
                    }}
                  />
                )}
                
                {pickerMode === 'year' && (
                  <IOSWheelPicker
                    items={YEARS}
                    selectedValue={displayMonth.getFullYear()}
                    onSelect={(year) => {
                      handleYearSelect(year);
                      setPickerMode('calendar');
                    }}
                  />
                )}
              </div>
            </div>
            
            {date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center pt-2">
                <div className="w-6 h-6 rounded-lg ios-glass flex items-center justify-center">
                  <CalendarIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</span>
                {isRecurring && <RefreshCw className="w-3.5 h-3.5 text-primary" />}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer - fixed at bottom with liquid glass buttons */}
        <div className="relative p-5 border-t border-white/10 flex gap-3">
          <Button 
            variant="ios" 
            onClick={() => {
              trigger('light');
              onClose();
            }}
            className="flex-1 h-12 rounded-2xl font-semibold"
          >
            Cancel
          </Button>
          <Button 
            variant="iosPrimary"
            onClick={handleSave}
            disabled={!title || !date}
            className="flex-1 h-12 rounded-2xl font-semibold"
          >
            Save Countdown
          </Button>
        </div>
      </div>
    </div>
  );
}
