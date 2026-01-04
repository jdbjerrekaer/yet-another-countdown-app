interface CountdownRingProps {
  /** Remaining percentage (100 = full ring, 0 = empty) */
  percentRemaining: number;
  /** Color for the active ring (hex or CSS color) */
  color: string;
  /** Overall size in pixels */
  sizePx: number;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Primary label (e.g., "42") */
  label?: string;
  /** Sublabel below the main label (e.g., "days") */
  sublabel?: string;
  /** Size of label text */
  labelSize?: 'sm' | 'md' | 'lg';
}

export function CountdownRing({
  percentRemaining,
  color,
  sizePx,
  strokeWidth,
  label,
  sublabel,
  labelSize = 'md',
}: CountdownRingProps) {
  const radius = (sizePx - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // The progress ring starts at 12 o'clock and goes clockwise
  // strokeDashoffset determines how much of the ring is hidden
  // For remaining percent: 100% = full ring, 0% = empty ring
  const offset = circumference * (1 - percentRemaining / 100);

  const center = sizePx / 2;

  // Calculate text sizes based on labelSize prop
  const textSizes = {
    sm: { label: 'text-lg font-bold', sublabel: 'text-[8px]' },
    md: { label: 'text-2xl font-bold', sublabel: 'text-[10px]' },
    lg: { label: 'text-3xl font-bold', sublabel: 'text-xs' },
  };

  const { label: labelClass, sublabel: sublabelClass } = textSizes[labelSize];

  return (
    <div className="relative" style={{ width: sizePx, height: sizePx }}>
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${sizePx} ${sizePx}`}
        className="transform -rotate-90"
      >
        {/* Track ring (background) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary opacity-40"
        />
        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
      </svg>
      {/* Center content */}
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && (
            <span className={`${labelClass} text-foreground leading-none`}>
              {label}
            </span>
          )}
          {sublabel && (
            <span className={`${sublabelClass} text-muted-foreground mt-0.5`}>
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
