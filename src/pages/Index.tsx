import { useState, useEffect, useRef } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/react';
import { add } from 'ionicons/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { WidgetPreview } from '@/components/WidgetPreview';
import { DatePickerModal } from '@/components/DatePickerModal';
import { SortableCountdownCard } from '@/components/SortableCountdownCard';
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CountdownEvent | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const lastDragEndTs = useRef<number>(0);
  const { trigger } = useHaptic();

  // Configure sensors with long-press activation (300ms delay)
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      delay: 300,
      tolerance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 300,
      tolerance: 5,
    },
  });
  const sensors = useSensors(pointerSensor, touchSensor);
  
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

  const handleDeleteRequest = (event: CountdownEvent) => {
    setEventToDelete(event);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      trigger('heavy');
      const eventId = eventToDelete.id;
      const wasSelected = selectedEventId === eventId;
      
      setEvents(prev => {
        const filtered = prev.filter(e => e.id !== eventId);
        // Update selected event if the deleted event was selected
        if (wasSelected) {
          if (filtered.length > 0) {
            setSelectedEventId(filtered[0].id);
          } else {
            setSelectedEventId(null);
          }
        }
        return filtered;
      });
      
      setShowDeleteConfirmation(false);
      setEventToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    trigger('light');
    setShowDeleteConfirmation(false);
    setEventToDelete(null);
  };

  const handleAddNew = () => {
    console.log('handleAddNew called, opening modal');
    trigger('medium');
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    trigger('medium');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    lastDragEndTs.current = Date.now();

    if (over && active.id !== over.id) {
      setEvents((prev) => {
        const oldIndex = prev.findIndex((e) => e.id === active.id);
        const newIndex = prev.findIndex((e) => e.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
      trigger('light');
    }
  };

  // Check if a tap should be ignored (happened too soon after a drag ended)
  const shouldIgnoreTap = () => {
    return Date.now() - lastDragEndTs.current < 200;
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Countdown</IonTitle>
          <IonButtons slot="end">
            <IonButton 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddNew();
              }}
              type="button"
            >
              <IonIcon icon={add} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {/* iOS large title header (collapsible) */}
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Countdown</IonTitle>
          </IonToolbar>
        </IonHeader>

        {/* Main content */}
        <div className="pb-12">
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={events.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {events.map(event => (
                        <SortableCountdownCard
                          key={event.id}
                          event={event}
                          isSelected={event.id === selectedEventId}
                          isReordering={activeDragId !== null}
                          onSelect={() => {
                            if (shouldIgnoreTap()) return;
                            trigger('light');
                            setSelectedEventId(event.id);
                          }}
                          onEdit={() => {
                            if (shouldIgnoreTap()) return;
                            handleEdit(event);
                          }}
                          onDelete={() => handleDeleteRequest(event)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
        </div>
      </IonContent>

      {/* Modals rendered outside IonContent to ensure proper z-index */}
      <DatePickerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialTitle={editingEvent?.title}
        initialDate={editingEvent ? new Date(editingEvent.targetDate) : (() => {
          const today = new Date();
          today.setHours(8, 0, 0, 0);
          return today;
        })()}
        initialEmoji={editingEvent?.emoji}
        initialIsRecurring={editingEvent?.isRecurring}
        isEditing={!!editingEvent}
        onDelete={editingEvent ? () => handleDeleteRequest(editingEvent) : undefined}
      />

      {/* Native iOS-style Delete Confirmation Dialog */}
        {showDeleteConfirmation && eventToDelete && (
          <>
            <div 
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={handleDeleteCancel}
            />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-[270px] bg-[hsl(var(--background)/0.85)] backdrop-blur-xl rounded-[14px] overflow-hidden shadow-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="px-4 pt-5 pb-4 text-center">
                  <h3 className="text-[17px] font-semibold text-foreground leading-tight">
                    Delete Event?
                  </h3>
                  <p className="text-[13px] text-muted-foreground mt-2 leading-snug">
                    "{eventToDelete.title}" will be permanently deleted.
                  </p>
                </div>
                
                {/* Buttons */}
                <div className="border-t border-border/40">
                  <button
                    onClick={handleDeleteCancel}
                    className="w-full py-[11px] text-[17px] text-primary font-normal active:bg-primary/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <div className="border-t border-border/40">
                  <button
                    onClick={handleDeleteConfirm}
                    className="w-full py-[11px] text-[17px] text-destructive font-semibold active:bg-destructive/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
    </IonPage>
  );
}
