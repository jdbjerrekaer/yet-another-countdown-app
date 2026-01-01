import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { WidgetPreview } from '@/components/WidgetPreview';
import { DatePickerModal } from '@/components/DatePickerModal';
import { CountdownCard } from '@/components/CountdownCard';
import { useCountdown } from '@/hooks/useCountdown';
import { useHaptic } from '@/hooks/useHaptic';
import { CountdownEvent, WidgetSize } from '@/types/countdown';
import { getNextRecurringDate } from '@/lib/recurring';

const WIDGET_SIZES: { id: WidgetSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'extraLarge', label: 'Extra Large' },
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

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  
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
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id 
          ? { ...e, title, targetDate: date.toISOString(), emoji, isRecurring }
          : e
      ));
    } else {
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
    <div className="min-h-screen bg-background">
      {/* Safe area top */}
      <div className="h-12 w-full" />
      
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Countdown</h1>
        <button 
          onClick={handleAddNew}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-ios"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </header>

      {/* Main content */}
      <main className="px-5 pb-12">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center shadow-ios-lg mb-6 animate-float">
              <span className="text-4xl">⏳</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Countdowns</h2>
            <p className="text-muted-foreground text-center max-w-xs mb-8">
              Tap the + button to create your first countdown
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Events list */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Events
              </h2>
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
            </section>

            {selectedEvent && (
              <>
                {/* Size selector */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Widget Size
                  </h2>
                  <div className="flex gap-2">
                    {WIDGET_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => {
                          trigger('selection');
                          setSelectedSize(size.id);
                        }}
                        className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                          selectedSize === size.id
                            ? 'bg-primary text-primary-foreground shadow-ios'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Widget preview */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Preview
                  </h2>
                  <div className="flex justify-center py-4">
                    <div className="animate-scale-in" key={`${selectedEventId}-${selectedSize}`}>
                      <WidgetPreview
                        title={selectedEvent.title}
                        countdown={countdown}
                        targetDate={targetDate}
                        emoji={selectedEvent.emoji}
                        size={selectedSize}
                        isRecurring={selectedEvent.isRecurring}
                        createdAt={new Date(selectedEvent.createdAt)}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </main>

      <DatePickerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialTitle={editingEvent?.title}
        initialDate={editingEvent ? new Date(editingEvent.targetDate) : undefined}
        initialEmoji={editingEvent?.emoji}
        initialIsRecurring={editingEvent?.isRecurring}
        isEditing={!!editingEvent}
      />
    </div>
  );
}
