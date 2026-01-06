import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSegment, IonSegmentButton, IonFabButton, IonButton, IonButtons } from '@ionic/react';
import { add, checkmark, calendarOutline } from 'ionicons/icons';
import { format } from 'date-fns';
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
import { useTranslation } from 'react-i18next';
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
import { EventImportPayload } from '@/lib/eventImportLink';
import { CalendarImportModal } from '@/components/CalendarImportModal';
import { ImportableEvent, convertToCountdownEvent, deduplicateEvents } from '@/lib/calendarImport';
import CalendarPlugin, { WidgetCountdownEvent } from '@/plugins/CalendarPlugin';
import { SharedSelection } from '@/lib/sharedSelection';

const WIDGET_SIZES: { id: WidgetSize; labelKey: string }[] = [
  { id: 'small', labelKey: 'widget.sizes.small' },
  { id: 'medium', labelKey: 'widget.sizes.medium' },
  { id: 'large', labelKey: 'widget.sizes.large' },
  { id: 'extraLarge', labelKey: 'widget.sizes.extraLarge' },
];

const WIDGET_APPEARANCE_MODES: { id: WidgetAppearanceMode; labelKey: string }[] = [
  { id: 'light', labelKey: 'widget.appearances.light' },
  { id: 'dark', labelKey: 'widget.appearances.dark' },
  { id: 'transparent', labelKey: 'widget.appearances.transparent' },
  { id: 'tinted', labelKey: 'widget.appearances.tinted' },
];

