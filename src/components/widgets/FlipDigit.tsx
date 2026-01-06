import { useState, useEffect, useRef } from 'react';

interface FlipDigitProps {
  value: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
  className?: string;
  layout?: 'row' | 'column';
}

export function FlipDigit({ value, label, size = 'medium', theme = 'dark', className = '', layout = 'column' }: FlipDigitProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const isFirstRender = useRef(true);

  // Font sizes and dimensions
  const sizeConfig = {
    small: { fontSize: 'text-2xl', height: 36, width: 52 },
    medium: { fontSize: 'text-3xl', height: 48, width: 70 },
    large: { fontSize: 'text-4xl', height: 56, width: 90 },
  };

  // Theme colors with proper shadows
  const themeColors = {
    dark: {
      bg: '#1a1a1a',
      bgDark: '#0f0f0f',
      text: '#ffffff',
      divider: 'rgba(0,0,0,0.8)',
      dividerShadow: 'rgba(255,255,255,0.08)',
      // Card outer shadow
      cardShadow: 'inset 0 1px 2px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.2)',
      // Top half inset shadow
      topShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
      // Bottom half inset shadow
      bottomShadow: 'inset 0 2px 3px rgba(0,0,0,0.5)',
      // Flip animation shadow
      flipShadow: '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
    },
    light: {
      bg: '#f5f5f5',
      bgDark: '#e8e8e8',
      text: '#1f2937',
      divider: 'rgba(0,0,0,0.25)',
      dividerShadow: 'rgba(255,255,255,0.5)',
      // Card outer shadow
      cardShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08)',
      // Top half inset shadow
      topShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)',
      // Bottom half inset shadow
      bottomShadow: 'inset 0 2px 3px rgba(0,0,0,0.06)',
      // Flip animation shadow
      flipShadow: '0 4px 12px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.15)',
    },
  };

  const config = sizeConfig[size];
  const colors = themeColors[theme];
  const halfHeight = config.height / 2;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setCurrentValue(value);
      setPrevValue(value);
      return;
    }

    if (value !== currentValue) {
      setPrevValue(currentValue);
      setIsFlipping(true);
      
      // After animation completes, update state
      const timer = setTimeout(() => {
        setCurrentValue(value);
        setIsFlipping(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [value, currentValue]);

  // During flip: show new value on static top, old value on static bottom
  // The flipping card shows old value and flips down to hide it
  const newValue = value;
  const oldValue = isFlipping ? prevValue : currentValue;

  const isRowLayout = layout === 'row';
  
  return (
    <div className={`flex ${isRowLayout ? 'flex-row items-center' : 'flex-col items-center'} ${className}`}>
      <div 
        style={{
          position: 'relative',
          width: config.width,
          height: config.height,
          perspective: '300px',
        }}
      >
        {/* STATIC TOP HALF - Shows NEW value (revealed when top flap flips away) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: halfHeight,
            backgroundColor: colors.bg,
            borderRadius: '6px 6px 0 0',
            overflow: 'hidden',
            boxShadow: colors.topShadow,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: config.height,
            }}
          >
            <span 
              className={`${config.fontSize} font-bold`}
              style={{ color: colors.text }}
            >
              {newValue}
            </span>
          </div>
        </div>

        {/* STATIC BOTTOM HALF - Shows current value (always visible) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: halfHeight,
            background: `linear-gradient(to bottom, ${colors.bg}, ${colors.bgDark})`,
            borderRadius: '0 0 6px 6px',
            overflow: 'hidden',
            boxShadow: colors.bottomShadow,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: config.height,
              marginTop: -halfHeight,
            }}
          >
            <span 
              className={`${config.fontSize} font-bold`}
              style={{ color: colors.text }}
            >
              {currentValue}
            </span>
          </div>
        </div>

        {/* FLIPPING TOP HALF - Shows OLD value, flips down to reveal new value underneath */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: halfHeight,
            backgroundColor: colors.bg,
            borderRadius: '6px 6px 0 0',
            overflow: 'hidden',
            transformOrigin: '50% 100%',
            transform: isFlipping ? 'rotateX(-90deg)' : 'rotateX(0deg)',
            transition: isFlipping ? 'transform 0.3s ease-in' : 'none',
            boxShadow: colors.topShadow,
            zIndex: 3,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: config.height,
            }}
          >
            <span 
              className={`${config.fontSize} font-bold`}
              style={{ color: colors.text }}
            >
              {oldValue}
            </span>
          </div>
        </div>

        {/* Center divider line with gradient and shadow */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: halfHeight - 1,
            height: 2,
            background: `linear-gradient(to right, rgba(0,0,0,${theme === 'dark' ? '0.3' : '0.05'}) 0%, rgba(0,0,0,${theme === 'dark' ? '0.9' : '0.25'}) 20%, rgba(0,0,0,${theme === 'dark' ? '0.9' : '0.25'}) 80%, rgba(0,0,0,${theme === 'dark' ? '0.3' : '0.05'}) 100%)`,
            boxShadow: `0 1px 1px ${colors.dividerShadow}`,
            zIndex: 20,
          }}
        />

        {/* Outer card container with shadow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 6,
            boxShadow: colors.cardShadow,
            pointerEvents: 'none',
            zIndex: 30,
          }}
        />
      </div>
      
      {label && (
        <p className={`text-xs text-muted-foreground ${isRowLayout ? 'ml-2' : 'mt-1 text-center'}`}>
          {label}
        </p>
      )}
    </div>
  );
}
