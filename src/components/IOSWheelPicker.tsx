import { useRef, useEffect, useState, useCallback } from 'react';
import { useHaptic } from '@/hooks/useHaptic';

interface IOSWheelPickerProps {
  items: { value: number; label: string }[];
  selectedValue: number;
  onSelect: (value: number) => void;
  onConfirm: () => void;
  itemHeight?: number;
}

export function IOSWheelPicker({ 
  items, 
  selectedValue, 
  onSelect,
  onConfirm,
  itemHeight = 50
}: IOSWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHaptic();
  const [currentIndex, setCurrentIndex] = useState(() => 
    items.findIndex(item => item.value === selectedValue)
  );
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrolling = useRef(false);

  // Scroll to selected item on mount
  useEffect(() => {
    const index = items.findIndex(item => item.value === selectedValue);
    if (containerRef.current && index >= 0) {
      containerRef.current.scrollTop = index * itemHeight;
      setCurrentIndex(index);
    }
  }, []);

  const snapToNearest = useCallback(() => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    
    containerRef.current.scrollTo({ 
      top: clampedIndex * itemHeight, 
      behavior: 'smooth' 
    });
    
    if (clampedIndex !== currentIndex) {
      trigger('selection');
      setCurrentIndex(clampedIndex);
      onSelect(items[clampedIndex].value);
    }
    
    isUserScrolling.current = false;
  }, [currentIndex, itemHeight, items, onSelect, trigger]);

  const handleScroll = () => {
    isUserScrolling.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      snapToNearest();
    }, 100);
  };

  const handleItemClick = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ 
        top: index * itemHeight, 
        behavior: 'smooth' 
      });
      trigger('medium');
      setCurrentIndex(index);
      onSelect(items[index].value);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="relative h-[250px] overflow-hidden">
        {/* Selection indicator */}
        <div 
          className="absolute left-4 right-4 top-1/2 -translate-y-1/2 bg-primary/10 rounded-xl pointer-events-none z-0"
          style={{ height: itemHeight }}
        />
        
        {/* Gradient overlays for fade effect */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
        
        {/* Scrollable list */}
        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide overscroll-contain"
          onScroll={handleScroll}
          style={{ 
            paddingTop: itemHeight * 2,
            paddingBottom: itemHeight * 2,
          }}
        >
          {items.map((item, index) => {
            const isSelected = index === currentIndex;
            const distance = Math.abs(index - currentIndex);
            const opacity = Math.max(0.25, 1 - distance * 0.3);
            const scale = Math.max(0.8, 1 - distance * 0.08);
            
            return (
              <div
                key={item.value}
                className="flex items-center justify-center cursor-pointer select-none"
                style={{ 
                  height: itemHeight,
                  opacity,
                  transform: `scale(${scale})`,
                  transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
                }}
                onClick={() => handleItemClick(index)}
              >
                <span className={`text-2xl transition-colors duration-150 ${
                  isSelected ? 'text-foreground font-bold' : 'text-muted-foreground font-semibold'
                }`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Confirm button */}
      <div className="px-6 py-4 border-t border-border/50">
        <button
          onClick={() => {
            trigger('medium');
            onConfirm();
          }}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-lg active:scale-[0.98] transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
}
