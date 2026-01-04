interface ProgressBarsProps {
  /** Total remaining percentage (0-100) */
  remainingPercent: number;
  /** Number of bars to display */
  numBars: number;
  /** Color for the filled portion of bars */
  color: string;
  /** Width of each bar in pixels */
  barWidth: number;
  /** Height of each bar in pixels */
  barHeight: number;
  /** Gap between bars in pixels */
  gap?: number;
}

export function ProgressBars({
  remainingPercent,
  numBars,
  color,
  barWidth,
  barHeight,
  gap = 8,
}: ProgressBarsProps) {
  // Calculate how many full bars and partial bar percentage
  const totalBarUnits = (remainingPercent / 100) * numBars;
  const fullBars = Math.floor(totalBarUnits);
  const partialBarPercent = (totalBarUnits % 1) * 100;

  // Generate percentages array
  const percentages = Array(numBars).fill(0).map((_, index) => {
    if (index < fullBars) {
      return 100; // Full bars
    } else if (index === fullBars) {
      return partialBarPercent; // Partially filled bar
    } else {
      return 0; // Empty bars
    }
  });

  return (
    <div className="flex items-end" style={{ gap: `${gap}px` }}>
      {percentages.map((percent, index) => {
        const fillHeight = (percent / 100) * barHeight;
        return (
          <div
            key={index}
            className="relative rounded-full overflow-hidden bg-secondary/40"
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
            }}
          >
            {/* Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ease-out"
              style={{
                height: `${fillHeight}px`,
                backgroundColor: color,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
