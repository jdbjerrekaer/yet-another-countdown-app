interface FlipDigitProps {
  value: number;
  label?: string;
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  theme?: 'light' | 'dark';
  className?: string;
}

export function FlipDigit({ value, label, size = 'medium', theme = 'dark', className = '' }: FlipDigitProps) {
  // Font sizes and dimensions matching Focus theme exactly
  const sizeConfig = {
    small: { fontSize: 'text-3xl', height: 48, padding: 'px-3', width: undefined },
    medium: { fontSize: 'text-3xl', height: 48, padding: 'px-3', width: undefined },
    large: { fontSize: 'text-4xl', height: 56, padding: 'px-4', width: 90 }, // Fixed width for consistent grid layout
    extraLarge: { fontSize: 'text-5xl', height: 64, padding: 'px-5', width: 110 }, // Fixed width for consistent grid layout
  };

  // Theme colors
  const themeColors = {
    dark: {
      bgTop: '#1a1a1a',
      bgBottomGradient: 'linear-gradient(to bottom, #1a1a1a 0%, #0f0f0f 100%)',
      textColor: 'text-white',
      cardShadow: 'inset 0 1px 2px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.2)',
      topShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
      bottomShadow: 'inset 0 2px 3px rgba(0,0,0,0.5)',
      dividerBg: 'linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.9) 80%, rgba(0,0,0,0.3) 100%)',
      dividerShadow: '0 1px 1px rgba(255,255,255,0.08)',
    },
    light: {
      bgTop: '#f5f5f5',
      bgBottomGradient: 'linear-gradient(to bottom, #f0f0f0 0%, #e8e8e8 100%)',
      textColor: 'text-gray-800',
      cardShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08)',
      topShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)',
      bottomShadow: 'inset 0 2px 3px rgba(0,0,0,0.06)',
      dividerBg: 'linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.25) 80%, rgba(0,0,0,0.05) 100%)',
      dividerShadow: '0 1px 1px rgba(255,255,255,0.5)',
    },
  };

  const config = sizeConfig[size];
  const colors = themeColors[theme];
  const halfHeight = config.height / 2;
  const displayValue = value.toString();

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        {/* Flip clock card with 3D effect */}
        <div 
          className="relative rounded-md overflow-hidden"
          style={{
            height: config.height,
            width: config.width,
            backgroundColor: colors.bgTop,
            boxShadow: colors.cardShadow,
          }}
        >
          {/* Top half - clips to show only top half of the number */}
          <div 
            className={`relative ${config.padding} overflow-hidden`}
            style={{
              height: halfHeight,
              backgroundColor: colors.bgTop,
              boxShadow: colors.topShadow,
            }}
          >
            <div 
              className="flex items-center justify-center"
              style={{ height: config.height }}
            >
              <span className={`${config.fontSize} font-bold ${colors.textColor} leading-none`}>
                {displayValue}
              </span>
            </div>
          </div>
          
          {/* Horizontal divider line - the split-flap effect */}
          <div 
            className="absolute left-0 right-0 h-[2px] z-10"
            style={{
              top: halfHeight - 1,
              background: colors.dividerBg,
              boxShadow: colors.dividerShadow,
            }}
          />
          
          {/* Bottom half - clips to show only bottom half of the number */}
          <div 
            className={`relative ${config.padding} overflow-hidden`}
            style={{
              height: halfHeight,
              background: colors.bgBottomGradient,
              boxShadow: colors.bottomShadow,
            }}
          >
            <div 
              className="flex items-center justify-center"
              style={{ 
                height: config.height,
                marginTop: -halfHeight,
              }}
            >
              <span className={`${config.fontSize} font-bold ${colors.textColor} leading-none`}>
                {displayValue}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Optional label */}
      {label && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {label}
        </p>
      )}
    </div>
  );
}
