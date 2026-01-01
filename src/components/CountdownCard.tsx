import { Trash2, ChevronRight, RefreshCw } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
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
      className={`bg-card rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-ios ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0">
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
            ? 'Today! 🎉' 
            : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
          }
        </p>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          className="w-8 h-8 rounded-full flex items-center justify-center active:bg-secondary transition-colors"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 text-destructive/70" />
        </button>
        <button 
          className="w-8 h-8 rounded-full flex items-center justify-center active:bg-secondary transition-colors"
          onClick={handleEdit}
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
