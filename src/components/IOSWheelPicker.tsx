import { useRef, useEffect, useState } from 'react';
import { useHaptic } from '@/hooks/useHaptic';

interface IOSWheelPickerProps {
  items: { value: number; label: string }[];
  selectedValue: number;
  onSelect: (value: number) => void;
  itemHeight?: number;
}

export function IOSWheelPicker({ 
  items, 
  selectedValue, 
  onSelect,
  itemHeight = 44 
}: IOSWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHaptic();
  const [isScrolling, setIsScrolling] = useState(false);

  const selectedIndex = items.findIndex(item => item.value === selectedValue);

  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const scrollTop = selectedIndex * itemHeight;
      containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [selectedIndex, itemHeight, isScrolling]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    setIsScrolling(true);
    const scrollTop = containerRef.current.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    
    if (items[clampedIndex] && items[clampedIndex].value !== selectedValue) {
      trigger('selection');
      onSelect(items[clampedIndex].value);
    }
  };

  const handleScrollEnd = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    const targetScroll = clampedIndex * itemHeight;
    
    containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    setIsScrolling(false);
  };

  return (
    <div className="relative h-[176px] overflow-hidden">
      {/* Selection indicator - liquid glass */}
      <div 
        className="absolute left-2 right-2 top-1/2 -translate-y-1/2 ios-glass rounded-xl border border-white/30 pointer-events-none z-10"
        style={{ height: itemHeight }}
      />
      
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background/90 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/90 to-transparent pointer-events-none z-20" />
      
      {/* Scrollable list */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        onTouchEnd={handleScrollEnd}
        onMouseUp={handleScrollEnd}
        style={{ 
          paddingTop: itemHeight * 2,
          paddingBottom: itemHeight * 2,
          scrollSnapType: 'y mandatory'
        }}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = Math.max(0.3, 1 - distance * 0.25);
          const scale = Math.max(0.85, 1 - distance * 0.05);
          
          return (
            <div
              key={item.value}
              className="flex items-center justify-center snap-center transition-all duration-150"
              style={{ 
                height: itemHeight,
                opacity,
                transform: `scale(${scale})`,
              }}
              onClick={() => {
                trigger('medium');
                onSelect(item.value);
              }}
            >
              <span className={`text-xl font-semibold transition-colors ${
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
