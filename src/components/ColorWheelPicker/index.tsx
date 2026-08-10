import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { useHaptic } from '@/hooks/useHaptic';
import { COLOR_PALETTE, hexToHSL } from '@/lib/colorPalette';
import { EMOJI_HUE_MAPPINGS } from '@/lib/emojiHueMappings';

interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
  emoji?: string;
  onManualChange?: () => void; // Called when user manually changes color
  /**
   * Scroll one swatch across and back shortly after mount, so it's obvious the
   * strip moves. Only for onboarding — it ends on the colour it started on.
   */
  peekOnMount?: boolean;
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

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Calculate color distance between two hex colors (0-765 range, sum of RGB differences)
function calculateColorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;
  return Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
}

// Find the closest palette index for a given hex color
function findClosestColorIndex(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  let closestIndex = 0;
  let closestDiff = Infinity;

  for (let i = 0; i < COLOR_PALETTE.length; i++) {
    const palRgb = hexToRgb(COLOR_PALETTE[i]);
    if (!palRgb) continue;

    const diff = Math.abs(rgb.r - palRgb.r) + Math.abs(rgb.g - palRgb.g) + Math.abs(rgb.b - palRgb.b);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

export function ColorWheelPicker({ value, onChange, emoji, onManualChange, peekOnMount = false }: ColorWheelPickerProps) {
  const { trigger } = useHaptic();
  const [selectedIndex, setSelectedIndex] = useState(() => findClosestColorIndex(value));
  const [previewColor, setPreviewColor] = useState<string>(value);
  const [previewTransitionDuration, setPreviewTransitionDuration] = useState(200); // ms
  const lastIndexRef = useRef(selectedIndex);
  const isInitializedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const hasManualChangeRef = useRef(false);
  const lastEmojiRef = useRef<string | undefined>(emoji);
  const lastValueRef = useRef<string>(value);
  const clickTriggeredRef = useRef(false); // Track if haptic was triggered by click
  const lastHapticIndexRef = useRef(selectedIndex); // Track index for haptic ticking
  const settleHapticTriggeredRef = useRef(false); // Prevent double haptics on settle

  // Fine hue control: long-press / double-tap a swatch to pick a lighter/darker shade.
  // customColor is an off-palette hex the user fine-tuned; it overrides the palette swatch.
  const [customColor, setCustomColor] = useState<string | null>(null);
  const customColorRef = useRef<string | null>(null);
  const setCustom = useCallback((hex: string | null) => {
    customColorRef.current = hex;
    setCustomColor(hex);
  }, []);
  const [shadeMenu, setShadeMenu] = useState<{ shades: string[]; activeHex: string; cx: number; cy: number } | null>(null);
  const [shadeShown, setShadeShown] = useState(false); // drives the morph in/out transition
  const [hoverIndex, setHoverIndex] = useState<number | null>(null); // hue under the finger during a press-drag
  const shadeMenuRef = useRef(false);
  const dragModeRef = useRef(false); // true when opened by long-press (select on release)
  const hoverIndexRef = useRef<number | null>(null);
  const shadeDataRef = useRef<{ shades: string[]; cx: number; cy: number } | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const peekedRef = useRef(false); // the onboarding peek fires at most once
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  // Drag handlers. iOS WebView cancels pointer events when it decides a touch is a
  // scroll, so the shade drag is driven by capture-phase touchmove (with
  // preventDefault) instead; pointer events cover desktop mouse. Stable wrappers are
  // used for add/removeEventListener; the live logic lives in the *Impl refs and is
  // reassigned each render so it always sees the latest closures.
  const dragTouchMoveImpl = useRef<(e: TouchEvent) => void>(() => {});
  const dragPointerMoveImpl = useRef<(e: PointerEvent) => void>(() => {});
  const dragEndImpl = useRef<() => void>(() => {});
  const dragTouchMove = useRef((e: TouchEvent) => dragTouchMoveImpl.current(e)).current;
  const dragPointerMove = useRef((e: PointerEvent) => dragPointerMoveImpl.current(e)).current;
  const dragEnd = useRef(() => dragEndImpl.current()).current;
  const lastTapRef = useRef<{ t: number; i: number } | null>(null); // manual double-tap detection
  const openShadeMenuRef = useRef<((index: number, drag: boolean) => void) | null>(null);
  // The center ticker for the carousel is 56w x 72h; hue swatches are that, axes swapped.
  const SHADE_W = 72;
  const SHADE_H = 56;
  const SHADE_GAP = 6;
  const SHADE_STEP = SHADE_H + SHADE_GAP;

  // Velocity tracking for transition timing
  const lastSlideIndexRef = useRef<number>(selectedIndex);
  const lastScrollTimeRef = useRef<number>(Date.now());
  const scrollVelocityRef = useRef<number>(0);
  const HAPTIC_VELOCITY_THRESHOLD = 10; // slides/s - trigger haptics when slower than this
  
  // Velocity-based transition timing constants
  const MIN_TRANSITION_DURATION = 0; // ms - instant at high velocity
  const MAX_TRANSITION_DURATION = 200; // ms - smooth at low velocity  
  const HIGH_VELOCITY_THRESHOLD = 15; // slides/s - above this, use minimum transition
  const LOW_VELOCITY_THRESHOLD = 2; // slides/s - below this, use maximum transition

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    containScroll: false,
    dragFree: false, // Enable native snapping behavior
    skipSnaps: true, // Allow skipping snaps during fast swipes for smooth feel
  });

  // Detect when value prop changes from outside (e.g., when editing different event)
  // and reset initialization to show the correct color
  useEffect(() => {
    if (!emblaApi) return;
    
    // Check if value prop changed from outside
    const valueChanged = value !== lastValueRef.current;
    
    if (valueChanged) {
      // If this change is the fine-tuned shade we just emitted, don't re-initialize
      // (re-init would snap the marker back to the nearest palette swatch)
      if (value === customColorRef.current) {
        lastValueRef.current = value;
        return;
      }
      // Only reset initialization if we're already initialized
      // This prevents resetting during the initial mount
      if (isInitializedRef.current) {
        // Get the current selected color using lastIndexRef (updated synchronously)
        // This ensures we compare with the most recent selection, even if state hasn't updated yet
        const currentSelectedColor = COLOR_PALETTE[lastIndexRef.current];
        
        // If the new value is different from what's currently selected,
        // reset initialization to allow re-initialization with the new value
        // This handles the case when editing a different event with a different color
        if (value !== currentSelectedColor) {
          isInitializedRef.current = false;
        }
      }
      
      // Update the tracked value
      lastValueRef.current = value;
    }
  }, [value, emblaApi]);

  // Calculate transition duration based on color distance
  // Similar to velocity-based transitions, but uses color distance instead
  const calculateDistanceBasedTransition = useCallback((fromHex: string, toHex: string): number => {
    const distance = calculateColorDistance(fromHex, toHex);
    
    // Color distance ranges from 0 to 765 (max RGB difference: 255*3)
    // Map distance to transition duration:
    // - Small distance (similar colors): shorter transition (feels snappy)
    // - Large distance (very different colors): longer transition (smooth color journey)
    const MIN_EMOJI_TRANSITION = 500; // ms - minimum for very similar colors (increased for better UX)
    const MAX_EMOJI_TRANSITION = 1000; // ms - maximum for opposite colors (increased for better UX)
    const LOW_DISTANCE_THRESHOLD = 100; // colors closer than this get min duration
    const HIGH_DISTANCE_THRESHOLD = 500; // colors farther than this get max duration
    
    if (distance <= LOW_DISTANCE_THRESHOLD) {
      return MIN_EMOJI_TRANSITION;
    }
    
    if (distance >= HIGH_DISTANCE_THRESHOLD) {
      return MAX_EMOJI_TRANSITION;
    }
    
    // Linear interpolation between thresholds
    const distanceRange = HIGH_DISTANCE_THRESHOLD - LOW_DISTANCE_THRESHOLD;
    const durationRange = MAX_EMOJI_TRANSITION - MIN_EMOJI_TRANSITION;
    const normalizedDistance = (distance - LOW_DISTANCE_THRESHOLD) / distanceRange;
    
    return MIN_EMOJI_TRANSITION + (normalizedDistance * durationRange);
  }, []);

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
        // Calculate transition duration based on color distance
        const currentColor = previewColor || COLOR_PALETTE[lastIndexRef.current] || value;
        const transitionDuration = calculateDistanceBasedTransition(currentColor, emojiColor);
        setPreviewTransitionDuration(transitionDuration);
        
        emblaApi.scrollTo(emojiColorIndex, false); // smooth scroll
        setSelectedIndex(emojiColorIndex);
        setPreviewColor(emojiColor);
        lastIndexRef.current = emojiColorIndex;
        onChange(emojiColor);
      }
    }
    
    // Update the ref after all checks
    lastEmojiRef.current = emoji;
  }, [emoji, emblaApi, onChange, previewColor, value, calculateDistanceBasedTransition]);

  // Initialize to the correct slide on mount
  useEffect(() => {
    if (emblaApi && !isInitializedRef.current) {
      // Always use the provided value - it's the saved color for this event
      // The emoji-based color suggestion should only apply when creating new events
      // or when the user explicitly changes the emoji (handled by the emoji effect above)
      const initialColor = value;
      
      const initialIndex = findClosestColorIndex(initialColor);
      emblaApi.scrollTo(initialIndex, true); // instant scroll
      setSelectedIndex(initialIndex);
      // If the saved color isn't an exact palette swatch, it's a fine-tuned shade —
      // keep it as the custom color so the marker shows the exact saved hue.
      const closest = COLOR_PALETTE[initialIndex];
      if (initialColor && initialColor.toLowerCase() !== closest.toLowerCase()) {
        setCustom(initialColor);
        setPreviewColor(initialColor);
      } else {
        setCustom(null);
        setPreviewColor(closest);
      }
      lastIndexRef.current = initialIndex;
      lastSlideIndexRef.current = initialIndex; // Initialize velocity tracking
      isInitializedRef.current = true;
    }
  }, [emblaApi, value]);

  // Onboarding affordance: nudge one swatch over and come straight back, using
  // the carousel's own scrolling so it looks exactly like a real swipe. Runs
  // once and lands where it started, so the chosen colour is unchanged.
  useEffect(() => {
    if (!peekOnMount || !emblaApi || peekedRef.current) return;
    peekedRef.current = true;
    const home = emblaApi.selectedScrollSnap();
    const away = Math.min(home + 1, COLOR_PALETTE.length - 1);
    if (away === home) return;
    const out = window.setTimeout(() => emblaApi.scrollTo(away), 450);
    const back = window.setTimeout(() => emblaApi.scrollTo(home), 1150);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(back);
    };
  }, [peekOnMount, emblaApi]);

  // Calculate transition duration based on scroll velocity
  const calculateTransitionDuration = useCallback((velocity: number): number => {
    const absVelocity = Math.abs(velocity);
    
    if (absVelocity >= HIGH_VELOCITY_THRESHOLD) {
      return MIN_TRANSITION_DURATION;
    }
    
    if (absVelocity <= LOW_VELOCITY_THRESHOLD) {
      return MAX_TRANSITION_DURATION;
    }
    
    // Linear interpolation between thresholds
    const velocityRange = HIGH_VELOCITY_THRESHOLD - LOW_VELOCITY_THRESHOLD;
    const durationRange = MAX_TRANSITION_DURATION - MIN_TRANSITION_DURATION;
    const normalizedVelocity = (absVelocity - LOW_VELOCITY_THRESHOLD) / velocityRange;
    
    return MAX_TRANSITION_DURATION - (normalizedVelocity * durationRange);
  }, []);

  // Handle scroll events for real-time preview and velocity tracking
  const onScroll = useCallback(() => {
    if (!emblaApi) return;

    // Scrolling the carousel reverts any fine-tuned shade back to palette swatches
    if (customColorRef.current) setCustom(null);

    // Track velocity based on slide indices
    const currentTime = Date.now();
    const slideIndex = emblaApi.selectedScrollSnap();
    const slideCount = COLOR_PALETTE.length;
    const currentSlideIndex = ((slideIndex % slideCount) + slideCount) % slideCount;
    const timeDelta = currentTime - lastScrollTimeRef.current;
    
    if (timeDelta > 0 && timeDelta < 1000) { // Only calculate if time delta is reasonable
      // Calculate slide change, accounting for looping
      let slideDelta = Math.abs(currentSlideIndex - lastSlideIndexRef.current);
      // Handle wrap-around (if we went from end to beginning or vice versa)
      if (slideDelta > slideCount / 2) {
        slideDelta = slideCount - slideDelta;
      }
      // Convert to slides per second
      scrollVelocityRef.current = (slideDelta / timeDelta) * 1000; // slides/s
    }

    // Haptic Ticking: detect when we pass a slide boundary while scrolling
    if (slideIndex !== lastHapticIndexRef.current) {
      // Trigger haptic if we're scrolling slowly enough to feel individual snaps
      if (scrollVelocityRef.current < HAPTIC_VELOCITY_THRESHOLD) {
        trigger('selection');
      }
      lastHapticIndexRef.current = slideIndex;
    }
    
    lastSlideIndexRef.current = currentSlideIndex;
    lastScrollTimeRef.current = currentTime;
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      if (!emblaApi) return;
      
      // Get the currently selected slide index (this works during scrolling too)
      const paletteIndex = ((slideIndex % slideCount) + slideCount) % slideCount;
      const colorAtCenter = COLOR_PALETTE[paletteIndex];
      
      if (colorAtCenter) {
        // Update transition duration based on current velocity
        const newDuration = calculateTransitionDuration(scrollVelocityRef.current);
        setPreviewTransitionDuration(newDuration);
        setPreviewColor(colorAtCenter);
      }
    });
  }, [emblaApi, calculateTransitionDuration, trigger]);

  // Handle pointer up - reset transition duration
  const onPointerUp = useCallback(() => {
    if (!emblaApi) return;
    setPreviewTransitionDuration(MAX_TRANSITION_DURATION);
  }, [emblaApi]);

  // Handle settle - reset velocity and clear flags
  const onSettle = useCallback(() => {
    if (!emblaApi) return;
    setPreviewTransitionDuration(MAX_TRANSITION_DURATION);
    scrollVelocityRef.current = 0;
    clickTriggeredRef.current = false;
    settleHapticTriggeredRef.current = false;
  }, [emblaApi]);

  // Handle slide changes (when snapped or settled)
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    
    // Don't update state until we're properly initialized
    if (!isInitializedRef.current) return;

    const slideIndex = emblaApi.selectedScrollSnap();
    const slideCount = COLOR_PALETTE.length;
    const paletteIndex = ((slideIndex % slideCount) + slideCount) % slideCount;
    
    setSelectedIndex(paletteIndex);
    const color = COLOR_PALETTE[paletteIndex];
    setPreviewColor(color);

    if (paletteIndex !== lastIndexRef.current) {
      lastIndexRef.current = paletteIndex;
      if (!hasManualChangeRef.current) {
        hasManualChangeRef.current = true;
        onManualChange?.();
      }
      onChange(color);

      // Trigger landing haptic if it's a slow snap or the final settle
      if (!clickTriggeredRef.current) {
        trigger('selection');
      }
    }
  }, [emblaApi, onChange, onManualChange, trigger]);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('scroll', onScroll);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('pointerUp', onPointerUp);
    emblaApi.on('settle', onSettle);

    // Add native wheel listener to allow e.preventDefault()
    const viewport = emblaApi.rootNode();
    const onWheelNative = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 10) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!hasManualChangeRef.current) {
          hasManualChangeRef.current = true;
          onManualChange?.();
        }
        
        if (delta > 0) {
          emblaApi.scrollNext();
        } else {
          emblaApi.scrollPrev();
        }
      }
    };

    viewport.addEventListener('wheel', onWheelNative, { passive: false });

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('scroll', onScroll);
      emblaApi.off('reInit', onSelect);
      emblaApi.off('pointerUp', onPointerUp);
      emblaApi.off('settle', onSettle);
      viewport.removeEventListener('wheel', onWheelNative);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [emblaApi, onSelect, onScroll, onPointerUp, onSettle, onManualChange]);

  // Handle tap/click on color swatch
  const handleColorClick = useCallback(
    (paletteIndex: number) => {
      if (!emblaApi) return;
      if (shadeMenuRef.current) return; // ignore the click that follows opening the shade menu

      // Manual double-tap detection (dblclick is unreliable in touch WebViews).
      // Open shades for the centered hue — the first tap may have scrolled the carousel.
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.t < 320) {
        lastTapRef.current = null;
        openShadeMenuRef.current?.(lastIndexRef.current, false);
        return;
      }
      lastTapRef.current = { t: now, i: paletteIndex };

      // A tap on a palette swatch reverts any fine-tuned shade back to the base hue
      setCustom(null);

      // Mark as manually changed when user taps
      if (!hasManualChangeRef.current) {
        hasManualChangeRef.current = true;
        onManualChange?.();
      }
      
      // Mark that click triggered haptic (to avoid double haptic on settle)
      clickTriggeredRef.current = true;
      trigger('selection');
      
      // Scroll to the selected color smoothly (onSelect callback will handle state updates)
      emblaApi.scrollTo(paletteIndex, false);
    },
    [emblaApi, trigger, onManualChange, setCustom]
  );

  // Build 7 lighter/darker shades of a hue (lightest first, base in the middle, darkest last)
  const getShades = useCallback((hex: string): string[] => {
    const { h, s, l } = hexToHSL(hex);
    return [36, 24, 12, 0, -12, -24, -36].map((delta) =>
      hslToHex(h, s, Math.max(12, Math.min(92, l + delta)))
    );
  }, []);

  const closeShadeMenu = useCallback(() => {
    shadeMenuRef.current = false;
    dragModeRef.current = false;
    hoverIndexRef.current = null;
    setHoverIndex(null);
    setShadeShown(false);
    window.setTimeout(() => setShadeMenu(null), 200); // let the collapse finish before unmount
  }, []);

  const selectShade = useCallback(
    (hex: string) => {
      if (!hasManualChangeRef.current) {
        hasManualChangeRef.current = true;
        onManualChange?.();
      }
      setCustom(hex);
      setPreviewColor(hex);
      lastValueRef.current = hex;
      trigger('selection');
      onChange(hex);
      closeShadeMenu();
    },
    [onChange, onManualChange, trigger, setCustom, closeShadeMenu]
  );

  // Which shade is under the finger during a press-drag (null = off the column → cancel)
  const hitTestShade = useCallback((clientX: number, clientY: number): number | null => {
    const data = shadeDataRef.current;
    if (!data) return null;
    const half = (7 * SHADE_H + 6 * SHADE_GAP) / 2;
    if (Math.abs(clientX - data.cx) > 120) return null;
    if (clientY < data.cy - half - 44 || clientY > data.cy + half + 44) return null;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < 7; i++) {
      const c = data.cy + (i - 3) * SHADE_STEP;
      const d = Math.abs(clientY - c);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }, [SHADE_H, SHADE_GAP, SHADE_STEP]);

  const updateHover = useCallback((clientX: number, clientY: number) => {
    const idx = hitTestShade(clientX, clientY);
    if (idx !== hoverIndexRef.current) {
      hoverIndexRef.current = idx;
      setHoverIndex(idx);
      if (idx !== null) trigger('selection');
    }
  }, [hitTestShade, trigger]);

  const removeDragListeners = useCallback(() => {
    document.removeEventListener('touchmove', dragTouchMove, { capture: true } as EventListenerOptions);
    document.removeEventListener('touchend', dragEnd, { capture: true } as EventListenerOptions);
    document.removeEventListener('touchcancel', dragEnd, { capture: true } as EventListenerOptions);
    window.removeEventListener('pointermove', dragPointerMove);
    window.removeEventListener('pointerup', dragEnd);
    window.removeEventListener('pointercancel', dragEnd);
  }, [dragTouchMove, dragEnd, dragPointerMove]);

  // Live drag logic, reassigned each render so the stable wrappers see fresh closures.
  dragTouchMoveImpl.current = (e: TouchEvent) => {
    if (!dragModeRef.current) return;
    const t = e.touches[0] ?? e.changedTouches[0];
    if (!t) return;
    e.preventDefault(); // stop the carousel/page from scrolling mid-drag
    e.stopPropagation();
    updateHover(t.clientX, t.clientY);
  };
  dragPointerMoveImpl.current = (e: PointerEvent) => {
    if (!dragModeRef.current) return;
    updateHover(e.clientX, e.clientY);
  };
  dragEndImpl.current = () => {
    if (!dragModeRef.current) return;
    dragModeRef.current = false;
    removeDragListeners();
    const idx = hoverIndexRef.current;
    const data = shadeDataRef.current;
    if (idx !== null && data) {
      selectShade(data.shades[idx]);
    } else {
      closeShadeMenu();
    }
  };

  const openShadeMenu = useCallback(
    (index: number, drag: boolean) => {
      if (!emblaApi || !containerRef.current) return;
      emblaApi.scrollTo(index, false);
      const base = COLOR_PALETTE[index];
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const shades = getShades(base);
      const activeHex = customColorRef.current ?? base;
      shadeMenuRef.current = true;
      shadeDataRef.current = { shades, cx, cy };
      dragModeRef.current = drag;
      // In drag mode, start the highlight on the base hue under the finger
      hoverIndexRef.current = drag ? 3 : null;
      setHoverIndex(drag ? 3 : null);
      setShadeMenu({ shades, activeHex, cx, cy });
      setShadeShown(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setShadeShown(true)));
      trigger('selection');
      if (drag) {
        // Drive the drag from capture-phase touchmove (preventDefault stops the
        // carousel/page scrolling and guarantees delivery on iOS); pointer events
        // cover desktop mouse.
        document.addEventListener('touchmove', dragTouchMove, { passive: false, capture: true });
        document.addEventListener('touchend', dragEnd, { capture: true });
        document.addEventListener('touchcancel', dragEnd, { capture: true });
        window.addEventListener('pointermove', dragPointerMove);
        window.addEventListener('pointerup', dragEnd);
        window.addEventListener('pointercancel', dragEnd);
      }
    },
    [emblaApi, getShades, trigger, dragTouchMove, dragEnd, dragPointerMove]
  );
  openShadeMenuRef.current = openShadeMenu; // called from handleColorClick (declared earlier)

  // Long-press detection (cancels if the finger moves — that's a carousel drag)
  const startPress = useCallback(
    (index: number, e: React.PointerEvent) => {
      pressStartRef.current = { x: e.clientX, y: e.clientY };
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      pressTimerRef.current = window.setTimeout(() => {
        pressTimerRef.current = null;
        openShadeMenu(index, true); // long-press: drag to highlight, release to select
      }, 450);
    },
    [openShadeMenu]
  );

  const movePress = useCallback((e: React.PointerEvent) => {
    if (!pressTimerRef.current || !pressStartRef.current) return;
    const dx = Math.abs(e.clientX - pressStartRef.current.x);
    const dy = Math.abs(e.clientY - pressStartRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const endPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // (The carousel doesn't need an explicit drag-freeze while the menu is open: the
  // portal backdrop covers it, and reInit'ing Embla here used to tear down the
  // carousel mid-gesture and drop the pointer capture, breaking the shade drag.)

  // Clean up drag listeners if the component unmounts mid-drag
  useEffect(() => {
    return () => removeDragListeners();
  }, [removeDragListeners]);

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

  const currentColor = customColor || previewColor || COLOR_PALETTE[selectedIndex] || value;

  // Constants for hit area expansion
  const VISIBLE_HEIGHT = 48; // Original visible bar height
  const HIT_AREA_PADDING = 24; // Increased padding for more reliable thumb arc swipes
  const TOTAL_HEIGHT = VISIBLE_HEIGHT + (HIT_AREA_PADDING * 2);

  return (
    <div 
      className="relative z-10" // Added z-index to prevent adjacent elements from stealing focus
      ref={containerRef}
      style={{
        height: TOTAL_HEIGHT, // 96px
        marginTop: -HIT_AREA_PADDING,
        marginBottom: -HIT_AREA_PADDING,
      }}
    >
      {/* Embla viewport - FULL 96px HEIGHT for touch area */}
      <div
        ref={emblaRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          touchAction: 'none', // Prevents Safari from stealing the gesture for vertical scroll
          zIndex: 1,
          // Refined SVG mask: using 47px height (slightly smaller than the 48px border) 
          // to ensure colors are always tucked under the border frame.
          // Mask coordinates adjusted for increased HIT_AREA_PADDING (24.5 instead of 16.5)
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='${TOTAL_HEIGHT}'%3E%3Crect x='0' y='24.5' width='100%25' height='47' rx='16' ry='16' fill='black'/%3E%3C/svg%3E")`,
          maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='${TOTAL_HEIGHT}'%3E%3Crect x='0' y='24.5' width='100%25' height='47' rx='16' ry='16' fill='black'/%3E%3C/svg%3E")`,
        }}
        tabIndex={0}
        role="slider"
        aria-label="Color picker"
        aria-valuetext={currentColor}
        onKeyDown={handleKeyDown}
      >
        {/* Embla container - matches viewport height */}
        <div className="flex" style={{ height: TOTAL_HEIGHT }}>
          {COLOR_PALETTE.map((color, i) => (
            <div
              key={i}
              className="flex-shrink-0 cursor-pointer flex items-center"
              style={{
                width: 72,
                height: TOTAL_HEIGHT,
              }}
              onClick={() => handleColorClick(i)}
              onPointerDown={(e) => startPress(i, e)}
              onPointerMove={movePress}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              role="button"
              aria-label={`Select color ${i + 1}`}
            >
              {/* The visible color bar — the centered swatch reflects a fine-tuned shade,
                  reverting to the palette color once the carousel is scrolled. */}
              <div
                style={{
                  backgroundColor: customColor && i === selectedIndex ? customColor : color,
                  height: VISIBLE_HEIGHT,
                  width: '100%',
                  transition: 'background-color 200ms ease-out',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Visual Overlay - Provides the border on top of everything */}
      <div 
        className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none rounded-2xl"
        style={{ 
          height: VISIBLE_HEIGHT,
          // Force this layer to stay on top of hardware-accelerated scrolling layers
          transform: 'translateY(-50%) translateZ(10px)',
        }}
      />

      {/* Center marker - highest priority fixed position overlay */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
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
            transition: `background-color ${previewTransitionDuration}ms ease-out`,
          }}
        />
      </div>

      {/* Fine hue/shade selector: vertical list of lighter→darker shades that morphs
          out of the center ticker. Portaled to body so it floats above the calendar.
          Each swatch is the ticker swap (72w x 56h); the active hue keeps the ticker border. */}
      {shadeMenu && typeof document !== 'undefined' &&
        createPortal(
          // Above the editor sheet (z 20000) and its FAB (z 100000) — the sheet
          // stopped being an ion-modal, so the old z-60 lands underneath it.
          <div className="fixed inset-0 z-[100001]">
            {/* Backdrop catches outside taps */}
            <div className="absolute inset-0" onClick={closeShadeMenu} />
            {/* Background pill that holds the hues, centered on the ticker; morphs in */}
            <div
              className="absolute flex flex-col bg-popover border border-border"
              style={{
                left: shadeMenu.cx,
                top: shadeMenu.cy,
                gap: SHADE_GAP,
                padding: 12,
                borderRadius: 30,
                boxShadow: '0 12px 36px rgba(0,0,0,0.28)',
                transformOrigin: 'center',
                transform: `translate(-50%, -50%) scale(${shadeShown ? 1 : 0.9})`,
                opacity: shadeShown ? 1 : 0,
                transition:
                  'transform 240ms cubic-bezier(0.23, 1, 0.32, 1), opacity 180ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              {shadeMenu.shades.map((hex, i) => {
                const active =
                  hoverIndex !== null
                    ? hoverIndex === i
                    : hex.toLowerCase() === shadeMenu.activeHex.toLowerCase();
                const fromCenter = i - 3; // index 3 is the base hue (the ticker)
                const collapsed = `translateY(${-fromCenter * SHADE_STEP}px) scale(0.82)`;
                const expanded = `translateY(0) scale(${hoverIndex === i ? 1.06 : 1})`;
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => selectShade(hex)}
                    aria-label={`Shade ${hex}`}
                    style={{
                      backgroundColor: hex,
                      width: SHADE_W,
                      height: SHADE_H,
                      borderRadius: 16,
                      border: active ? '3px solid rgba(255,255,255,0.92)' : '1px solid rgba(0,0,0,0.10)',
                      boxShadow: active
                        ? '0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)'
                        : '0 1px 4px rgba(0,0,0,0.18)',
                      // Morph: collapse onto the ticker, then spring out; hovered hue lifts slightly
                      transform: shadeShown ? expanded : collapsed,
                      opacity: shadeShown ? 1 : active ? 1 : 0,
                      transition:
                        'transform 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                      transitionDelay: `${Math.abs(fromCenter) * 22}ms`,
                    }}
                  />
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
