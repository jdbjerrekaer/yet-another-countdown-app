import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, date: Date, emoji: string) => void;
  initialTitle?: string;
  initialDate?: Date;
  initialEmoji?: string;
}

const EMOJI_OPTIONS = ['🎯', '🎉', '✈️', '💍', '🎂', '🎄', '🌟', '🏆', '💪', '🎓', '🏠', '👶'];

export function DatePickerModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialDate,
  initialEmoji = '🎯',
}: DatePickerModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [emoji, setEmoji] = useState(initialEmoji);

  if (!isOpen) return null;

  const handleSave = () => {
    if (title && date) {
      onSave(title, date, emoji);
      onClose();
    }
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
            onClick={onClose}
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
                  onClick={() => setEmoji(e)}
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
          
          {/* Date picker - liquid glass style */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Target Date</Label>
            <div className="rounded-2xl ios-glass border border-white/20 p-3 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                className="rounded-xl"
              />
            </div>
            {date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center pt-2">
                <div className="w-6 h-6 rounded-lg ios-glass flex items-center justify-center">
                  <CalendarIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer - fixed at bottom with liquid glass buttons */}
        <div className="relative p-5 border-t border-white/10 flex gap-3">
          <Button 
            variant="ios" 
            onClick={onClose}
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
