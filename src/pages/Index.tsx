import { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetPreview } from '@/components/WidgetPreview';
import { DatePickerModal } from '@/components/DatePickerModal';
import { CountdownCard } from '@/components/CountdownCard';
import { useCountdown } from '@/hooks/useCountdown';
import { useHaptic } from '@/hooks/useHaptic';
import { CountdownEvent, WidgetSize } from '@/types/countdown';
import { getNextRecurringDate } from '@/lib/recurring';

const WIDGET_SIZES: { id: WidgetSize; label: string; dimensions: string }[] = [
  { id: 'small', label: 'Small', dimensions: '2×2' },
  { id: 'medium', label: 'Medium', dimensions: '4×2' },
  { id: 'large', label: 'Large', dimensions: '4×4' },
  { id: 'extraLarge', label: 'Extra Large', dimensions: '4×5' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function Index() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('large');
  const [editingEvent, setEditingEvent] = useState<CountdownEvent | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { trigger } = useHaptic();
  
  const [events, setEvents] = useState<CountdownEvent[]>(() => {
    const saved = localStorage.getItem('countdowns');
    if (saved) {
      return JSON.parse(saved);
    }
    // Migrate from old single countdown format
    const oldSaved = localStorage.getItem('countdown');
    if (oldSaved) {
      const old = JSON.parse(oldSaved);
      const migrated: CountdownEvent = {
        id: generateId(),
        title: old.title,
        targetDate: old.targetDate,
        emoji: old.emoji,
        isRecurring: false,
        createdAt: new Date().toISOString(),
      };
      return [migrated];
    }
    return [];
  });

  // Select first event by default
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  
  // Calculate target date (handle recurring)
  const targetDate = selectedEvent 
    ? (selectedEvent.isRecurring 
        ? getNextRecurringDate(new Date(selectedEvent.targetDate))
        : new Date(selectedEvent.targetDate))
    : null;
  
  const countdown = useCountdown(targetDate);

  useEffect(() => {
    localStorage.setItem('countdowns', JSON.stringify(events));
  }, [events]);

  const handleSave = (title: string, date: Date, emoji: string, isRecurring: boolean) => {
    if (editingEvent) {
      // Update existing event
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id 
          ? { ...e, title, targetDate: date.toISOString(), emoji, isRecurring }
          : e
      ));
    } else {
      // Create new event
      const newEvent: CountdownEvent = {
        id: generateId(),
        title,
        targetDate: date.toISOString(),
        emoji,
        isRecurring,
        createdAt: new Date().toISOString(),
      };
      setEvents(prev => [...prev, newEvent]);
      setSelectedEventId(newEvent.id);
    }
    setEditingEvent(null);
  };

  const handleEdit = (event: CountdownEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDelete = (eventId: string) => {
    trigger('heavy');
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (selectedEventId === eventId) {
      setSelectedEventId(events.find(e => e.id !== eventId)?.id || null);
    }
  };

  const handleAddNew = () => {
    trigger('medium');
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="min-h-screen gradient-sky">
      {/* Status bar placeholder */}
      <div className="h-12 w-full" />
      
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Countdown</h1>
          <p className="text-sm text-muted-foreground">
            {events.length === 0 ? 'Widget Previews' : `${events.length} event${events.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button 
          variant="ios" 
          size="icon"
          onClick={handleAddNew}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {/* Main content */}
      <main className="px-6 pb-12">
        {events.length === 0 ? (
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
              onClick={handleAddNew}
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Countdown
            </Button>
          </div>
        ) : (
          /* Content with events */
          <div className="space-y-8 animate-fade-in">
            {/* Events list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Countdowns
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddNew}
                  className="text-primary gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {events.map(event => (
                  <CountdownCard
                    key={event.id}
                    event={event}
                    isSelected={event.id === selectedEventId}
                    onSelect={() => {
                      trigger('light');
                      setSelectedEventId(event.id);
                    }}
                    onEdit={() => handleEdit(event)}
                    onDelete={() => handleDelete(event.id)}
                  />
                ))}
              </div>
            </div>

            {selectedEvent && (
              <>
                {/* Size selector */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Widget Size
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
                    {WIDGET_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => {
                          trigger('selection');
                          setSelectedSize(size.id);
                        }}
                        className={`flex-shrink-0 px-4 py-3 rounded-2xl transition-all active:scale-95 ${
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Preview
                    </h3>
                    {selectedEvent.isRecurring && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <RefreshCw className="w-3 h-3" />
                        Recurring
                      </span>
                    )}
                  </div>
                  <div className="flex justify-center py-6">
                    <div className="animate-scale-in" key={`${selectedEventId}-${selectedSize}`}>
                      <WidgetPreview
                        title={selectedEvent.title}
                        countdown={countdown}
                        targetDate={targetDate}
                        emoji={selectedEvent.emoji}
                        size={selectedSize}
                        isRecurring={selectedEvent.isRecurring}
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
                          title={selectedEvent.title}
                          countdown={countdown}
                          targetDate={targetDate}
                          emoji={selectedEvent.emoji}
                          size="small"
                          isRecurring={selectedEvent.isRecurring}
                        />
                      </div>
                      <div className="flex-shrink-0">
                        <p className="text-xs text-muted-foreground mb-2 text-center">Medium (4×2)</p>
                        <WidgetPreview
                          title={selectedEvent.title}
                          countdown={countdown}
                          targetDate={targetDate}
                          emoji={selectedEvent.emoji}
                          size="medium"
                          isRecurring={selectedEvent.isRecurring}
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
                      <div className="flex-shrink-0">
                        <p className="text-xs text-muted-foreground mb-2 text-center">Large (4×4)</p>
                        <WidgetPreview
                          title={selectedEvent.title}
                          countdown={countdown}
                          targetDate={targetDate}
                          emoji={selectedEvent.emoji}
                          size="large"
                          isRecurring={selectedEvent.isRecurring}
                        />
                      </div>
                      <div className="flex-shrink-0">
                        <p className="text-xs text-muted-foreground mb-2 text-center">Extra Large (4×5)</p>
                        <WidgetPreview
                          title={selectedEvent.title}
                          countdown={countdown}
                          targetDate={targetDate}
                          emoji={selectedEvent.emoji}
                          size="extraLarge"
                          isRecurring={selectedEvent.isRecurring}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

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
        onClose={handleCloseModal}
        onSave={handleSave}
        initialTitle={editingEvent?.title}
        initialDate={editingEvent ? new Date(editingEvent.targetDate) : undefined}
        initialEmoji={editingEvent?.emoji}
        initialIsRecurring={editingEvent?.isRecurring}
      />
    </div>
  );
}
