import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSegment, IonSegmentButton, IonFabButton, IonButton, IonButtons, IonToggle } from '@ionic/react';
import { add, checkmark, calendarOutline } from 'ionicons/icons';
import { format, differenceInYears } from 'date-fns';
import { Capacitor } from '@capacitor/core';
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
import { TripleLargeWidget } from '@/components/widgets/TripleLargeWidget';
import { useHaptic } from '@/hooks/useHaptic';
import { useIsMobile } from '@/hooks/use-mobile';
import { CountdownEvent, WidgetSize, WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getNextRecurringDate, getNextOccurrenceNumber, getRepetitionCount } from '@/lib/recurring';
import { checkNotificationPermission, requestNotificationPermission, scheduleEventNotification, cancelEventNotification, checkScheduledNotifications } from '@/lib/notifications';
import { EventImportPayload } from '@/lib/eventImportLink';
import { CalendarImportModal } from '@/components/CalendarImportModal';
import { ImportableEvent, convertToCountdownEvent, deduplicateEvents } from '@/lib/calendarImport';
import CalendarPlugin, { WidgetCountdownEvent } from '@/plugins/CalendarPlugin';
import ICloudSyncPlugin from '@/plugins/ICloudSyncPlugin';
import { SharedSelection } from '@/lib/sharedSelection';
import { EDIT_EVENT_DEEP_LINK, EditEventDeepLinkDetail } from '@/components/DeepLinkHandler';
import { AdsManager } from '@/lib/ads/adsManager';
import { toast } from 'sonner';
import BuildInfo from '@/plugins/BuildInfoPlugin';

const WIDGET_SIZES: { id: WidgetSize; labelKey: string }[] = [
  { id: 'small', labelKey: 'widget.sizes.small' },
  { id: 'medium', labelKey: 'widget.sizes.medium' },
  { id: 'large', labelKey: 'widget.sizes.large' },
];

// Get available widget sizes based on countdown style
const getAvailableSizes = (countdownStyle: WidgetCountdownStyle): { id: WidgetSize; labelKey: string }[] => {
  return WIDGET_SIZES.filter(size => {
    // Exclude large when classic style is selected
    if (countdownStyle === 'classic' && size.id === 'large') return false;
    return true;
  });
};

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

const LOCAL_STORAGE_KEYS = {
  countdowns: 'countdowns',
  lastModified: 'countdownsLastModified',
  icloudEnabled: 'icloudSyncEnabled',
  icloudLastSyncedAt: 'icloudLastSyncedAt',
};