const WIDGET_COUNTDOWN_STYLES: { id: WidgetCountdownStyle; labelKey: string }[] = [
  { id: 'focus', labelKey: 'widget.styles.focus' },
  { id: 'visual', labelKey: 'widget.styles.visual' },
  { id: 'classic', labelKey: 'widget.styles.classic' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function Index() {
  const { t } = useTranslation();
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
  const [isCalendarImportOpen, setIsCalendarImportOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [canSaveForm, setCanSaveForm] = useState(false);
  const [draggedCardWidth, setDraggedCardWidth] = useState<number | null>(null);
  const lastDragEndTs = useRef<number>(0);
  const previousDragYRef = useRef<number | null>(null);
  const previousDragXRef = useRef<number | null>(null);
  const targetDragRotationRef = useRef<number>(0);
  const displayedDragRotationRef = useRef<number>(0);
  const dragAnimationFrameRef = useRef<number | null>(null);
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
    // Migrate from old single-countdown format if it exists
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

  // Debug: Test CalendarPlugin immediately on mount - use direct Capacitor call
  useEffect(() => {
    const testPlugin = async () => {
      const platform = Capacitor.getPlatform();
      const native = Capacitor.isNativePlatform();
      
      // Log directly to native console via a trick
      console.log('[WidgetSync] Platform:', platform, 'isNative:', native);
      
      // Get events from localStorage directly to avoid closure issues
      const saved = localStorage.getItem('countdowns');
      const storedEvents = saved ? JSON.parse(saved) : [];
      
      console.log('[WidgetSync] Events from localStorage:', storedEvents.length);
      
      if (native && storedEvents.length > 0) {
        try {
          console.log('[WidgetSync] Calling CalendarPlugin.updateWidgetData...');
          const testEvents = storedEvents.map((e: CountdownEvent) => ({
            id: e.id,
            title: e.title,
            targetDate: e.targetDate,
            emoji: e.emoji,
            emojiColor: e.emojiColor,
            isRecurring: e.isRecurring,
            createdAt: e.createdAt,
          }));
          
          console.log('[WidgetSync] Events to sync:', JSON.stringify(testEvents));
          
          const result = await CalendarPlugin.updateWidgetData({
            events: testEvents,
            appearanceMode: 'light',
            countdownStyle: 'focus',
          });
          console.log('[WidgetSync] SUCCESS! Result:', JSON.stringify(result));
        } catch (error) {
          console.error('[WidgetSync] FAILED:', error);
        }
      } else {
        console.log('[WidgetSync] Skipping sync - native:', native, 'events:', storedEvents.length);
      }
    };
    
    // Run immediately and after delay
    testPlugin();
    setTimeout(testPlugin, 2000);
  }, []);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  useEffect(() => {
    const pushSelectedToWidget = async () => {
      if (!isNative) return;
      const event = selectedEvent;
      if (!event) return;
      try {
        await SharedSelection.setSelectedEvent({
          id: event.id,
          title: event.title,
          targetDate: event.targetDate,
          emoji: event.emoji,
          emojiColor: event.emojiColor,
          isRecurring: !!event.isRecurring,
        });
      } catch (e) {
        console.warn('Failed to push selection to widget:', e);
      }
    };
    pushSelectedToWidget();
  }, [isNative, selectedEvent]);
  
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

  // Sync widget data to native storage whenever events or widget settings change
  useEffect(() => {
    const syncWidgetData = async () => {
      console.log('[WidgetSync] Starting sync, isNative:', isNative, 'events count:', events.length);
      
      if (!isNative) {
        console.log('[WidgetSync] Skipping - not native platform');
        return;
      }
      
      try {
        // Convert events to widget format
        const widgetEvents: WidgetCountdownEvent[] = events.map(event => ({
          id: event.id,
          title: event.title,
          targetDate: event.targetDate,
          emoji: event.emoji,
          emojiColor: event.emojiColor,
          isRecurring: event.isRecurring,
          createdAt: event.createdAt,
        }));

        console.log('[WidgetSync] Calling updateWidgetData with', widgetEvents.length, 'events');
        console.log('[WidgetSync] Events:', JSON.stringify(widgetEvents, null, 2));
        
        const result = await CalendarPlugin.updateWidgetData({
          events: widgetEvents,
          appearanceMode: selectedAppearanceMode,
          countdownStyle: selectedCountdownStyle,
        });
        
        console.log('[WidgetSync] Success:', result);
      } catch (error) {
        console.error('[WidgetSync] Failed to sync widget data:', error);
      }
    };

    syncWidgetData();
  }, [events, selectedAppearanceMode, selectedCountdownStyle, isNative]);

  // Check scheduled notifications on app load (for web platform)
  useEffect(() => {
    checkScheduledNotifications();
    // Check every minute for web notifications
    const interval = setInterval(() => {
      checkScheduledNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle pending imported events
  useEffect(() => {
    const handlePendingImport = async () => {
      const pendingImportStr = localStorage.getItem('pendingImportedEvent');
      if (!pendingImportStr) {
        return;
      }

      try {
        const payload: EventImportPayload = JSON.parse(pendingImportStr);
        
        // Format date for display
        const eventDate = new Date(payload.targetDate);
        const dateFormatted = format(eventDate, 'MMM d, yyyy');
        
        // Show confirmation dialog
        let confirmed = false;
        
        if (isNative) {
          const result = await ActionSheet.showActions({
            title: t('dialogs.importEvent.title'),
            message: t('dialogs.importEvent.message', { 
              title: payload.title, 
              emoji: payload.emoji,
              date: dateFormatted 
            }),
            options: [
              {
                title: t('dialogs.importEvent.import'),
                style: ActionSheetButtonStyle.Default,
              },
              {
                title: t('dialogs.importEvent.cancel'),
                style: ActionSheetButtonStyle.Cancel,
              },
            ],
          });
          confirmed = result.index === 0;
        } else {
          const { value } = await Dialog.confirm({
            title: t('dialogs.importEvent.title'),
            message: t('dialogs.importEvent.message', { 
              title: payload.title, 
              emoji: payload.emoji,
              date: dateFormatted 
            }),
            okButtonTitle: t('dialogs.importEvent.import'),
            cancelButtonTitle: t('dialogs.importEvent.cancel'),
          });
          confirmed = value;
        }

        if (confirmed) {
          // Create new event from imported payload
          const newEvent: CountdownEvent = {
            id: generateId(),
            title: payload.title,
            targetDate: payload.targetDate,
            emoji: payload.emoji,
            emojiColor: payload.emojiColor,
            isRecurring: payload.isRecurring,
            createdAt: new Date().toISOString(),
          };
          
          setEvents(prev => [...prev, newEvent]);
          setSelectedEventId(newEvent.id);
          
          // Schedule notification only if permission is already granted (don't prompt on import)
          const hasPermission = await checkNotificationPermission();
          if (hasPermission) {
            const targetDateForNotification = payload.isRecurring 
              ? getNextRecurringDate(new Date(payload.targetDate))
              : new Date(payload.targetDate);
            await scheduleEventNotification(newEvent.id, payload.title, targetDateForNotification, payload.emoji);
          }
        }
        
        // Clear pending import regardless of confirmation
        localStorage.removeItem('pendingImportedEvent');
      } catch (error) {
        console.error('Failed to import event:', error);
        // Clear invalid pending import
        localStorage.removeItem('pendingImportedEvent');
      }
    };

    handlePendingImport();
  }, [isNative, t]);

  // Show confirmation dialog when date has changed during edit
  const confirmDateChange = async (eventTitle: string, oldDate: Date, newDate: Date): Promise<boolean> => {
    let confirmed = false;
    
    // Format dates for display
    const oldDateFormatted = format(oldDate, 'MMM d, yyyy');
    const newDateFormatted = format(newDate, 'MMM d, yyyy');

    // Use ActionSheet only on native platforms
    if (isNative) {
      const result = await ActionSheet.showActions({
        title: t('dialogs.dateChanged.title'),
        message: t('dialogs.dateChanged.message', { title: eventTitle, oldDate: oldDateFormatted, newDate: newDateFormatted }),
        options: [
          {
            title: t('dialogs.dateChanged.save'),
            style: ActionSheetButtonStyle.Default,
          },
          {
            title: t('dialogs.dateChanged.cancel'),
            style: ActionSheetButtonStyle.Cancel,
          },
        ],
      });
      confirmed = result.index === 0;
    } else {
      // Use Dialog on web platforms
      const { value } = await Dialog.confirm({
        title: t('dialogs.dateChanged.title'),
        message: t('dialogs.dateChanged.message', { title: eventTitle, oldDate: oldDateFormatted, newDate: newDateFormatted }),
        okButtonTitle: t('dialogs.dateChanged.save'),
        cancelButtonTitle: t('dialogs.dateChanged.cancel'),
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
        title: t('dialogs.deleteEvent.title'),
        message: t('dialogs.deleteEvent.message', { title: event.title }),
        options: [
          {
            title: t('dialogs.deleteEvent.delete'),
            style: ActionSheetButtonStyle.Destructive,
          },
          {
            title: t('dialogs.deleteEvent.cancel'),
            style: ActionSheetButtonStyle.Cancel,
          },
        ],
      });
      confirmed = result.index === 0;
    } else {
      // Use Dialog on web platforms (including Safari PWA and mobile Safari)
      const { value } = await Dialog.confirm({
        title: t('dialogs.deleteEvent.title'),
        message: t('dialogs.deleteEvent.message', { title: event.title }),
        okButtonTitle: t('dialogs.deleteEvent.delete'),
        cancelButtonTitle: t('dialogs.deleteEvent.cancel'),
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

  const handleOpenCalendarImport = async () => {
    trigger('light');
    
    // On native platforms, request calendar permission first before opening modal
    if (isNative) {
      try {
        const result = await CalendarPlugin.checkPermission();
        console.log('[Calendar] Permission check result:', result);
        
        if (!result.granted) {
          // Check if permission was already denied (user must go to Settings)
          // vs not determined (we can request permission)
          if (result.status === 'denied' || result.status === 'restricted') {
            console.log('[Calendar] Permission denied/restricted, showing settings dialog');
            // Permission was previously denied - need to open Settings
            const { value: shouldOpenSettings } = await Dialog.confirm({
              title: t('calendar.permissionDeniedTitle'),
              message: t('calendar.permissionDeniedMessage'),
              okButtonTitle: t('calendar.openSettings'),
              cancelButtonTitle: t('modal.cancel'),
            });
            
            if (shouldOpenSettings) {
              console.log('[Calendar] User wants to open settings');
              try {
                const settingsResult = await CalendarPlugin.openSettings();
                console.log('[Calendar] openSettings result:', settingsResult);
              } catch (settingsError) {
                console.error('[Calendar] Failed to open settings:', settingsError);
              }
            }
            return;
          }
          
          // Permission not determined yet, request it
          console.log('[Calendar] Permission not determined, requesting...');
          const requestResult = await CalendarPlugin.requestPermission();
          console.log('[Calendar] Permission request result:', requestResult);
          
          if (!requestResult.granted) {
            // User denied the permission request
            await Dialog.alert({
              title: t('calendar.permissionDeniedTitle'),
              message: t('calendar.permissionDeniedMessage'),
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check/request calendar permission:', error);
        // Continue to open modal anyway, it will handle errors
      }
    }
    
    setIsCalendarImportOpen(true);
  };

  const handleCalendarImport = async (importedEvents: ImportableEvent[]) => {
    // Check notification permission once before importing
    const hasPermission = await checkNotificationPermission();

    // Safety net: deduplicate imported events to prevent duplicates
    // This handles edge cases where duplicates might slip through the import modal
    const deduplicatedImports = deduplicateEvents(importedEvents);

    // Convert and add each event
    for (const importedEvent of deduplicatedImports) {
      const eventData = convertToCountdownEvent(importedEvent, generateId);
      const newEvent: CountdownEvent = {
        id: generateId(),
        ...eventData,
        createdAt: new Date().toISOString(),
      };
      
      setEvents(prev => [...prev, newEvent]);
      
      // Schedule notification if permission is already granted
      if (hasPermission) {
        const targetDateForNotification = newEvent.isRecurring 
          ? getNextRecurringDate(new Date(newEvent.targetDate))
          : new Date(newEvent.targetDate);
        await scheduleEventNotification(newEvent.id, newEvent.title, targetDateForNotification, newEvent.emoji);
      }
    }
    
    // Select the first imported event
    if (importedEvents.length > 0) {
      // We need to wait for state to update, so we'll set it after the events are added
      // This is handled by the useEffect that selects first event if none selected
    }
    
    trigger('medium');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    targetDragRotationRef.current = 0;
    displayedDragRotationRef.current = 0;
    previousDragYRef.current = null;
    previousDragXRef.current = null;
    // Set cursor to grabbing on body for proper cursor display
    document.body.style.cursor = 'grabbing';
    
    // Start the smooth rotation animation loop
    const animateRotation = () => {
      const target = targetDragRotationRef.current;
      const current = displayedDragRotationRef.current;
      
      // Smooth interpolation factor - lower = smoother but more laggy
      // 0.15 provides good balance between responsiveness and smoothness
      const lerpFactor = 0.15;
      
      // Interpolate towards target rotation
      const newRotation = current + (target - current) * lerpFactor;
      
      // Only update DOM if there's meaningful change (reduces Safari repaints)
      if (Math.abs(newRotation - current) > 0.01) {
        displayedDragRotationRef.current = newRotation;
        if (dragOverlayRef.current) {
          dragOverlayRef.current.style.transform = `rotate(${newRotation}deg) scale(1.02)`;
        }
      }
      
      // Continue animation loop while dragging
      dragAnimationFrameRef.current = requestAnimationFrame(animateRotation);
    };
    
    dragAnimationFrameRef.current = requestAnimationFrame(animateRotation);
    
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
      
      // Update TARGET rotation (the animation loop will smoothly interpolate towards this)
      // This decouples user input from DOM updates, preventing Safari mobile jitter
      targetDragRotationRef.current = Math.max(-8, Math.min(8, targetDragRotationRef.current + rotationDelta));
    } else {
      // Initialize when starting to drag
      targetDragRotationRef.current = 0;
      displayedDragRotationRef.current = 0;
    }

    previousDragYRef.current = currentY;
    previousDragXRef.current = currentX;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    targetDragRotationRef.current = 0;
    displayedDragRotationRef.current = 0;
    previousDragYRef.current = null;
    previousDragXRef.current = null;
    setDraggedCardWidth(null);
    // Cancel the animation loop
    if (dragAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
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
        aria-label={isModalOpen ? t('aria.saveEvent') : t('aria.addEvent')}
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
            <IonTitle size="large">{t('app.title')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleOpenCalendarImport} aria-label={t('aria.importFromCalendar')}>
                <IonIcon icon={calendarOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        {/* Main content */}
        <div className="pb-12">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center shadow-ios-lg mb-6 animate-float">
                <span className="text-4xl">⏳</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('app.noCountdowns')}</h2>
              <p className="text-muted-foreground text-center max-w-xs mb-8">
                {t('app.createFirst')}
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Events list */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('events.title')}
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
                          isNative={isNative}
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
                            // NO CSS transition - we use requestAnimationFrame with manual interpolation
                            // CSS transitions conflict with direct DOM updates causing jitter on Safari mobile
                            transition: 'none',
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
                            isNative={isNative}
                          />
                        </div>
                      );
                    })() : null}
                  </DragOverlay>
                </DndContext>
              </section>

              {/* Widget preview section - only show on web, not native apps */}
              {selectedEvent && !isNative && (
                <>
                  {/* Size selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('widget.size')}
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
                          {t(size.labelKey)}
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
                  </section>

                  {/* Countdown style selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('widget.style')}
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
                          {t(style.labelKey)}
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
                  </section>

                  {/* Appearance mode selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('widget.appearance')}
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
                          {t(mode.labelKey)}
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
                  </section>

                  {/* Widget preview */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('widget.preview')}
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

      {typeof document !== 'undefined' && !isCalendarImportOpen ? createPortal(fabPortal, document.body) : null}

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
        initialIsImported={editingEvent?.isImported}
        initialImportedFrom={editingEvent?.importedFrom}
        isEditing={!!editingEvent}
        onDelete={editingEvent ? () => handleDeleteRequest(editingEvent) : undefined}
        onValidityChange={setCanSaveForm}
        onConfirmDateChange={confirmDateChange}
      />

      <CalendarImportModal
        isOpen={isCalendarImportOpen}
        onClose={() => setIsCalendarImportOpen(false)}
        onImport={handleCalendarImport}
      />

    </IonPage>
  );
}

