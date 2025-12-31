import { Trash2, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCountdown, CountdownTime } from '@/hooks/useCountdown';
import { useHaptic } from '@/hooks/useHaptic';
import { CountdownEvent } from '@/types/countdown';
import { getNextRecurringDate } from '@/lib/recurring';

interface CountdownCardProps {
  event: CountdownEvent;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CountdownCard({ 
  event, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}: CountdownCardProps) {
  const { trigger } = useHaptic();
  
  // For recurring events, calculate next occurrence
  const targetDate = event.isRecurring 
    ? getNextRecurringDate(new Date(event.targetDate))
    : new Date(event.targetDate);
  
  const countdown = useCountdown(targetDate);

  const handleSelect = () => {
    trigger('light');
    onSelect();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('medium');
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('heavy');
    onDelete();
  };

  return (
    <div 
      onClick={handleSelect}
      className={`ios-glass rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] cursor-pointer ${
        isSelected ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center shadow-ios flex-shrink-0">
        <span className="text-2xl">{event.emoji}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
          {event.isRecurring && (
            <RefreshCw className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {countdown.isComplete 
            ? 'Event has arrived! 🎉' 
            : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
          }
        </p>
      </div>
      
      <div className="flex gap-1 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          className="w-8 h-8"
          onClick={handleEdit}
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="w-8 h-8"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 text-destructive/70" />
        </Button>
      </div>
    </div>
  );
}
