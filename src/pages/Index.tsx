import { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetPreview } from '@/components/WidgetPreview';
import { DatePickerModal } from '@/components/DatePickerModal';
import { useCountdown } from '@/hooks/useCountdown';

interface CountdownData {
  title: string;
  targetDate: string;
  emoji: string;
}

type WidgetSize = 'small' | 'medium' | 'large' | 'extraLarge';

const WIDGET_SIZES: { id: WidgetSize; label: string; dimensions: string }[] = [
  { id: 'small', label: 'Small', dimensions: '2×2' },
  { id: 'medium', label: 'Medium', dimensions: '4×2' },
  { id: 'large', label: 'Large', dimensions: '4×4' },
  { id: 'extraLarge', label: 'Extra Large', dimensions: '4×5' },
];

export default function Index() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('large');
  const [countdownData, setCountdownData] = useState<CountdownData | null>(() => {
    const saved = localStorage.getItem('countdown');
    return saved ? JSON.parse(saved) : null;
  });

  const targetDate = countdownData ? new Date(countdownData.targetDate) : null;
  const countdown = useCountdown(targetDate);

  useEffect(() => {
    if (countdownData) {
      localStorage.setItem('countdown', JSON.stringify(countdownData));
    }
  }, [countdownData]);

  const handleSave = (title: string, date: Date, emoji: string) => {
    setCountdownData({
      title,
      targetDate: date.toISOString(),
      emoji,
    });
  };

  return (
    <div className="min-h-screen gradient-sky">
      {/* Status bar placeholder */}
      <div className="h-12 w-full" />
      
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Countdown</h1>
          <p className="text-sm text-muted-foreground">Widget Previews</p>
        </div>
        <Button 
          variant="ios" 
          size="icon"
          onClick={() => setIsModalOpen(true)}
        >
          {countdownData ? <Settings className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </Button>
      </header>

      {/* Main content */}
      <main className="px-6 pb-12">
        {!countdownData ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-24 h-24 rounded-3xl gradient-accent flex items-center justify-center shadow-ios-lg mb-6 animate-float">
              <span className="text-5xl">⏳</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Countdown Yet</h2>
            <p className="text-muted-foreground text-center max-w-xs mb-8">
              Create your first countdown to see widget previews for all sizes
            </p>
            <Button 
              variant="iosPrimary" 
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Countdown
            </Button>
          </div>
        ) : (
          /* Widget previews */
          <div className="space-y-8 animate-fade-in">
            {/* Event info */}
            <div className="ios-glass rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center shadow-ios">
                <span className="text-3xl">{countdownData.emoji}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">{countdownData.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {countdown.isComplete 
                    ? 'Event has arrived! 🎉' 
                    : `${countdown.days} days, ${countdown.hours} hours remaining`
                  }
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsModalOpen(true)}
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            {/* Size selector */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Widget Size
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
                {WIDGET_SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={`flex-shrink-0 px-4 py-3 rounded-2xl transition-all ${
                      selectedSize === size.id
                        ? 'bg-primary text-primary-foreground shadow-ios'
                        : 'ios-glass text-foreground hover:bg-card/80'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{size.label}</span>
                    <span className={`block text-xs mt-0.5 ${
                      selectedSize === size.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {size.dimensions}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Widget preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Preview
              </h3>
              <div className="flex justify-center py-6">
                <div className="animate-scale-in" key={selectedSize}>
                  <WidgetPreview
                    title={countdownData.title}
                    countdown={countdown}
                    targetDate={targetDate}
                    emoji={countdownData.emoji}
                    size={selectedSize}
                  />
                </div>
              </div>
            </div>

            {/* All sizes preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                All Widget Sizes
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Small (2×2)</p>
                    <WidgetPreview
                      title={countdownData.title}
                      countdown={countdown}
                      targetDate={targetDate}
                      emoji={countdownData.emoji}
                      size="small"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Medium (4×2)</p>
                    <WidgetPreview
                      title={countdownData.title}
                      countdown={countdown}
                      targetDate={targetDate}
                      emoji={countdownData.emoji}
                      size="medium"
                    />
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Large (4×4)</p>
                    <WidgetPreview
                      title={countdownData.title}
                      countdown={countdown}
                      targetDate={targetDate}
                      emoji={countdownData.emoji}
                      size="large"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Extra Large (4×5)</p>
                    <WidgetPreview
                      title={countdownData.title}
                      countdown={countdown}
                      targetDate={targetDate}
                      emoji={countdownData.emoji}
                      size="extraLarge"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div className="ios-glass rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-foreground">About iOS Widgets</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These are preview representations of how your countdown would appear as iOS home screen widgets. 
                To add actual widgets to your device, you'll need to export this app as a native iOS app using Capacitor 
                and implement the widget extension in Swift.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Date picker modal */}
      <DatePickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialTitle={countdownData?.title}
        initialDate={countdownData ? new Date(countdownData.targetDate) : undefined}
        initialEmoji={countdownData?.emoji}
      />
    </div>
  );
}
