import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSegment, IonSegmentButton, IonFabButton } from '@ionic/react';
import { add, checkmark } from 'ionicons/icons';
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
  DragMoveEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { WidgetPreview } from '@/components/WidgetPreview';
import { DatePickerModal, DatePickerModalRef } from '@/components/DatePickerModal';
import { SortableCountdownCard } from '@/components/SortableCountdownCard';
import { CountdownCard } from '@/components/CountdownCard';
import { useCountdown } from '@/hooks/useCountdown';
import { useHaptic } from '@/hooks/useHaptic';
import { useIsMobile } from '@/hooks/use-mobile';
import { CountdownEvent, WidgetSize, WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getNextRecurringDate, getNextOccurrenceNumber, getRepetitionCount } from '@/lib/recurring';
import { checkNotificationPermission, requestNotificationPermission, scheduleEventNotification, cancelEventNotification, checkScheduledNotifications } from '@/lib/notifications';

const WIDGET_SIZES: { id: WidgetSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'extraLarge', label: 'Extra Large' },
];

const WIDGET_APPEARANCE_MODES: { id: WidgetAppearanceMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'transparent', label: 'Glass' },
  { id: 'tinted', label: 'Tinted' },
];

const WIDGET_COUNTDOWN_STYLES: { id: WidgetCountdownStyle; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'visual', label: 'Visual' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function Index() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('large');
  const [selectedAppearanceMode, setSelectedAppearanceMode] = useState<WidgetAppearanceMode>(() => {
    const saved = localStorage.getItem('widgetAppearanceMode');
    return (saved as WidgetAppearanceMode) || 'light';
  });
  const [selectedCountdownStyle, setSelectedCountdownStyle] = useState<WidgetCountdownStyle>(() => {
    const saved = localStorage.getItem('widgetCountdownStyle');
    return (saved as WidgetCountdownStyle) || 'focus';
  });
  const [editingEvent, setEditingEvent] = useState<CountdownEvent | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [canSaveForm, setCanSaveForm] = useState(false);
  const [draggedCardWidth, setDraggedCardWidth] = useState<number | null>(null);
  const lastDragEndTs = useRef<number>(0);
  const previousDragYRef = useRef<number | null>(null);
  const previousDragXRef = useRef<number | null>(null);
  const currentDragRotationRef = useRef<number>(0);
  const dragOverlayRef = useRef<HTMLDivElement>(null);
  const datePickerModalRef = useRef<DatePickerModalRef>(null);
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
  
  // Calculate occurrence number for events
  const occurrenceNumber = selectedEvent
    ? (selectedEvent.isRecurring
        ? (countdown.isPast
            ? getRepetitionCount(new Date(selectedEvent.targetDate))
            : getNextOccurrenceNumber(new Date(selectedEvent.targetDate)))
        : (countdown.isPast ? 1 : undefined))
    : undefined;

  useEffect(() => {
    localStorage.setItem('countdowns', JSON.stringify(events));
  }, [events]);

  // Persist appearance mode to localStorage
  useEffect(() => {
    localStorage.setItem('widgetAppearanceMode', selectedAppearanceMode);
  }, [selectedAppearanceMode]);

  // Persist countdown style to localStorage
  useEffect(() => {
    localStorage.setItem('widgetCountdownStyle', selectedCountdownStyle);
  }, [selectedCountdownStyle]);

  // Check scheduled notifications on app load (for web platform)
  useEffect(() => {
    checkScheduledNotifications();
    // Check every minute for web notifications
    const interval = setInterval(() => {
      checkScheduledNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Show confirmation dialog when date has changed during edit
  const confirmDateChange = async (eventTitle: string): Promise<boolean> => {
    let confirmed = false;

    // Use ActionSheet only on native platforms
    if (isNative) {
      const result = await ActionSheet.showActions({
        title: 'Date Changed',
        message: `You've changed the date for "${eventTitle}". Are you sure you want to save these changes?`,
        options: [
          {
            title: 'Save Changes',
            style: ActionSheetButtonStyle.Default,
          },
          {
            title: 'Cancel',
            style: ActionSheetButtonStyle.Cancel,
          },
        ],
      });
      confirmed = result.index === 0;
    } else {
      // Use Dialog on web platforms
      const { value } = await Dialog.confirm({
        title: 'Date Changed',
        message: `You've changed the date for "${eventTitle}". Are you sure you want to save these changes?`,
        okButtonTitle: 'Save Changes',
        cancelButtonTitle: 'Cancel',
      });
      confirmed = value;
    }

    return confirmed;
  };

  const handleSave = async (title: string, date: Date, emoji: string, isRecurring: boolean, emojiColor?: string) => {
    // Request notification permission when creating or editing an event
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      await requestNotificationPermission();
    }

    if (editingEvent) {
      // Cancel old notification and schedule new one
      await cancelEventNotification(editingEvent.id);
      
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id 
          ? { ...e, title, targetDate: date.toISOString(), emoji, emojiColor, isRecurring }
          : e
      ));
      
      // Schedule notification for the updated event
      const targetDateForNotification = isRecurring 
        ? getNextRecurringDate(date)
        : date;
      await scheduleEventNotification(editingEvent.id, title, targetDateForNotification, emoji);
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
      
      // Schedule notification for the new event
      const targetDateForNotification = isRecurring 
        ? getNextRecurringDate(date)
        : date;
      await scheduleEventNotification(newEvent.id, title, targetDateForNotification, emoji);
    }
    setEditingEvent(null);
  };

  const handleEdit = (event: CountdownEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = async (event: CountdownEvent): Promise<boolean> => {
    let confirmed = false;

    // Use ActionSheet only on native platforms
    if (isNative) {
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
      // Use Dialog on web platforms (including Safari PWA and mobile Safari)
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
      
      // Cancel the notification for this event
      await cancelEventNotification(eventId);
      
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
    // Note: Focus is now handled by onDidPresent + Capacitor Keyboard.show()
  };

  const handleFabClick = () => {
    if (isModalOpen) {
      // Modal is open - trigger save
      datePickerModalRef.current?.save();
    } else {
      // Modal is closed - open it
      handleAddNew();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setCanSaveForm(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    currentDragRotationRef.current = 0;
    previousDragYRef.current = null;
    previousDragXRef.current = null;
    // Set cursor to grabbing on body for proper cursor display
    document.body.style.cursor = 'grabbing';
    
    // Measure the actual card width to match it in DragOverlay
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const activeId = event.active.id as string;
      const cardElement = document.querySelector(`[data-sortable-id="${activeId}"]`) as HTMLElement;
      if (cardElement) {
        // Use getBoundingClientRect for more accurate measurement
        const rect = cardElement.getBoundingClientRect();
        setDraggedCardWidth(rect.width);
      } else {
        // Fallback: calculate width based on viewport minus padding
        // ion-padding typically adds 16px on each side
        const padding = 32; // 16px * 2
        const calculatedWidth = window.innerWidth - padding;
        setDraggedCardWidth(calculatedWidth);
      }
    });
    
    trigger('medium');
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (!event.delta) return;
    
    // event.delta is relative to drag start, so we need to track the previous delta
    // to calculate the change between moves
    const currentY = event.delta.y;
    const currentX = event.delta.x;
    const previousY = previousDragYRef.current;
    const previousX = previousDragXRef.current;

    if (previousY !== null && previousX !== null) {
      // Calculate deltas between moves (positive Y = moving down, positive X = moving right)
      const deltaY = currentY - previousY;
      const deltaX = currentX - previousX;
      
      // Calculate rotation angle based on movement direction
      // Vertical movement: highly reactive
      // Moving down (positive deltaY) = positive tilt, moving up (negative deltaY) = negative tilt
      const verticalTiltMultiplier = 0.08;
      const verticalRotationDelta = -deltaY * verticalTiltMultiplier;

      // Horizontal movement: noticeable tilt
      // Moving right (positive deltaX) = positive tilt, moving left (negative deltaX) = negative tilt
      const horizontalTiltMultiplier = 0.05;
      const horizontalRotationDelta = deltaX * horizontalTiltMultiplier;
      
      // Combine both rotation deltas
      const rotationDelta = verticalRotationDelta + horizontalRotationDelta;
      
      // Update rotation directly (accumulate changes) - clamped to -8deg to +8deg
      currentDragRotationRef.current = Math.max(-8, Math.min(8, currentDragRotationRef.current + rotationDelta));
      
      // Apply transform directly to DOM element for smooth animation on Safari
      // This avoids React state updates which cause jitter on mobile Safari
      if (dragOverlayRef.current) {
        dragOverlayRef.current.style.transform = `rotate(${currentDragRotationRef.current}deg) scale(1.02)`;
      }
    } else {
      // Initialize when starting to drag
      currentDragRotationRef.current = 0;
    }

    previousDragYRef.current = currentY;
    previousDragXRef.current = currentX;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    currentDragRotationRef.current = 0;
    previousDragYRef.current = null;
    previousDragXRef.current = null;
    setDraggedCardWidth(null);
    // Reset cursor
    document.body.style.cursor = '';
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

  const fabPortal = (
    <div className={`fab-portal${isModalOpen ? ' fab-portal--above-modal' : ''}`}>
      <IonFabButton 
        onClick={handleFabClick} 
        aria-label={isModalOpen ? "Save event" : "Add event"}
        disabled={isModalOpen && !canSaveForm}
        style={isModalOpen && !canSaveForm ? { 
          '--background': 'var(--ion-color-medium, #92949c)',
          '--background-activated': 'var(--ion-color-medium-shade, #7a7c85)',
        } as React.CSSProperties : undefined}
      >
        <IonIcon icon={isModalOpen ? checkmark : add} />
      </IonFabButton>
    </div>
  );

  return (
    <IonPage>

      <IonContent fullscreen className="ion-padding">
        {/* iOS large title header */}
        <IonHeader>
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
                Tap the + button below to create your first countdown
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
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={events.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
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
                  <DragOverlay 
                    style={{ zIndex: 9999 }}
                    dropAnimation={null}
                  >
                    {activeDragId ? (() => {
                      const activeEvent = events.find(e => e.id === activeDragId);
                      if (!activeEvent) return null;
                      return (
                        <div 
                          ref={dragOverlayRef}
                          className={`sortable-countdown-card is-dragging ${activeEvent.id === selectedEventId ? 'is-selected' : ''}`}
                          style={{ 
                            width: draggedCardWidth ? `${draggedCardWidth}px` : '100%',
                            maxWidth: draggedCardWidth ? `${draggedCardWidth}px` : 'none',
                            pointerEvents: 'none',
                            // Initial transform - will be updated directly via ref for smooth animation
                            transform: 'rotate(0deg) scale(1.02)',
                            transformOrigin: 'center center',
                            // Use CSS transition for smooth rotation - GPU accelerated
                            transition: 'transform 80ms ease-out',
                            // Force GPU compositing for smoother animation on Safari
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                          }}
                        >
                          <CountdownCard
                            event={activeEvent}
                            isSelected={activeEvent.id === selectedEventId}
                            onSelect={() => {}}
                            onEdit={() => {}}
                            onDelete={() => {}}
                            isReordering={true}
                            isDragging={true}
                          />
                        </div>
                      );
                    })() : null}
                  </DragOverlay>
                </DndContext>
              </section>

              {selectedEvent && (
                <>
                  {/* Size selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Widget Size
                    </h2>
                    <IonSegment
                      value={selectedSize}
                      onIonChange={(e) => {
                        trigger('selection');
                        setSelectedSize(e.detail.value as WidgetSize);
                      }}
                    >
                      {WIDGET_SIZES.map((size) => (
                        <IonSegmentButton key={size.id} value={size.id}>
                          {size.label}
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
                  </section>

                  {/* Countdown style selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Style
                    </h2>
                    <IonSegment
                      value={selectedCountdownStyle}
                      onIonChange={(e) => {
                        trigger('selection');
                        setSelectedCountdownStyle(e.detail.value as WidgetCountdownStyle);
                      }}
                    >
                      {WIDGET_COUNTDOWN_STYLES.map((style) => (
                        <IonSegmentButton key={style.id} value={style.id}>
                          {style.label}
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
                  </section>

                  {/* Appearance mode selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Appearance
                    </h2>
                    <IonSegment
                      value={selectedAppearanceMode}
                      onIonChange={(e) => {
                        trigger('selection');
                        setSelectedAppearanceMode(e.detail.value as WidgetAppearanceMode);
                      }}
                    >
                      {WIDGET_APPEARANCE_MODES.map((mode) => (
                        <IonSegmentButton key={mode.id} value={mode.id}>
                          {mode.label}
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
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
                          appearanceMode={selectedAppearanceMode}
                          countdownStyle={selectedCountdownStyle}
                          isRecurring={selectedEvent.isRecurring}
                          createdAt={new Date(selectedEvent.createdAt)}
                          nextOccurrenceNumber={occurrenceNumber}
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

      {typeof document !== 'undefined' ? createPortal(fabPortal, document.body) : null}

      {/* Modals rendered outside IonContent to ensure proper z-index */}
      <DatePickerModal
        ref={datePickerModalRef}
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
        onValidityChange={setCanSaveForm}
        onConfirmDateChange={confirmDateChange}
      />

    </IonPage>
  );
}