const ICLOUD_STORAGE_KEYS = {
  countdowns: 'countdowns_blob',
  lastModified: 'countdowns_lastModified',
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const getIsoNow = () => new Date().toISOString();

const normalizeCountdownEvents = (events: CountdownEvent[]): CountdownEvent[] => {
  const now = getIsoNow();
  return events.map(event => ({
    ...event,
    createdAt: event.createdAt || now,
    updatedAt: event.updatedAt || event.createdAt || now,
  }));
};

const maxIsoTimestamp = (a?: string | null, b?: string | null) => {
  if (!a) return b ?? '';
  if (!b) return a;
  return a > b ? a : b;
};

// Triple Widget Preview Component
function TripleWidgetPreview({ 
  events, 
  appearanceMode,
  countdownStyle,
  getNextRecurringDate,
  getNextOccurrenceNumber
}: { 
  events: CountdownEvent[]; 
  appearanceMode: WidgetAppearanceMode;
  countdownStyle: WidgetCountdownStyle;
  getNextRecurringDate: (date: Date) => Date | null;
  getNextOccurrenceNumber: (date: Date) => number | undefined;
}) {
  const event1 = events[0] || null;
  const event2 = events[1] || null;
  const event3 = events[2] || null;

  const targetDate1 = event1 
    ? (event1.isRecurring 
        ? getNextRecurringDate(new Date(event1.targetDate))
        : new Date(event1.targetDate))
    : null;
  const targetDate2 = event2 
    ? (event2.isRecurring 
        ? getNextRecurringDate(new Date(event2.targetDate))
        : new Date(event2.targetDate))
    : null;
  const targetDate3 = event3 
    ? (event3.isRecurring 
        ? getNextRecurringDate(new Date(event3.targetDate))
        : new Date(event3.targetDate))
    : null;

  const countdown1 = useCountdown(targetDate1);
  const countdown2 = useCountdown(targetDate2);
  const countdown3 = useCountdown(targetDate3);

  const occurrenceNumber1 = event1 && event1.isRecurring
    ? (countdown1.isPast
        ? getRepetitionCount(new Date(event1.targetDate))
        : getNextOccurrenceNumber(new Date(event1.targetDate)))
    : undefined;
  const occurrenceNumber2 = event2 && event2.isRecurring
    ? (countdown2.isPast
        ? getRepetitionCount(new Date(event2.targetDate))
        : getNextOccurrenceNumber(new Date(event2.targetDate)))
    : undefined;
  const occurrenceNumber3 = event3 && event3.isRecurring
    ? (countdown3.isPast
        ? getRepetitionCount(new Date(event3.targetDate))
        : getNextOccurrenceNumber(new Date(event3.targetDate)))
    : undefined;

  return (
    <TripleLargeWidget
      event1={event1 ? {
        title: event1.title,
        countdown: countdown1,
        targetDate: targetDate1,
        emoji: event1.emoji,
        emojiColor: event1.emojiColor,
        isRecurring: event1.isRecurring,
        nextOccurrenceNumber: occurrenceNumber1,
        createdAt: new Date(event1.createdAt),
      } : null}
      event2={event2 ? {
        title: event2.title,
        countdown: countdown2,
        targetDate: targetDate2,
        emoji: event2.emoji,
        emojiColor: event2.emojiColor,
        isRecurring: event2.isRecurring,
        nextOccurrenceNumber: occurrenceNumber2,
        createdAt: new Date(event2.createdAt),
      } : null}
      event3={event3 ? {
        title: event3.title,
        countdown: countdown3,
        targetDate: targetDate3,
        emoji: event3.emoji,
        emojiColor: event3.emojiColor,
        isRecurring: event3.isRecurring,
        nextOccurrenceNumber: occurrenceNumber3,
        createdAt: new Date(event3.createdAt),
      } : null}
      appearanceMode={appearanceMode}
      countdownStyle={countdownStyle}
    />
  );
}

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
  const titlePressTimeoutRef = useRef<number | null>(null);
  const eventsRef = useRef<CountdownEvent[]>([]);
  const localLastModifiedRef = useRef<string>('');
  const isApplyingRemoteRef = useRef(false);
  const isSyncingRef = useRef(false);
  const lastAppliedCloudModifiedRef = useRef<string | null>(null);
  const lastPushedModifiedRef = useRef<string | null>(null);
  const iCloudPushTimeoutRef = useRef<number | null>(null);
  const { trigger } = useHaptic();
  const isNative = Capacitor.isNativePlatform();
  const isMobile = useIsMobile();
  const [isDevBuild, setIsDevBuild] = useState(import.meta.env.MODE !== 'production');
  const [devAdsEnabled, setDevAdsEnabled] = useState(false);
  const [showAdPlaceholder, setShowAdPlaceholder] = useState(false);
  const placeholderHeight = 60; // Increased to match adaptive banners better

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
  
  const initialEvents = useMemo(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.countdowns);
    if (saved) {
      const parsed = JSON.parse(saved) as CountdownEvent[];
      return normalizeCountdownEvents(parsed);
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
        createdAt: getIsoNow(),
        updatedAt: getIsoNow(),
      };
      return [migrated];
    }
    return [];
  }, []);

  const [events, setEvents] = useState<CountdownEvent[]>(initialEvents);
  const [localLastModified, setLocalLastModified] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.lastModified);
    if (saved) {
      return saved;
    }
    const latest = initialEvents.reduce((max, event) => maxIsoTimestamp(max, event.updatedAt), '');
    return latest || getIsoNow();
  });
  const [icloudEnabled, setIcloudEnabled] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.icloudEnabled) === 'true';
  });
  const [icloudAvailable, setIcloudAvailable] = useState<boolean | null>(null);
  const [icloudStatus, setIcloudStatus] = useState<'idle' | 'checking' | 'unavailable' | 'syncing' | 'error'>('idle');
  const [icloudLastSyncedAt, setIcloudLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.icloudLastSyncedAt);
  });
  const activeEvents = useMemo(() => events.filter(event => !event.deletedAt), [events]);

  useEffect(() => {
    if (activeEvents.length > 0) {
      if (!selectedEventId || !activeEvents.some(event => event.id === selectedEventId)) {
        setSelectedEventId(activeEvents[0].id);
      }
      return;
    }
    if (selectedEventId) {
      setSelectedEventId(null);
    }
  }, [activeEvents, selectedEventId]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    localLastModifiedRef.current = localLastModified;
  }, [localLastModified]);

  useEffect(() => {
    if (!isNative) return;
    if (isModalOpen || isCalendarImportOpen) {
      void AdsManager.hideBanner();
    } else {
      void AdsManager.showBanner();
    }
    return () => {
      void AdsManager.hideBanner();
    };
  }, [isNative, isModalOpen, isCalendarImportOpen]);

  useEffect(() => {
    if (!isNative) return;
    const loadBuildInfo = async () => {
      try {
        const info = await BuildInfo.getBuildType();
        setIsDevBuild(info.buildType === 'debug');
        AdsManager.setDevBuild(info.buildType === 'debug');
      } catch (error) {
        console.warn('[BuildInfo] Failed to read build type', error);
      }
    };
    loadBuildInfo();
  }, [isNative]);

  useEffect(() => {
    // On web, always show placeholder (ads don't load on web)
    if (!isNative) {
      setShowAdPlaceholder(true);
      return;
    }

    // On native, handle ad state
    const loadAdsState = async () => {
      const enabled = isDevBuild ? await AdsManager.getDevAdsEnabled() : true;
      setDevAdsEnabled(enabled);
      setShowAdPlaceholder(enabled && AdsManager.getBannerStatus() !== 'visible');
    };

    loadAdsState();
    const unsubscribe = AdsManager.onBannerStatusChange((status) => {
      const enabled = isDevBuild ? devAdsEnabled : true;
      setShowAdPlaceholder(enabled && status === 'hidden'); // Only show placeholder while hidden/loading
    });

    return () => {
      unsubscribe?.();
    };
  }, [isNative, isDevBuild, devAdsEnabled]);

  useEffect(() => {
    if (!isDevBuild) return;
    if (!devAdsEnabled) {
      setShowAdPlaceholder(false);
      if (typeof document !== 'undefined') {
        delete document.documentElement.dataset.adPlaceholder;
        document.documentElement.style.setProperty('--ad-banner-height', '0px');
      }
      if (isNative) {
        void AdsManager.hideBanner();
      }
    }
  }, [isDevBuild, devAdsEnabled, isNative]);

  useEffect(() => {
    const bannerStatus = AdsManager.getBannerStatus();
    if (showAdPlaceholder) {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.adPlaceholder = 'true';
      }
      document.documentElement.style.setProperty('--ad-banner-height', `${placeholderHeight}px`);
    } else if (bannerStatus !== 'visible') {
      if (typeof document !== 'undefined') {
        delete document.documentElement.dataset.adPlaceholder;
      }
      document.documentElement.style.setProperty('--ad-banner-height', '0px');
    }
  }, [showAdPlaceholder, placeholderHeight]);

  const handleTitlePressStart = () => {
    if (!isDevBuild || titlePressTimeoutRef.current !== null) return;
    titlePressTimeoutRef.current = window.setTimeout(async () => {
      const enabled = await AdsManager.toggleDevAdsEnabled();
      setDevAdsEnabled(enabled);
      if (enabled) {
        toast.success('Test ads ON (dev build).');
        await AdsManager.showBanner();
      } else {
        toast.message('Ads disabled for this device (dev builds).');
        await AdsManager.hideBanner();
      setShowAdPlaceholder(false);
      }
    }, 700);
  };

  const handleTitlePressEnd = () => {
    if (titlePressTimeoutRef.current === null) return;
    window.clearTimeout(titlePressTimeoutRef.current);
    titlePressTimeoutRef.current = null;
  };

  // Debug: Test CalendarPlugin immediately on mount - use direct Capacitor call
  useEffect(() => {
    const testPlugin = async () => {
      const platform = Capacitor.getPlatform();
      const native = Capacitor.isNativePlatform();
      
      // Log directly to native console via a trick
      console.log('[WidgetSync] Platform:', platform, 'isNative:', native);
      
      // Get events from localStorage directly to avoid closure issues
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.countdowns);
      const storedEventsRaw = saved ? (JSON.parse(saved) as CountdownEvent[]) : [];
      const storedEvents = normalizeCountdownEvents(storedEventsRaw).filter(event => !event.deletedAt);
      
      // Get saved appearance mode and countdown style from localStorage
      const savedAppearanceMode = localStorage.getItem('widgetAppearanceMode') || 'light';
      const savedCountdownStyle = localStorage.getItem('widgetCountdownStyle') || 'focus';
      
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
            appearanceMode: savedAppearanceMode,
            countdownStyle: savedCountdownStyle,
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

  const selectedEvent = activeEvents.find(e => e.id === selectedEventId);

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
  
  // Calculate occurrence number for events (only for recurring events)
  const occurrenceNumber = selectedEvent
    ? (selectedEvent.isRecurring
        ? (countdown.isPast
            ? getRepetitionCount(new Date(selectedEvent.targetDate))
            : getNextOccurrenceNumber(new Date(selectedEvent.targetDate)))
        : undefined)
    : undefined;

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.countdowns, JSON.stringify(events));
    localStorage.setItem(LOCAL_STORAGE_KEYS.lastModified, localLastModified);
  }, [events, localLastModified]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.icloudEnabled, String(icloudEnabled));
  }, [icloudEnabled]);

  useEffect(() => {
    if (icloudLastSyncedAt) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.icloudLastSyncedAt, icloudLastSyncedAt);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.icloudLastSyncedAt);
    }
  }, [icloudLastSyncedAt]);

  const parseStoredEvents = (value: string | null): CountdownEvent[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as CountdownEvent[];
      return normalizeCountdownEvents(parsed);
    } catch (error) {
      console.warn('[iCloudSync] Failed to parse stored events:', error);
      return [];
    }
  };

  const mergeCountdownEvents = (
    localEvents: CountdownEvent[],
    remoteEvents: CountdownEvent[],
    localModified: string,
    remoteModified: string
  ): CountdownEvent[] => {
    const localMap = new Map(localEvents.map(event => [event.id, event]));
    const remoteMap = new Map(remoteEvents.map(event => [event.id, event]));
    const mergedMap = new Map<string, CountdownEvent>();

    const allIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);
    allIds.forEach(id => {
      const localEvent = localMap.get(id);
      const remoteEvent = remoteMap.get(id);
      if (!localEvent && remoteEvent) {
        mergedMap.set(id, remoteEvent);
        return;
      }
      if (localEvent && !remoteEvent) {
        mergedMap.set(id, localEvent);
        return;
      }
      if (localEvent && remoteEvent) {
        const localUpdated = localEvent.updatedAt || localEvent.createdAt;
        const remoteUpdated = remoteEvent.updatedAt || remoteEvent.createdAt;
        mergedMap.set(id, remoteUpdated > localUpdated ? remoteEvent : localEvent);
      }
    });

    const baseOrder = remoteModified > localModified ? remoteEvents : localEvents;
    const mergedOrder: CountdownEvent[] = [];
    const usedIds = new Set<string>();

    baseOrder.forEach(event => {
      const merged = mergedMap.get(event.id);
      if (merged && !usedIds.has(event.id)) {
        mergedOrder.push(merged);
        usedIds.add(event.id);
      }
    });

    const remaining = Array.from(mergedMap.values()).filter(event => !usedIds.has(event.id));
    remaining.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return [...mergedOrder, ...remaining];
  };

  const applyMergedEvents = async (mergedEvents: CountdownEvent[], mergedLastModified: string) => {
    const previousEvents = eventsRef.current;
    const prevMap = new Map(previousEvents.map(event => [event.id, event]));
    const nextMap = new Map(mergedEvents.map(event => [event.id, event]));

    try {
      const hasPermission = await checkNotificationPermission();
      if (hasPermission) {
        for (const [id, prevEvent] of prevMap.entries()) {
          const nextEvent = nextMap.get(id);
          if (!nextEvent) continue;
          if (prevEvent.deletedAt && !nextEvent.deletedAt) {
            continue;
          }
          if (!prevEvent.deletedAt && nextEvent.deletedAt) {
            await cancelEventNotification(id);
          }
        }

        for (const nextEvent of mergedEvents) {
          if (nextEvent.deletedAt) {
            continue;
          }
          const prevEvent = prevMap.get(nextEvent.id);
          if (!prevEvent || prevEvent.deletedAt) {
            const targetDateForNotification = nextEvent.isRecurring
              ? getNextRecurringDate(new Date(nextEvent.targetDate))
              : new Date(nextEvent.targetDate);
            if (targetDateForNotification) {
              await scheduleEventNotification(nextEvent.id, nextEvent.title, targetDateForNotification, nextEvent.emoji);
            }
            continue;
          }
          const shouldReschedule = prevEvent.targetDate !== nextEvent.targetDate ||
            prevEvent.title !== nextEvent.title ||
            prevEvent.emoji !== nextEvent.emoji ||
            prevEvent.isRecurring !== nextEvent.isRecurring;
          if (shouldReschedule) {
            await cancelEventNotification(nextEvent.id);
            const targetDateForNotification = nextEvent.isRecurring
              ? getNextRecurringDate(new Date(nextEvent.targetDate))
              : new Date(nextEvent.targetDate);
            if (targetDateForNotification) {
              await scheduleEventNotification(nextEvent.id, nextEvent.title, targetDateForNotification, nextEvent.emoji);
            }
          }
        }
      }
    } catch (error) {
      console.warn('[iCloudSync] Failed to reconcile notifications:', error);
    }

    isApplyingRemoteRef.current = true;
    setEvents(mergedEvents);
    setLocalLastModified(mergedLastModified);
    setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 0);
  };

  const pushCountdownsToICloud = async (eventsToPush: CountdownEvent[], lastModified: string) => {
    try {
      setIcloudStatus('syncing');
      await ICloudSyncPlugin.setString({
        key: ICLOUD_STORAGE_KEYS.countdowns,
        value: JSON.stringify(eventsToPush),
      });
      await ICloudSyncPlugin.setString({
        key: ICLOUD_STORAGE_KEYS.lastModified,
        value: lastModified,
      });
      lastPushedModifiedRef.current = lastModified;
      setIcloudLastSyncedAt(getIsoNow());
      setIcloudStatus('idle');
    } catch (error) {
      console.warn('[iCloudSync] Failed to push data:', error);
      setIcloudStatus('error');
    }
  };

  const pullAndMergeFromICloud = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIcloudStatus('syncing');

    try {
      const [blobResult, modifiedResult] = await Promise.all([
        ICloudSyncPlugin.getString({ key: ICLOUD_STORAGE_KEYS.countdowns }),
        ICloudSyncPlugin.getString({ key: ICLOUD_STORAGE_KEYS.lastModified }),
      ]);

      const remoteEvents = parseStoredEvents(blobResult.value);
      const remoteLastModified = modifiedResult.value || '';
      const localEvents = eventsRef.current;
      const localLastModified = localLastModifiedRef.current;

      if (!remoteEvents.length && !remoteLastModified) {
        if (localEvents.length > 0) {
          await pushCountdownsToICloud(localEvents, localLastModified);
        }
        setIcloudStatus('idle');
        isSyncingRef.current = false;
        return;
      }

      if (remoteLastModified && remoteLastModified === lastAppliedCloudModifiedRef.current) {
        setIcloudStatus('idle');
        isSyncingRef.current = false;
        return;
      }

      if (localEvents.length === 0 && remoteEvents.length > 0) {
        const mergedLastModified = remoteLastModified || getIsoNow();
        await applyMergedEvents(remoteEvents, mergedLastModified);
        lastAppliedCloudModifiedRef.current = remoteLastModified || null;
        setIcloudLastSyncedAt(getIsoNow());
        if (!remoteLastModified) {
          await pushCountdownsToICloud(remoteEvents, mergedLastModified);
        }
        setIcloudStatus('idle');
        isSyncingRef.current = false;
        return;
      }

      if (localEvents.length > 0 && remoteEvents.length > 0) {
        const merged = mergeCountdownEvents(localEvents, remoteEvents, localLastModified, remoteLastModified);
        const mergedLastModified = maxIsoTimestamp(localLastModified, remoteLastModified);
        await applyMergedEvents(merged, mergedLastModified || getIsoNow());
        lastAppliedCloudModifiedRef.current = remoteLastModified || null;
        setIcloudLastSyncedAt(getIsoNow());
        if (localLastModified > remoteLastModified) {
          await pushCountdownsToICloud(merged, mergedLastModified);
        }
        setIcloudStatus('idle');
        isSyncingRef.current = false;
        return;
      }

      if (remoteEvents.length > 0) {
        const mergedLastModified = remoteLastModified || getIsoNow();
        await applyMergedEvents(remoteEvents, mergedLastModified);
        lastAppliedCloudModifiedRef.current = remoteLastModified || null;
        setIcloudLastSyncedAt(getIsoNow());
        if (!remoteLastModified) {
          await pushCountdownsToICloud(remoteEvents, mergedLastModified);
        }
      }
      setIcloudStatus('idle');
    } catch (error) {
      console.warn('[iCloudSync] Failed to pull data:', error);
      setIcloudStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isNative) {
      setIcloudAvailable(false);
      setIcloudStatus('unavailable');
      return;
    }

    let cancelled = false;
    const checkAvailability = async () => {
      setIcloudStatus('checking');
      try {
        const result = await ICloudSyncPlugin.isAvailable();
        if (cancelled) return;
        setIcloudAvailable(result.available);
        setIcloudStatus(result.available ? 'idle' : 'unavailable');
        if (result.available && icloudEnabled) {
          await pullAndMergeFromICloud();
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('[iCloudSync] Availability check failed:', error);
        setIcloudAvailable(false);
        setIcloudStatus('error');
      }
    };

    checkAvailability();
    return () => {
      cancelled = true;
    };
  }, [isNative, icloudEnabled]);

  useEffect(() => {
    if (!icloudEnabled || !isNative || !icloudAvailable) return;
    let listener: { remove: () => Promise<void> } | null = null;

    const subscribe = async () => {
      listener = await ICloudSyncPlugin.addListener('kvStoreDidChange', (event) => {
        const keys = event.keys || [];
        if (!keys.includes(ICLOUD_STORAGE_KEYS.countdowns) && !keys.includes(ICLOUD_STORAGE_KEYS.lastModified)) {
          return;
        }
        void pullAndMergeFromICloud();
      });
    };

    void subscribe();

    return () => {
      if (listener) {
        void listener.remove();
      }
    };
  }, [icloudEnabled, isNative, icloudAvailable]);

  useEffect(() => {
    if (!icloudEnabled || !isNative || !icloudAvailable) return;
    if (isApplyingRemoteRef.current) return;
    if (lastPushedModifiedRef.current === localLastModified) return;
    if (iCloudPushTimeoutRef.current) {
      window.clearTimeout(iCloudPushTimeoutRef.current);
    }
    iCloudPushTimeoutRef.current = window.setTimeout(() => {
      void pushCountdownsToICloud(eventsRef.current, localLastModifiedRef.current);
    }, 800);
  }, [events, localLastModified, icloudEnabled, isNative, icloudAvailable]);

  // Persist appearance mode to localStorage
  useEffect(() => {
    localStorage.setItem('widgetAppearanceMode', selectedAppearanceMode);
  }, [selectedAppearanceMode]);

  // Persist countdown style to localStorage
  useEffect(() => {
    localStorage.setItem('widgetCountdownStyle', selectedCountdownStyle);
  }, [selectedCountdownStyle]);

  // Validate and adjust size when style changes or when size is invalid
  useEffect(() => {
    const availableSizes = getAvailableSizes(selectedCountdownStyle);
    const availableSizeIds = availableSizes.map(s => s.id);
    
    // If current size is not available, switch to the first available size
    if (!availableSizeIds.includes(selectedSize)) {
      if (availableSizeIds.length > 0) {
        setSelectedSize(availableSizeIds[0] as WidgetSize);
      }
    }
  }, [selectedCountdownStyle, selectedSize]);

  // Sync widget data to native storage whenever events or widget settings change
  useEffect(() => {
    const syncWidgetData = async () => {
      console.log('[WidgetSync] Starting sync, isNative:', isNative, 'events count:', activeEvents.length);
      
      if (!isNative) {
        console.log('[WidgetSync] Skipping - not native platform');
        return;
      }
      
      try {
        // Convert events to widget format
        const widgetEvents: WidgetCountdownEvent[] = activeEvents.map(event => ({
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
  }, [activeEvents, selectedAppearanceMode, selectedCountdownStyle, isNative]);

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
        const { value: confirmed } = await Dialog.confirm({
          title: t('dialogs.importEvent.title'),
          message: t('dialogs.importEvent.message', { 
            title: payload.title, 
            emoji: payload.emoji,
            date: dateFormatted 
          }),
          okButtonTitle: t('dialogs.importEvent.import'),
          cancelButtonTitle: t('dialogs.importEvent.cancel'),
        });

        if (confirmed) {
          // Create new event from imported payload
          const now = getIsoNow();
          const newEvent: CountdownEvent = {
            id: generateId(),
            title: payload.title,
            targetDate: payload.targetDate,
            emoji: payload.emoji,
            emojiColor: payload.emojiColor,
            isRecurring: payload.isRecurring,
            createdAt: now,
            updatedAt: now,
          };
          
          setEvents(prev => [...prev, newEvent]);
          setSelectedEventId(newEvent.id);
          setLocalLastModified(now);
          
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

  // Handle deep link edit event (when user taps widget to edit an event)
  useEffect(() => {
    const handleEditDeepLink = (event: Event) => {
      const customEvent = event as CustomEvent<EditEventDeepLinkDetail>;
      const { eventId } = customEvent.detail;
      
      console.log('[Index] Received edit deep link for event:', eventId);
      
      // Find the event by ID
      const eventToEdit = activeEvents.find(e => e.id === eventId);
      if (eventToEdit) {
        console.log('[Index] Found event, opening edit modal:', eventToEdit.title);
        // Select the event and open edit modal
        setSelectedEventId(eventId);
        setEditingEvent(eventToEdit);
        setIsModalOpen(true);
        trigger('medium');
      } else {
        console.warn('[Index] Event not found for ID:', eventId);
      }
    };

    window.addEventListener(EDIT_EVENT_DEEP_LINK, handleEditDeepLink);
    return () => {
      window.removeEventListener(EDIT_EVENT_DEEP_LINK, handleEditDeepLink);
    };
  }, [events, trigger]);

  // Show confirmation dialog when date has changed during edit
  const confirmDateChange = async (eventTitle: string, oldDate: Date, newDate: Date): Promise<boolean> => {
    // Format dates for display
    const oldDateFormatted = format(oldDate, 'MMM d, yyyy');
    const newDateFormatted = format(newDate, 'MMM d, yyyy');

    // Use Dialog for consistent wider dialog appearance
    const { value } = await Dialog.confirm({
      title: t('dialogs.dateChanged.title'),
      message: t('dialogs.dateChanged.message', { title: eventTitle, oldDate: oldDateFormatted, newDate: newDateFormatted }),
      okButtonTitle: t('dialogs.dateChanged.save'),
      cancelButtonTitle: t('dialogs.dateChanged.cancel'),
    });

    return value;
  };

  const handleSave = async (title: string, date: Date, emoji: string, isRecurring: boolean, emojiColor?: string) => {
    const saveKind = editingEvent ? 'edit' : 'create';

    // Request notification permission when creating or editing an event
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      await requestNotificationPermission();
    }

    if (editingEvent) {
      const now = getIsoNow();
      // Cancel old notification and schedule new one
      await cancelEventNotification(editingEvent.id);
      
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id 
          ? { ...e, title, targetDate: date.toISOString(), emoji, emojiColor, isRecurring, updatedAt: now, deletedAt: undefined }
          : e
      ));
      setLocalLastModified(now);
      
      // Schedule notification for the updated event
      const targetDateForNotification = isRecurring 
        ? getNextRecurringDate(date)
        : date;
      await scheduleEventNotification(editingEvent.id, title, targetDateForNotification, emoji);
    } else {
      const now = getIsoNow();
      const newEvent: CountdownEvent = {
        id: generateId(),
        title,
        targetDate: date.toISOString(),
        emoji,
        emojiColor,
        isRecurring,
        createdAt: now,
        updatedAt: now,
      };
      setEvents(prev => [...prev, newEvent]);
      setSelectedEventId(newEvent.id);
      setLocalLastModified(now);
      
      // Schedule notification for the new event
      const targetDateForNotification = isRecurring 
        ? getNextRecurringDate(date)
        : date;
      await scheduleEventNotification(newEvent.id, title, targetDateForNotification, emoji);
    }
    setEditingEvent(null);

    void AdsManager.maybeShowInterstitialAfterSave({ kind: saveKind });
  };

  const handleEdit = (event: CountdownEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = async (event: CountdownEvent): Promise<boolean> => {
    let confirmed = false;

    // Use Dialog for consistent wider dialog appearance
    const { value } = await Dialog.confirm({
      title: t('dialogs.deleteEvent.title'),
      message: t('dialogs.deleteEvent.message', { title: event.title }),
      okButtonTitle: t('dialogs.deleteEvent.delete'),
      cancelButtonTitle: t('dialogs.deleteEvent.cancel'),
    });
    confirmed = value;

    if (confirmed) {
      // Delete button was pressed
      trigger('heavy');
      const eventId = event.id;
      const wasSelected = selectedEventId === eventId;
      const now = getIsoNow();
      
      // Cancel the notification for this event
      await cancelEventNotification(eventId);
      
      setEvents(prev => {
        const updated = prev.map(e => 
          e.id === eventId ? { ...e, deletedAt: now, updatedAt: now } : e
        );
        const activeAfterDelete = updated.filter(e => !e.deletedAt);
        // Update selected event if the deleted event was selected
        if (wasSelected) {
          if (activeAfterDelete.length > 0) {
            setSelectedEventId(activeAfterDelete[0].id);
          } else {
            setSelectedEventId(null);
          }
        }
        return updated;
      });
      setLocalLastModified(now);

      void AdsManager.maybeShowInterstitialAfterSave({ kind: "delete" });

      return true;
    } else {
      // Cancel button was pressed
      trigger('light');
      return false; // Deletion cancelled
    }
  };

  const handleAddNew = async () => {
    console.log('handleAddNew called');
    trigger('medium');
    setEditingEvent(null);
    setIsModalOpen(true);
    // Note: Focus is now handled by onDidPresent + Capacitor Keyboard.show()
  };

  const handleFabClick = async () => {
    if (isModalOpen) {
      // Modal is open - trigger save
      datePickerModalRef.current?.save();
    } else {
      // Modal is closed - open it
      await handleAddNew();
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
    const now = getIsoNow();

    // Safety net: deduplicate imported events to prevent duplicates
    // This handles edge cases where duplicates might slip through the import modal
    const deduplicatedImports = deduplicateEvents(importedEvents);

    // Convert and add each event
    for (const importedEvent of deduplicatedImports) {
      const eventData = convertToCountdownEvent(importedEvent, generateId);
      const newEvent: CountdownEvent = {
        id: generateId(),
        ...eventData,
        createdAt: now,
        updatedAt: now,
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
    
    setLocalLastModified(now);
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
      const now = getIsoNow();
      setEvents((prev) => {
        const activeList = prev.filter(event => !event.deletedAt);
        const deletedList = prev.filter(event => event.deletedAt);
        const oldIndex = activeList.findIndex((e) => e.id === active.id);
        const newIndex = activeList.findIndex((e) => e.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
          return prev;
        }
        const reordered = arrayMove(activeList, oldIndex, newIndex);
        return [...reordered, ...deletedList];
      });
      setLocalLastModified(now);
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
        <IonHeader className="ion-no-border">
          <IonToolbar className="px-2 pt-4">
            <IonTitle size="large" className="ion-no-padding">
              <div
                className="header-brand-container"
                onPointerDown={handleTitlePressStart}
                onPointerUp={handleTitlePressEnd}
                onPointerLeave={handleTitlePressEnd}
                onPointerCancel={handleTitlePressEnd}
              >
                <div className="header-brand-line1">
                  YET ANOTHER
                  {isDevBuild && (
                    <span className="header-dev-badge">
                      DEV
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="header-brand-line2">COUNTDOWN</span>
                </div>
              </div>
            </IonTitle>
            <IonButtons slot="end" className="pr-2 pt-2">
              <IonButton 
                onClick={handleOpenCalendarImport} 
                aria-label={t('aria.importFromCalendar')}
                className="header-action-button"
              >
                <IonIcon icon={calendarOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        {/* Main content */}
        <div
          className="pb-12"
          style={{ paddingBottom: 'calc(3rem + var(--ad-banner-height, 0px))' }}
        >
          {activeEvents.length === 0 ? (
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
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
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
                    items={activeEvents.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2" style={{ backgroundColor: 'hsl(var(--background))', overflow: 'visible' }}>
                      {activeEvents.map(event => (
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
                      const activeEvent = activeEvents.find(e => e.id === activeDragId);
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

              {isNative && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                    {t('icloud.title')}
                  </h2>
                  <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-ios-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('icloud.toggle')}</p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            if (!icloudEnabled) return t('icloud.statusDisabled');
                            if (icloudStatus === 'checking') return t('icloud.statusChecking');
                            if (icloudStatus === 'syncing') return t('icloud.statusSyncing');
                            if (icloudStatus === 'error') return t('icloud.statusError');
                            if (icloudAvailable === false) return t('icloud.statusUnavailable');
                            if (icloudLastSyncedAt) {
                              return t('icloud.statusLastSynced', {
                                date: format(new Date(icloudLastSyncedAt), 'MMM d, h:mm a'),
                              });
                            }
                            return t('icloud.statusReady');
                          })()}
                        </p>
                      </div>
                      <IonToggle
                        checked={icloudEnabled}
                        onIonChange={(e) => setIcloudEnabled(Boolean(e.detail.checked))}
                        aria-label={t('icloud.toggleAria')}
                        disabled={icloudStatus === 'checking' || icloudAvailable === false}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Widget preview section - only show on web, not native apps */}
              {selectedEvent && !isNative && (
                <>
                  {/* Size selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                      {t('widget.size')}
                    </h2>
                    <IonSegment
                      value={selectedSize}
                      onIonChange={(e) => {
                        trigger('selection');
                        const newSize = e.detail.value as WidgetSize;
                        const availableSizes = getAvailableSizes(selectedCountdownStyle);
                        const availableSizeIds = availableSizes.map(s => s.id);
                        
                        // Only allow selecting available sizes
                        if (availableSizeIds.includes(newSize)) {
                          setSelectedSize(newSize);
                        }
                      }}
                    >
                      {getAvailableSizes(selectedCountdownStyle).map((size) => (
                        <IonSegmentButton key={size.id} value={size.id}>
                          {t(size.labelKey)}
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
                  </section>

                  {/* Countdown style selector */}
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                      {t('widget.style')}
                    </h2>
                    <IonSegment
                      value={selectedCountdownStyle}
                      onIonChange={(e) => {
                        trigger('selection');
                        const newStyle = e.detail.value as WidgetCountdownStyle;
                        setSelectedCountdownStyle(newStyle);
                        
                        // If switching to classic style and current size is large, switch to medium
                        if (newStyle === 'classic' && selectedSize === 'large') {
                          setSelectedSize('medium');
                        }
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
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
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
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
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

                  {/* Triple widget preview */}
                  {selectedSize === 'large' && activeEvents.length > 0 && (
                    <section className="space-y-3">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                        Triple Countdown Preview
                      </h2>
                      <div className="flex justify-center py-4">
                        <div className="animate-scale-in">
                          <TripleWidgetPreview
                            events={activeEvents.slice(0, 3)}
                            appearanceMode={selectedAppearanceMode}
                            countdownStyle={selectedCountdownStyle}
                            getNextRecurringDate={getNextRecurringDate}
                            getNextOccurrenceNumber={getNextOccurrenceNumber}
                          />
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </IonContent>

      {typeof document !== 'undefined' && !isCalendarImportOpen ? createPortal(fabPortal, document.body) : null}

      {/* Ad Integration Bar - Background for the ad area (only show when loading/placeholder is active) */}
      {showAdPlaceholder && (
        <div 
          className="ad-container-bar"
          style={{ 
            height: `calc(${placeholderHeight}px + env(safe-area-inset-bottom))`
          }}
        >
          <div className="ad-placeholder ad-placeholder-shimmer">
            <span className="mr-2 opacity-50 border border-muted-foreground/30 px-1 rounded-[3px] text-[8px] leading-tight">AD</span>
            {!isNative ? t('ads.webPlaceholder') : t('ads.loading')}
          </div>
        </div>
      )}

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

