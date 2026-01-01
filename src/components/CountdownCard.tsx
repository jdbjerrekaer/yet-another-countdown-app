import { useRef, useState } from 'react';
import { IonItemSliding, IonItem, IonItemOptions, IonItemOption } from '@ionic/react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import { useHaptic } from '@/hooks/useHaptic';
import { CountdownEvent } from '@/types/countdown';
import { getNextRecurringDate } from '@/lib/recurring';

// Helper function to adjust color brightness for gradient
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

interface CountdownCardProps {
  event: CountdownEvent;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isReordering?: boolean;
  isDragging?: boolean;
}

export function CountdownCard({ 
  event, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  isReordering = false,
  isDragging = false,
}: CountdownCardProps) {
  const { trigger } = useHaptic();
  const slidingRef = useRef<HTMLIonItemSlidingElement>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
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

  const handleDelete = async () => {
    trigger('heavy');
    await slidingRef.current?.close();
    onDelete();
  };

  const handleSwipe = () => {
    // Trigger haptic when fully swiped
    trigger('heavy');
    onDelete();
  };

  const handleDrag = (e: CustomEvent) => {
    // IonItemSliding drag event provides amount in pixels
    const amount = (e.detail as any)?.amount || 0;
    // Calculate progress (0 to 1) based on swipe amount
    // Max swipe is typically around 80-100px for the delete button
    const maxSwipe = 80;
    const progress = Math.min(Math.max(Math.abs(amount) / maxSwipe, 0), 1);
    setSwipeProgress(progress);
  };

  const handleDragEnd = () => {
    // Reset border radius when drag ends
    setSwipeProgress(0);
  };

  const handleClose = () => {
    // Reset border radius when item closes
    setSwipeProgress(0);
  };

  // Calculate border radius: morph from 1rem (16px) to 0 on left side
  const leftBorderRadius = 16 * (1 - swipeProgress);
  const rightBorderRadius = 16; // Keep right side rounded

  return (
    <div 
      className={`countdown-card-wrapper overflow-hidden ${
        isSelected ? 'countdown-card-selected' : ''
      } ${isDragging ? 'countdown-card-dragging' : ''}`}
      style={{
        borderTopLeftRadius: `${leftBorderRadius}px`,
        borderBottomLeftRadius: `${leftBorderRadius}px`,
        borderTopRightRadius: `${rightBorderRadius}px`,
        borderBottomRightRadius: `${rightBorderRadius}px`,
        transition: swipeProgress === 0 ? 'border-radius 0.2s ease-out' : 'none',
        // Prevent interactions on the actively dragged card
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
    >
      <IonItemSliding 
        ref={slidingRef}
        disabled={isReordering}
        onIonDrag={handleDrag}
        onIonDragEnd={handleDragEnd}
        onIonClose={handleClose}
      >
        {/* Delete option on the right side */}
        <IonItemOptions side="end" onIonSwipe={handleSwipe}>
          <IonItemOption 
            color="danger" 
            expandable
            onClick={handleDelete}
          >
            Delete
          </IonItemOption>
        </IonItemOptions>
        
        {/* Main card content */}
        <IonItem 
          button
          detail={false}
          onClick={handleSelect}
          lines="none"
          className="countdown-card-item"
        >
        <div className="w-full p-4 flex items-center gap-4">
          <div 
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${!event.emojiColor ? 'gradient-accent' : ''}`}
            style={event.emojiColor ? { 
              background: `linear-gradient(135deg, ${event.emojiColor} 0%, ${adjustColorBrightness(event.emojiColor, 20)} 100%)` 
            } : undefined}
          >
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
              {countdown.isPast 
                ? `${countdown.daysSince} days ago`
                : countdown.isComplete 
                  ? 'Today! 🎉' 
                  : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
              }
            </p>
          </div>
          
          <button 
            className="w-8 h-8 rounded-full flex items-center justify-center active:bg-secondary transition-colors flex-shrink-0"
            onClick={handleEdit}
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </IonItem>
    </IonItemSliding>
    </div>
  );
}
