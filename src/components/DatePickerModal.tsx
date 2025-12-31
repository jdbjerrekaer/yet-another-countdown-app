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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card rounded-3xl ios-shadow-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">New Countdown</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Emoji picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center transition-all ${
                    emoji === e 
                      ? 'bg-primary/10 ring-2 ring-primary scale-110' 
                      : 'bg-secondary hover:bg-muted'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          
          {/* Title input */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">
              Event Name
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Special Event"
              className="h-12 rounded-xl text-base bg-secondary border-0 focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Date picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Target Date</Label>
            <div className="rounded-2xl bg-secondary p-4 flex justify-center">
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
                <CalendarIcon className="w-4 h-4" />
                <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose}
            className="flex-1 h-12"
          >
            Cancel
          </Button>
          <Button 
            variant="iosPrimary"
            onClick={handleSave}
            disabled={!title || !date}
            className="flex-1 h-12"
          >
            Save Countdown
          </Button>
        </div>
      </div>
    </div>
  );
}
