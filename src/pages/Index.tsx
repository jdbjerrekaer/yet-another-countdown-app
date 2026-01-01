import { useState, useEffect, useRef } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/react';
import { add } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import { Dialog } from '@capacitor/dialog';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { CountdownEvent, WidgetSize } from '@/types/countdown';
import { getNextRecurringDate } from '@/lib/recurring';
import { checkNotificationPermission, requestNotificationPermission } from '@/lib/notifications';

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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const lastDragEndTs = useRef<number>(0);
  const { trigger } = useHaptic();
  const isNative = Capacitor.isNativePlatform();
  const isMobile = useIsMobile();

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

  const handleSave = async (title: string, date: Date, emoji: string, isRecurring: boolean, emojiColor?: string) => {
    // Only request notification permission when creating a new event (not editing)
    if (!editingEvent) {
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) {
        await requestNotificationPermission();
      }
    }

    if (editingEvent) {
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id 
          ? { ...e, title, targetDate: date.toISOString(), emoji, emojiColor, isRecurring }
          : e
      ));
    } else {
      const newEvent: CountdownEvent = {
        id: generateId(),
        title,
        targetDate: date.toISOString(),
        emoji,
        emojiColor,
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

  const handleDeleteRequest = async (event: CountdownEvent): Promise<boolean> => {
    let confirmed = false;

    // Use ActionSheet on native platforms OR on mobile screens (PWA)
    if (isNative || isMobile) {
      // Use ActionSheet for native destructive button styling
      const result = await ActionSheet.showActions({
        title: 'Delete Event',
        message: `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
        options: [
          {
            title: 'Delete',
            style: ActionSheetButtonStyle.Destructive,
          },
          {
            title: 'Cancel',
            style: ActionSheetButtonStyle.Cancel,
          },
        ],
      });
      confirmed = result.index === 0;
    } else {
      // Use Dialog on desktop
      const { value } = await Dialog.confirm({
        title: 'Delete Event',
        message: `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
        okButtonTitle: 'Delete',
        cancelButtonTitle: 'Cancel',
      });
      confirmed = value;
    }

    if (confirmed) {
      // Delete button was pressed
      trigger('heavy');
      const eventId = event.id;
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
      return true; // Deletion confirmed
    } else {
      // Cancel button was pressed
      trigger('light');
      return false; // Deletion cancelled
    }
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
            <IonTitle size="large">Yet Another Countdown App</IonTitle>
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
                          emojiColor={selectedEvent.emojiColor}
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
        initialEmojiColor={editingEvent?.emojiColor}
        initialIsRecurring={editingEvent?.isRecurring}
        isEditing={!!editingEvent}
        onDelete={editingEvent ? () => handleDeleteRequest(editingEvent) : undefined}
      />

    </IonPage>
  );
}
