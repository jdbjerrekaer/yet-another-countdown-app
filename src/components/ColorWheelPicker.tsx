import { useRef, useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useHaptic } from '@/hooks/useHaptic';
import { COLOR_PALETTE } from '@/lib/colorPalette';
import { EMOJI_HUE_MAPPINGS } from '@/lib/emojiHueMappings';

interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
  emoji?: string;
  onManualChange?: () => void; // Called when user manually changes color
}

// Convert emoji to hex color based on semantic meaning
function emojiToHex(emoji: string): string {
  if (!emoji) return COLOR_PALETTE[0];
  
  // Get the first code point of the emoji
  const codePoint = emoji.codePointAt(0) || 0;
  
  // Try to find a matching category
  for (const mapping of EMOJI_HUE_MAPPINGS) {
    if (codePoint >= mapping.start && codePoint <= mapping.end) {
      return hslToHex(mapping.hue, 75, 50);
    }
  }
  
  // Fallback: use a deterministic hash based on the emoji
  // This ensures consistent colors for unmapped emojis
  // Use multiple code points for better distribution
  let hash = 0;
  const codePoints: number[] = [];
  
  // Collect all code points from the emoji
  for (let i = 0; i < emoji.length; ) {
    const codePoint = emoji.codePointAt(i) || 0;
    codePoints.push(codePoint);
    i += codePoint > 0xFFFF ? 2 : 1;
  }
  
  // Create a hash from all code points
  for (const cp of codePoints) {
    hash = ((hash << 5) - hash) + cp;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use hash to generate hue (0-360)
  // Distribute across the spectrum more evenly
  const hue = Math.abs(hash) % 360;
  
  // Use higher saturation for more vibrant colors
  return hslToHex(hue, 80, 55);
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Find the closest palette index for a given hex color
function findClosestColorIndex(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  let closestIndex = 0;
  let closestDiff = Infinity;

  for (let i = 0; i < COLOR_PALETTE.length; i++) {
    const palResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(COLOR_PALETTE[i]);
    if (!palResult) continue;

    const pr = parseInt(palResult[1], 16);
    const pg = parseInt(palResult[2], 16);
    const pb = parseInt(palResult[3], 16);

    const diff = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

export function ColorWheelPicker({ value, onChange, emoji, onManualChange }: ColorWheelPickerProps) {
  const { trigger } = useHaptic();
  const [selectedIndex, setSelectedIndex] = useState(() => findClosestColorIndex(value));
  const [previewColor, setPreviewColor] = useState<string>(value);
  const lastIndexRef = useRef(selectedIndex);
  const isInitializedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const hasManualChangeRef = useRef(false);
  const lastEmojiRef = useRef<string | undefined>(emoji);
  const lastValueRef = useRef<string>(value);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    containScroll: false,
    dragFree: false,
    skipSnaps: false,
  });

  // Update color from emoji when emoji changes (only if not manually changed)
  useEffect(() => {
    // Skip if no emoji
    if (!emoji) {
      lastEmojiRef.current = emoji;
      return;
    }
    
    // Reset manual change flag when emoji is first set (modal opened)
    if (!lastEmojiRef.current) {
      hasManualChangeRef.current = false;
    }
    
    // Check if emoji actually changed
    const emojiChanged = emoji !== lastEmojiRef.current;
    
    // Update color if emoji changed and not manually changed
    if (emojiChanged && !hasManualChangeRef.current && emblaApi) {
      const emojiHex = emojiToHex(emoji);
      const emojiColorIndex = findClosestColorIndex(emojiHex);
      const emojiColor = COLOR_PALETTE[emojiColorIndex];
      
      if (emojiColor) {
        emblaApi.scrollTo(emojiColorIndex, false); // smooth scroll
        setSelectedIndex(emojiColorIndex);
        setPreviewColor(emojiColor);
        lastIndexRef.current = emojiColorIndex;
        onChange(emojiColor);
      }
    }
    
    // Update the ref after all checks
    lastEmojiRef.current = emoji;
  }, [emoji, emblaApi, onChange]);

  // Initialize to the correct slide on mount
  useEffect(() => {
    if (emblaApi && !isInitializedRef.current) {
      // If emoji is provided and color hasn't been manually changed, use emoji-based color
      let initialColor = value;
      let shouldUpdateValue = false;
      
      if (emoji && !hasManualChangeRef.current) {
        const emojiHex = emojiToHex(emoji);
        const emojiColorIndex = findClosestColorIndex(emojiHex);
        const emojiColor = COLOR_PALETTE[emojiColorIndex];
        
        // Use emoji color if it's different from current value
        // This handles the case where value is DEFAULT_COLOR or doesn't match emoji
        if (emojiColor && emojiColor !== value) {
          initialColor = emojiColor;
          shouldUpdateValue = true;
        }
      }
      
      const initialIndex = findClosestColorIndex(initialColor);
      emblaApi.scrollTo(initialIndex, true); // instant scroll
      setSelectedIndex(initialIndex);
      setPreviewColor(COLOR_PALETTE[initialIndex]);
      lastIndexRef.current = initialIndex;
      isInitializedRef.current = true;
      
      // Update the value if we used emoji-based color
      if (shouldUpdateValue) {
        onChange(initialColor);
      }
    }
  }, [emblaApi, value, emoji, onChange]);

  // Handle scroll events for real-time preview
  const onScroll = useCallback(() => {
    if (!emblaApi) return;
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      if (!emblaApi) return;
      
      // Get the currently selected slide index (this works during scrolling too)
      const slideIndex = emblaApi.selectedScrollSnap();
      const slideCount = COLOR_PALETTE.length;
      
      // Map the slide index back to palette index (handle looping)
      // Embla creates multiple copies of slides for looping, so we use modulo
      const paletteIndex = ((slideIndex % slideCount) + slideCount) % slideCount;
      const colorAtCenter = COLOR_PALETTE[paletteIndex];
      
      if (colorAtCenter) {
        setPreviewColor(colorAtCenter);
      }
    });
  }, [emblaApi]);

  // Handle slide changes (when snapped)
  const onSelect = useCallback(() => {
    if (!emblaApi) return;

    const slideIndex = emblaApi.selectedScrollSnap();
    const slideCount = COLOR_PALETTE.length;
    
    // Map the slide index back to palette index (handle looping)
    const paletteIndex = ((slideIndex % slideCount) + slideCount) % slideCount;
    
    setSelectedIndex(paletteIndex);
    const color = COLOR_PALETTE[paletteIndex];
    setPreviewColor(color);

    if (paletteIndex !== lastIndexRef.current) {
      lastIndexRef.current = paletteIndex;
      // Mark as manually changed when user interacts
      if (!hasManualChangeRef.current) {
        hasManualChangeRef.current = true;
        onManualChange?.();
      }
      onChange(color);
      trigger('selection');
    }
  }, [emblaApi, onChange, trigger, onManualChange]);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('scroll', onScroll);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('scroll', onScroll);
      emblaApi.off('reInit', onSelect);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [emblaApi, onSelect, onScroll]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!emblaApi) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        // Mark as manually changed when user uses keyboard
        if (!hasManualChangeRef.current) {
          hasManualChangeRef.current = true;
          onManualChange?.();
        }
        if (e.key === 'ArrowLeft') {
          emblaApi.scrollPrev();
        } else {
          emblaApi.scrollNext();
        }
      }
    },
    [emblaApi, onManualChange]
  );

  const currentColor = previewColor || COLOR_PALETTE[selectedIndex] || value;

  return (
    <div className="relative" ref={containerRef}>
      {/* Embla viewport */}
      <div
        ref={emblaRef}
        className="overflow-hidden rounded-xl"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
          scrollBehavior: 'smooth',
        }}
        tabIndex={0}
        role="slider"
        aria-label="Color picker"
        aria-valuetext={currentColor}
        onKeyDown={handleKeyDown}
      >
        {/* Embla container */}
        <div className="flex">
          {COLOR_PALETTE.map((color, i) => (
            <div
              key={i}
              className="flex-shrink-0"
              style={{
                width: 72,
                height: 48,
                backgroundColor: color,
                transition: 'background-color 0.2s ease-out',
              }}
            />
          ))}
        </div>
      </div>

      {/* Center marker - fixed position overlay */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
        style={{
          width: 56,
          height: 72,
        }}
      >
        <div
          className="w-full h-full rounded-2xl border-[3px] border-white/90"
          style={{
            backgroundColor: currentColor,
            boxShadow: '0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
            transition: 'background-color 0.2s ease-out',
          }}
        />
      </div>
    </div>
  );
}
