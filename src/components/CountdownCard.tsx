import { useState, useRef, useCallback } from 'react';
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

const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = 120;

export function CountdownCard({ 
  event, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}: CountdownCardProps) {
  const { trigger } = useHaptic();
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const hasTriggeredHapticRef = useRef(false);
  
  const targetDate = event.isRecurring 
    ? getNextRecurringDate(new Date(event.targetDate))
    : new Date(event.targetDate);
  
  const countdown = useCountdown(targetDate);

  const handleDragStart = useCallback((clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setIsDragging(true);
    hasTriggeredHapticRef.current = false;
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    
    const diff = startXRef.current - clientX;
    currentXRef.current = clientX;
    
    // Only allow swiping left (positive diff)
    const newTranslateX = Math.max(0, Math.min(DELETE_THRESHOLD + 20, diff));
    setTranslateX(newTranslateX);
    
    // Trigger haptic feedback when reaching threshold
    if (newTranslateX >= SWIPE_THRESHOLD && !hasTriggeredHapticRef.current) {
      trigger('medium');
      hasTriggeredHapticRef.current = true;
    } else if (newTranslateX < SWIPE_THRESHOLD && hasTriggeredHapticRef.current) {
      hasTriggeredHapticRef.current = false;
    }
  }, [isDragging, trigger]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    if (translateX >= DELETE_THRESHOLD) {
      // Delete the item
      trigger('heavy');
      onDelete();
    } else if (translateX >= SWIPE_THRESHOLD) {
      // Snap to show delete button
      setTranslateX(SWIPE_THRESHOLD);
    } else {
      // Reset position
      setTranslateX(0);
    }
  }, [translateX, trigger, onDelete]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
    
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };
    
    const handleMouseUp = () => {
      handleDragEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSelect = () => {
    if (translateX > 0) {
      setTranslateX(0);
      return;
    }
    trigger('light');
    onSelect();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translateX > 0) {
      setTranslateX(0);
      return;
    }
    trigger('medium');
    onEdit();
  };

  const handleDeleteClick = () => {
    trigger('heavy');
    onDelete();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete button background */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive"
        style={{ width: Math.max(translateX, SWIPE_THRESHOLD) }}
      >
        <button
          onClick={handleDeleteClick}
          className="flex items-center justify-center w-20 h-full text-white"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>
      
      {/* Main card content */}
      <div 
        onClick={handleSelect}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className={`bg-card p-4 flex items-center gap-4 cursor-pointer shadow-ios relative rounded-2xl border-0 ${
          isSelected ? 'ring-2 ring-primary ring-inset' : ''
        }`}
        style={{
          transform: `translateX(-${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
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
    </div>
  );
}
