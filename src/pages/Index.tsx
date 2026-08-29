import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSegment, IonSegmentButton, IonFabButton, IonButton, IonButtons } from '@ionic/react';
import { add, checkmark, calendarOutline } from 'ionicons/icons';
import { NoAdsIcon } from '@/components/icons/NoAdsIcon';
import { format } from 'date-fns';
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
import { MorphingFab, MorphingFabHandle } from '@/components/MorphingFab';
import { CountdownPill } from '@/components/CountdownPill';
import { useLegacyTimeFormat } from '@/lib/useLegacyTimeFormat';
import { DatePickerModal, DatePickerModalRef } from '@/components/DatePickerModal';
import { SortableCountdownCard } from '@/components/SortableCountdownCard';
import { CountdownCard } from '@/components/CountdownCard';
import { useCountdown } from '@/hooks/useCountdown';
import { TripleLargeWidget } from '@/components/widgets/TripleLargeWidget';
import { useHaptic } from '@/hooks/useHaptic';
import { useIsMobile } from '@/hooks/use-mobile';
import { CountdownEvent, WidgetSize, WidgetAppearanceMode, WidgetCountdownStyle, resolveLegacy } from '@/types/countdown';
import { EmojiShape } from '@/lib/emojiShapes';
import { getNextRecurringDate, getNextOccurrenceNumber, getRepetitionCount } from '@/lib/recurring';
import { checkNotificationPermission, requestNotificationPermission, scheduleEventNotification, cancelEventNotification, checkScheduledNotifications } from '@/lib/notifications';
import { EventImportPayload } from '@/lib/eventImportLink';
import { CalendarImportModal, CalendarImportModalRef } from '@/components/CalendarImportModal';
import { RemoveAdsModal } from '@/components/RemoveAdsModal';
import { TrackingConsentModal } from '@/components/TrackingConsentModal';
import { WidgetOnboardingModal } from '@/components/WidgetOnboardingModal';
import { FirstRunOnboardingModal } from '@/components/FirstRunOnboardingModal';
import { ImportableEvent, convertToCountdownEvent, deduplicateEvents } from '@/lib/calendarImport';
import { App as CapacitorApp } from '@capacitor/app';
import CalendarPlugin, { WidgetCountdownEvent } from '@/plugins/CalendarPlugin';
import CountdownSyncPlugin from '@/plugins/CountdownSyncPlugin';
import { SharedSelection } from '@/lib/sharedSelection';
import { EDIT_EVENT_DEEP_LINK, EditEventDeepLinkDetail } from '@/components/DeepLinkHandler';
import { IMPORT_EVENT_READY } from '@/pages/Import';
import { AdsManager } from '@/lib/ads/adsManager';
import { PurchasesManager } from '@/lib/purchases/purchasesManager';
import { createCountdownEvent, hasEventChanged, removeCountdownEvent, updateCountdownEvent } from '@/lib/countdownEvents';
import { rememberDeleted, SlotLabels, takeRecoverRequests } from '@/lib/recentlyDeleted';
import BuildInfo from '@/plugins/BuildInfoPlugin';

const WIDGET_SIZES: { id: WidgetSize; labelKey: string }[] = [
  { id: 'small', labelKey: 'widget.sizes.small' },
  { id: 'medium', labelKey: 'widget.sizes.medium' },
];

// Large was removed because iOS widgets cannot render seconds live without
// sacrificing either layout or correctness (see CountdownWidget.swift).
const getAvailableSizes = (_countdownStyle: WidgetCountdownStyle): { id: WidgetSize; labelKey: string }[] => {
  return WIDGET_SIZES;
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

const generateId = () => Math.random().toString(36).substr(2, 9);

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
  const { t, i18n } = useTranslation();
  const [isHomeScrolled, setIsHomeScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('medium');
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
  const [draggedCardWidth, setDraggedCardWidth] = useState<number | null>(null);
  const lastDragEndTs = useRef<number>(0);
  const previousDragYRef = useRef<number | null>(null);
  const previousDragXRef = useRef<number | null>(null);
  // Where along the card's width the drag was started, -1 (left edge) to
  // +1 (right edge). The lifted card pivots around that point, so grabbing the
  // right side tilts the opposite way to grabbing the left.
  const dragGrabOffsetRef = useRef<number>(-1);
  const targetDragRotationRef = useRef<number>(0);
  const displayedDragRotationRef = useRef<number>(0);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const dragOverlayRef = useRef<HTMLDivElement>(null);
  const titlePressTimeoutRef = useRef<number | null>(null);
  const titlePressStartRef = useRef<number>(0);
  const titleTapCountRef = useRef<number>(0);
  const titleLastTapRef = useRef<number>(0);
  const fabRef = useRef<MorphingFabHandle>(null);
  // Live draft reported by the edit sheet, so the countdown pill previews
  // unsaved changes (date, specific time, days-only override).
  const [draft, setDraft] = useState<{ date: Date; hasTime: boolean; invertTimeFormat: boolean; isRecurring: boolean } | null>(null);
  const legacyTimeFormat = useLegacyTimeFormat();
  const hasSyncedFromAppGroupRef = useRef(false);
  const lastSyncedWidgetPayloadRef = useRef<string | null>(null);
  const hasPulledFromICloudRef = useRef(false);
  // True once the first iCloud pull has completed. Until then we must NOT push
  // an empty list — a fresh/empty device would otherwise stamp [] as the newest
  // value and clobber another device's data (last-write-wins by timestamp).
  const initialPullDoneRef = useRef(false);
  // Serialized events last reconciled with iCloud — set after both a push and
  // a pull so the push effect can skip no-op writes and break the ping-pong
  // loop where two devices keep re-pushing the same merged list.
  const lastSyncedICloudJsonRef = useRef<string | null>(null);
  // When set, the next persist of `events` keeps this timestamp instead of
  // stamping now() — used when a change came from a sync merge (App Group or
  // iCloud) so a device that merely *received* data doesn't mark itself as the
  // newest writer and wrongly win later last-write-wins conflicts.
  const syncAppliedTsRef = useRef<string | null>(null);
  // Deletion tombstones (id -> ISO time the countdown was deleted). Synced in
  // the iCloud blob so a delete on one device removes the countdown on the
  // others — the per-id union merge alone would re-add it from whichever device
  // still has it. Loaded once from localStorage.
  const deletedRef = useRef<Record<string, string>>((() => {
    try {
      const saved = localStorage.getItem('countdownsDeleted');
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  })());
  const { trigger } = useHaptic();
  const isNative = Capacitor.isNativePlatform();
  const isMobile = useIsMobile();
  const [isDevBuild, setIsDevBuild] = useState(import.meta.env.MODE !== 'production');
  const [devAdsEnabled, setDevAdsEnabled] = useState(false);
  const [showAdPlaceholder, setShowAdPlaceholder] = useState(false);
  const placeholderHeight = 60; // Increased to match adaptive banners better
  const [hasRemoveAds, setHasRemoveAds] = useState(false);
  const [isTrackingConsentOpen, setIsTrackingConsentOpen] = useState(false);
  const [isWidgetOnboardingOpen, setIsWidgetOnboardingOpen] = useState(false);

  // Opens the flow on its confirmation screen rather than at the pitch.
  const [widgetConfirmOnOpen, setWidgetConfirmOnOpen] = useState(false);

  const [isFirstRunOpen, setIsFirstRunOpen] = useState(false);
  const firstRunDecidedRef = useRef(false);

  // Did the widget actually land? It gets added outside the app, and the user
  // may well have quit us entirely while doing it — so the check lives here,
  // not in the modal, and runs on launch as well as on every foreground.
  // Fires the confirmation once.
  useEffect(() => {
    if (!isNative) return;

    const check = async () => {
      // Dev ignores both flags: the auto-open above never sets `widgetTipShown`,
      // and re-running the confirmation is the whole point while working on it.
      if (!isDevBuild) {
        if (localStorage.getItem('widgetConfirmed')) return;
        if (!localStorage.getItem('widgetTipShown')) return;
      }
      const { count } = await CalendarPlugin.getInstalledWidgets();
      if (count === 0) return;
      localStorage.setItem('widgetConfirmed', '1');
      setWidgetConfirmOnOpen(true);
      setIsWidgetOnboardingOpen(true);
    };

    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void check();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [isNative, isDevBuild]);
  const trackingPrePromptShownRef = useRef(false);
  const [isRemoveAdsOpen, setIsRemoveAdsOpen] = useState(false);
  const pendingDeleteRef = useRef<Map<string, CountdownEvent>>(new Map());
  const [isDragDisabledByDeleteButton, setIsDragDisabledByDeleteButton] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  // Cards being restored (undo, or recovered from the iOS Settings app) —
  // they grow back in instead of popping into the list fully formed.
  const [restoringIds, setRestoringIds] = useState<string[]>([]);
  const [importPrefillData, setImportPrefillData] = useState<EventImportPayload | null>(null);
  const [canSaveForm, setCanSaveForm] = useState(false);
  const [canImportCalendar, setCanImportCalendar] = useState(false);
  const datePickerModalRef = useRef<DatePickerModalRef>(null);
  const calendarImportModalRef = useRef<CalendarImportModalRef>(null);

  // Helper function to check if an element is within ion-item-option
  const isWithinDeleteOption = (element: Element | null): boolean => {
    if (!element) return false;
    return Boolean(element.closest('ion-item-option'));
  };

  // Helper function to check if a card is swiped open and close it
  const closeSwipedCardIfOpen = async (cardElement: Element | null): Promise<boolean> => {
    if (!cardElement) return false;
    
    const slidingItem = cardElement.closest('[data-sortable-id]')?.querySelector('ion-item-sliding') as HTMLIonItemSlidingElement | null;
    if (!slidingItem) return false;
    
    try {
      const openAmount = await slidingItem.getOpenAmount();
      if (Math.abs(openAmount) > 2) {
        await slidingItem.close();
        return true;
      }
    } catch {
      // Ignore errors if element is unmounted
    }
    
    return false;
  };

  // Track pointer/touch events to detect if drag starts from delete option area
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const cardElement = (e.target as Element | null)?.closest('[data-sortable-id]') as HTMLElement | null;
      
      // Check if pointer is on delete button and disable drag if so
      const isOnDeleteButton = isWithinDeleteOption(e.target as Element);
      setIsDragDisabledByDeleteButton(isOnDeleteButton);
      
      if (cardElement && !isOnDeleteButton) {
        closeSwipedCardIfOpen(cardElement);
      }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const cardElement = target?.closest('[data-sortable-id]') as HTMLElement | null;
        
        // Check if touch is on delete button and disable drag if so
        const isOnDeleteButton = isWithinDeleteOption(target);
        setIsDragDisabledByDeleteButton(isOnDeleteButton);
        
        if (cardElement && !isOnDeleteButton) {
          closeSwipedCardIfOpen(cardElement);
        }
      }
    };

    const handlePointerUp = () => {
      setIsDragDisabledByDeleteButton(false);
    };
    
    const handleTouchEnd = () => {
      setIsDragDisabledByDeleteButton(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('touchstart', handleTouchStart, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('pointercancel', handlePointerUp, true);
    document.addEventListener('touchend', handleTouchEnd, true);
    document.addEventListener('touchcancel', handleTouchEnd, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('pointercancel', handlePointerUp, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
      document.removeEventListener('touchcancel', handleTouchEnd, true);
    };
  }, []);


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
  // On touch devices, avoid PointerSensor to preserve native scroll.
  const sensors = useSensors(...(isMobile ? [touchSensor] : [pointerSensor, touchSensor]));
  
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

  const parseTimestamp = (value?: string | null) => {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const mergeEventLists = (
    primaryEvents: CountdownEvent[],
    secondaryEvents: CountdownEvent[]
  ): CountdownEvent[] => {
    const secondaryById = new Map(secondaryEvents.map(event => [event.id, event]));
    const merged: CountdownEvent[] = [];

    primaryEvents.forEach(primaryEvent => {
      const secondaryEvent = secondaryById.get(primaryEvent.id);
      if (secondaryEvent) {
        merged.push({
          ...secondaryEvent,
          ...primaryEvent,
          isImported: primaryEvent.isImported ?? secondaryEvent.isImported,
          importedFrom: primaryEvent.importedFrom ?? secondaryEvent.importedFrom,
        });
      } else {
        merged.push(primaryEvent);
      }
    });

    secondaryEvents.forEach(secondaryEvent => {
      if (!merged.some(event => event.id === secondaryEvent.id)) {
        merged.push(secondaryEvent);
      }
    });

    return merged;
  };

  // A content fingerprint of the list that's independent of object key order.
  // mergeEventLists spreads objects, so two semantically-identical lists can
  // serialize to different bytes; comparing fingerprints (array order kept,
  // each object's keys sorted) keeps the echo-suppression guard from treating
  // a re-ordered-but-equal merge as a change and ping-ponging pushes.
  const eventsFingerprint = (list: CountdownEvent[]): string =>
    JSON.stringify(
      list.map(event => {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(event).sort()) {
          sorted[key] = (event as Record<string, unknown>)[key];
        }
        return sorted;
      })
    );

  type DeletedMap = Record<string, string>;

  // The iCloud blob is an envelope { events, deleted }. Older builds stored a
  // bare array, so accept both shapes when parsing.
  const parseCloudBlob = (raw: string): { events: CountdownEvent[]; deleted: DeletedMap } => {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { events: parsed, deleted: {} };
    const events = Array.isArray(parsed?.events) ? parsed.events : [];
    const deleted = parsed?.deleted && typeof parsed.deleted === 'object' ? parsed.deleted : {};
    return { events, deleted };
  };

  const serializeCloudBlob = (list: CountdownEvent[], deleted: DeletedMap): string =>
    JSON.stringify({ events: list, deleted });

  // Drop tombstones older than 60 days so the blob can't grow without bound.
  const pruneTombstones = (deleted: DeletedMap): DeletedMap => {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const out: DeletedMap = {};
    for (const [id, ts] of Object.entries(deleted)) {
      if (parseTimestamp(ts) >= cutoff) out[id] = ts;
    }
    return out;
  };

  // Union two tombstone maps, keeping the latest deletion time per id.
  const mergeTombstones = (a: DeletedMap, b: DeletedMap): DeletedMap => {
    const out: DeletedMap = { ...a };
    for (const [id, ts] of Object.entries(b)) {
      if (!out[id] || parseTimestamp(ts) > parseTimestamp(out[id])) out[id] = ts;
    }
    return pruneTombstones(out);
  };

  // Remove any event whose id has a tombstone. Purely id-based on purpose: do
  // NOT compare against event.createdAt, because createdAt is stamped by the
  // device that created the countdown while the tombstone is stamped by the
  // device that deleted it — two different clocks. Even small skew would make a
  // createdAt-vs-tombstone comparison drop the deletion. Re-creation always uses
  // a fresh id (generateId), and undo explicitly clears the tombstone, so an id
  // can never legitimately come back while tombstoned.
  const applyTombstones = (list: CountdownEvent[], deleted: DeletedMap): CountdownEvent[] =>
    list.filter(event => !deleted[event.id]);

  // Fingerprint of the full cloud envelope (events + tombstones), order-stable,
  // so the push effect pushes whenever either changes and skips no-op writes.
  const cloudFingerprint = (list: CountdownEvent[], deleted: DeletedMap): string => {
    const sortedDeleted: DeletedMap = {};
    for (const id of Object.keys(deleted).sort()) sortedDeleted[id] = deleted[id];
    return `${eventsFingerprint(list)}|${JSON.stringify(sortedDeleted)}`;
  };

  const persistTombstones = (map: DeletedMap) => {
    deletedRef.current = map;
    localStorage.setItem('countdownsDeleted', JSON.stringify(map));
  };

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!isNative || hasSyncedFromAppGroupRef.current) return;
    hasSyncedFromAppGroupRef.current = true;

    const syncFromAppGroup = async () => {
      const localEvents: CountdownEvent[] = (() => {
        const saved = localStorage.getItem('countdowns');
        return saved ? JSON.parse(saved) : [];
      })();
      const localUpdated = localStorage.getItem('countdownsLastUpdated');

      try {
        const { widgetData } = await CalendarPlugin.getWidgetData();
        if (!widgetData || !Array.isArray(widgetData.events)) {
          return;
        }

        const appGroupEvents = widgetData.events;
        const appGroupUpdated = widgetData.lastUpdated;
        const appGroupIsNewer = parseTimestamp(appGroupUpdated) > parseTimestamp(localUpdated);
        const preferAppGroup = appGroupIsNewer || (localEvents.length === 0 && appGroupEvents.length > 0);

        const mergedEvents = applyTombstones(
          preferAppGroup
            ? mergeEventLists(appGroupEvents, localEvents)
            : mergeEventLists(localEvents, appGroupEvents),
          // The widget App Group carries no tombstones, so a countdown deleted
          // via iCloud would otherwise be re-added here from stale widget data.
          deletedRef.current
        );

        // This is received/merged data, not a fresh local edit — keep the newer
        // of the two real edit times so the persist effect doesn't re-stamp now().
        syncAppliedTsRef.current = appGroupIsNewer ? appGroupUpdated : (localUpdated ?? appGroupUpdated);
        setEvents(mergedEvents);

        if (preferAppGroup) {
          const appearanceMatches = WIDGET_APPEARANCE_MODES.some(mode => mode.id === widgetData.appearanceMode);
          const styleMatches = WIDGET_COUNTDOWN_STYLES.some(style => style.id === widgetData.countdownStyle);
          if (appearanceMatches) {
            setSelectedAppearanceMode(widgetData.appearanceMode as WidgetAppearanceMode);
          }
          if (styleMatches) {
            setSelectedCountdownStyle(widgetData.countdownStyle as WidgetCountdownStyle);
          }
        }
      } catch (error) {
        console.warn('[WidgetSync] Failed to read App Group data:', error);
      }
    };

    syncFromAppGroup();
  }, [isNative]);

  // iCloud key-value sync: reconcile the local list with a remote blob from
  // another Apple device. Per-id last-write-wins via mergeEventLists (the
  // newer side becomes "primary" and wins on id conflicts; both sets are
  // unioned so a countdown added offline on either device survives).
  useEffect(() => {
    if (!isNative) return;

    const reconcileWithRemote = (remoteJson: string | null, remoteUpdated: string | null) => {
      if (!remoteJson) return;
      let remoteEvents: CountdownEvent[];
      let remoteDeleted: DeletedMap;
      try {
        ({ events: remoteEvents, deleted: remoteDeleted } = parseCloudBlob(remoteJson));
      } catch {
        return;
      }

      // Track what the cloud currently holds (NOT the local merge result) so the
      // push effect still fires when this device has events/tombstones the cloud
      // is missing. Setting it to the merged-local fingerprint would wrongly
      // suppress the upload of a just-created countdown.
      lastSyncedICloudJsonRef.current = cloudFingerprint(remoteEvents, remoteDeleted);

      const localUpdated = localStorage.getItem('countdownsLastUpdated');
      const remoteIsNewer = parseTimestamp(remoteUpdated) > parseTimestamp(localUpdated);

      const mergedDeleted = mergeTombstones(deletedRef.current, remoteDeleted);

      setEvents(localEvents => {
        const preferRemote = remoteIsNewer || (localEvents.length === 0 && remoteEvents.length > 0);
        const unioned = preferRemote
          ? mergeEventLists(remoteEvents, localEvents)
          : mergeEventLists(localEvents, remoteEvents);
        const merged = applyTombstones(unioned, mergedDeleted);

        const tombstonesChanged =
          JSON.stringify(mergedDeleted) !== JSON.stringify(deletedRef.current);
        if (tombstonesChanged) persistTombstones(mergedDeleted);

        if (eventsFingerprint(merged) === eventsFingerprint(localEvents)) {
          return localEvents; // No event change — avoid a needless timestamp bump.
        }
        // Received/merged data — keep the newer real edit time so the persist
        // effect doesn't re-stamp now() and make this device wrongly "newest".
        syncAppliedTsRef.current = remoteIsNewer ? (remoteUpdated ?? localUpdated) : (localUpdated ?? remoteUpdated);
        return merged;
      });
    };

    const pullAndReconcile = async () => {
      const { json, updatedAt } = await CountdownSyncPlugin.pullCountdowns();
      reconcileWithRemote(json, updatedAt);
    };

    let removeListener: (() => Promise<void>) | undefined;

    const initICloudSync = async () => {
      try {
        // NOTE: do NOT gate on isAvailable()/ubiquityIdentityToken — that
        // reflects iCloud Drive, not KVS, and is often nil for a KVS-only app
        // even when signed in. KVS works regardless; if not signed into iCloud
        // these calls simply no-op locally.
        const listener = await CountdownSyncPlugin.addListener('countdownsChanged', ({ json, updatedAt }) => {
          reconcileWithRemote(json, updatedAt || null);
        });
        removeListener = listener.remove;

        if (!hasPulledFromICloudRef.current) {
          hasPulledFromICloudRef.current = true;
          await pullAndReconcile();
          // Only now is it safe for the push effect to write (incl. empty lists).
          initialPullDoneRef.current = true;
        }
      } catch (error) {
        console.warn('[iCloudSync] Failed to initialize iCloud sync:', error);
        initialPullDoneRef.current = true; // don't wedge pushes if init failed
      }
    };

    initICloudSync();

    // Re-pull whenever the app returns to the foreground — a device that was
    // already open then picks up changes another device uploaded. (KVS tends to
    // flush its own pending upload on backgrounding, so this also helps the
    // sender propagate.)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pullAndReconcile();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      void removeListener?.();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isNative]);

  // Dev builds always show one of the onboarding flows on launch so they can be
  // worked on without wiping storage to re-arm the one-shot flags. Never in
  // Release. With nothing on the list the first-run flow wins, otherwise the
  // widget one — which is also the order a real user meets them in.
  useEffect(() => {
    if (!isDevBuild) return;
    if (events.length === 0) setIsFirstRunOpen(true);
    else setIsWidgetOnboardingOpen(true);
    // Launch-only: re-running this on every add or delete would hijack the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDevBuild]);

  // Nothing on the list on a first launch: offer to build one together rather
  // than leaving them on an empty screen. Decided once ever, so someone who
  // already has countdowns is never asked.
  useEffect(() => {
    if (isDevBuild || firstRunDecidedRef.current) return;

    const settle = (open: boolean) => {
      firstRunDecidedRef.current = true;
      localStorage.setItem('firstRunShown', '1');
      if (open) setIsFirstRunOpen(true);
    };

    if (localStorage.getItem('firstRunShown')) {
      firstRunDecidedRef.current = true;
      return;
    }
    if (events.length > 0) return settle(false);

    // Give the iCloud pull a beat: someone restoring on a new device starts
    // with an empty list and should not be onboarded again.
    const timer = window.setTimeout(() => settle(true), 1500);
    return () => window.clearTimeout(timer);
  }, [isDevBuild, events.length]);

  useEffect(() => {
    if (!isNative) return;
    const shouldHideAds = hasRemoveAds || isModalOpen || isCalendarImportOpen || isTrackingConsentOpen;
    void AdsManager.setBannerSuppressed(shouldHideAds);
    if (hasRemoveAds) {
      void AdsManager.hideBanner();
      return;
    }
    if (shouldHideAds) {
      void AdsManager.hideBanner();
    } else {
      void AdsManager.showBanner();
    }
    return () => {
      void AdsManager.setBannerSuppressed(true);
      void AdsManager.hideBanner();
    };
  }, [isNative, isModalOpen, isCalendarImportOpen, isTrackingConsentOpen, hasRemoveAds]);

  // After the user creates their first event, show the custom tracking
  // pre-prompt (once per session) — but only on native, only for non ad-free
  // users, and only while ATT is still unanswered. Confirming it fires the OS
  // ATT sheet + Google UMP consent form.
  useEffect(() => {
    if (!isNative || hasRemoveAds || events.length === 0) return;
    if (trackingPrePromptShownRef.current) return;
    let cancelled = false;
    void AdsManager.shouldShowTrackingPrePrompt().then((show) => {
      if (cancelled || !show || trackingPrePromptShownRef.current) return;
      trackingPrePromptShownRef.current = true;
      setIsTrackingConsentOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isNative, hasRemoveAds, events.length]);

  useEffect(() => {
    const unsubscribe = PurchasesManager.onEntitlementChange(setHasRemoveAds);
    return () => {
      unsubscribe?.();
    };
  }, []);

  // Mirror the "remove ads" entitlement across the user's Apple devices via
  // iCloud. StoreKit stays authoritative (we only push true once it validates
  // the purchase); the mirror lets a device where StoreKit can't reach the App
  // Store — e.g. an iPhone app running on Mac — still go ad-free.
  useEffect(() => {
    if (!isNative) return;

    let removeListener: (() => Promise<void>) | undefined;

    const initRemoveAdsSync = async () => {
      try {
        const { value } = await CountdownSyncPlugin.getRemoveAds();
        if (value) await PurchasesManager.applyRemoteEntitlement(true);

        const listener = await CountdownSyncPlugin.addListener('removeAdsChanged', ({ value }) => {
          if (value) void PurchasesManager.applyRemoteEntitlement(true);
        });
        removeListener = listener.remove;
      } catch (error) {
        console.warn('[iCloudSync] remove-ads mirror init failed:', error);
      }
    };
    initRemoveAdsSync();

    // When StoreKit validates the purchase on this device, broadcast it.
    const unsub = PurchasesManager.onEntitlementChange((owned) => {
      if (owned) void CountdownSyncPlugin.setRemoveAds();
    });

    return () => {
      void removeListener?.();
      unsub?.();
    };
  }, [isNative]);

  useEffect(() => {
    const loadBuildInfo = async () => {
      try {
        if (isNative) {
          const info = await BuildInfo.getBuildType();
          const isDebug = info.buildType === 'debug';
          setIsDevBuild(isDebug);
          AdsManager.setDevBuild(isDebug);
          PurchasesManager.setDevBuild(isDebug);
        } else {
          setIsDevBuild(import.meta.env.MODE !== 'production');
          AdsManager.setDevBuild(import.meta.env.MODE !== 'production');
          PurchasesManager.setDevBuild(import.meta.env.MODE !== 'production');
        }
        await PurchasesManager.init();
      } catch (error) {
        console.warn('[BuildInfo] Failed to read build type', error);
        await PurchasesManager.init();
      }
    };
    loadBuildInfo();
  }, [isNative]);

  useEffect(() => {
    // On web, always show placeholder (ads don't load on web)
    if (!isNative) {
      setShowAdPlaceholder(!hasRemoveAds && !isTrackingConsentOpen);
      return;
    }

    if (isTrackingConsentOpen) {
      setShowAdPlaceholder(false);
      return;
    }

    // On native, handle ad state
    const loadAdsState = async () => {
      const enabled = isDevBuild ? await AdsManager.getDevAdsEnabled() : true;
      const adsAllowed = enabled && !hasRemoveAds;
      setDevAdsEnabled(enabled);
      setShowAdPlaceholder(adsAllowed && AdsManager.getBannerStatus() !== 'visible');
    };

    loadAdsState();
    const unsubscribe = AdsManager.onBannerStatusChange((status) => {
      const enabled = isDevBuild ? devAdsEnabled : true;
      const adsAllowed = enabled && !hasRemoveAds;
      setShowAdPlaceholder(adsAllowed && status === 'hidden'); // Only show placeholder while hidden/loading
    });

    return () => {
      unsubscribe?.();
    };
  }, [isNative, isDevBuild, devAdsEnabled, hasRemoveAds, isTrackingConsentOpen]);

  useEffect(() => {
    if (!isDevBuild) return;
    if (!devAdsEnabled || hasRemoveAds) {
      setShowAdPlaceholder(false);
      if (typeof document !== 'undefined') {
        delete document.documentElement.dataset.adPlaceholder;
        document.documentElement.style.setProperty('--ad-banner-height', '0px');
      }
      if (isNative) {
        void AdsManager.hideBanner();
      }
    }
  }, [isDevBuild, devAdsEnabled, isNative, hasRemoveAds]);

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
    titlePressStartRef.current = Date.now();
    if (!isDevBuild || titlePressTimeoutRef.current !== null) return;
    titlePressTimeoutRef.current = window.setTimeout(async () => {
      const nextValue = !hasRemoveAds;
      await PurchasesManager.setDevEntitlement(
        nextValue,
        "com.jonatanbjerrekaer.countdown.remove_ads_supporter",
      );
      setHasRemoveAds(nextValue);
      if (nextValue) {
        fabRef.current?.confirm('Ad-free enabled (dev build)');
        await AdsManager.hideBanner();
        setShowAdPlaceholder(false);
      } else {
        fabRef.current?.confirm('Ad-free disabled (dev build)');
        await AdsManager.setDevAdsEnabled(true);
        trackingPrePromptShownRef.current = false;
        await AdsManager.resetConsent();
        setIsTrackingConsentOpen(true);
      }
    }, 700);
  };

  const handleTitlePressEnd = () => {
    if (titlePressTimeoutRef.current !== null) {
      window.clearTimeout(titlePressTimeoutRef.current);
      titlePressTimeoutRef.current = null;
    }

    // Easter egg: 7 quick taps within 1.5s of each other.
    const now = Date.now();
    const pressDuration = now - titlePressStartRef.current;
    if (pressDuration > 220) {
      titleTapCountRef.current = 0;
      return;
    }
    if (now - titleLastTapRef.current > 1500) {
      titleTapCountRef.current = 0;
    }
    titleLastTapRef.current = now;
    titleTapCountRef.current += 1;
    if (titleTapCountRef.current >= 7) {
      titleTapCountRef.current = 0;
      const messages = t('easterEgg.messages', { returnObjects: true }) as string[];
      if (Array.isArray(messages) && messages.length > 0) {
        const stored = parseInt(localStorage.getItem('easterEggIndex') || '0', 10);
        const idx = Number.isFinite(stored) ? Math.max(0, stored) % messages.length : 0;
        localStorage.setItem('easterEggIndex', String((idx + 1) % messages.length));
        trigger('medium');
        fabRef.current?.confirm(messages[idx], { holdMs: 2200 });
      }
    }
  };

  // Debug: Test CalendarPlugin immediately on mount - use direct Capacitor call
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
  
  // Calculate occurrence number for events (only for recurring events)
  const occurrenceNumber = selectedEvent
    ? (selectedEvent.isRecurring
        ? (countdown.isPast
            ? getRepetitionCount(new Date(selectedEvent.targetDate))
            : getNextOccurrenceNumber(new Date(selectedEvent.targetDate)))
        : undefined)
    : undefined;

  useEffect(() => {
    localStorage.setItem('countdowns', JSON.stringify(events));
    // A genuine local edit stamps now(); a sync merge keeps the real edit time
    // it carried (set by the App Group / iCloud reconcile paths) so receiving
    // data doesn't make this device the newest writer. Consume the flag once.
    const appliedTs = syncAppliedTsRef.current;
    syncAppliedTsRef.current = null;
    localStorage.setItem('countdownsLastUpdated', appliedTs ?? new Date().toISOString());
  }, [events]);

  // Auto-purge: events flagged autoDelete vanish 24h after their target time.
  // Writes tombstones (same path as a manual delete) so the deletion propagates
  // and the sync merge can't re-add them. Recurring events are never purged.
  // ponytail: on-mount + hourly poll is plenty for a 24h-granularity cleanup.
  useEffect(() => {
    const GRACE_MS = 24 * 60 * 60 * 1000;
    const purge = () => {
      const now = Date.now();
      setEvents(prev => {
        const expired = prev.filter(e =>
          e.autoDelete && !e.isRecurring &&
          now > new Date(e.targetDate).getTime() + GRACE_MS
        );
        if (expired.length === 0) return prev;
        const stamps: DeletedMap = {};
        const ts = new Date().toISOString();
        for (const e of expired) {
          stamps[e.id] = ts;
          void cancelEventNotification(e.id);
        }
        persistTombstones(mergeTombstones(deletedRef.current, stamps));
        const expiredIds = new Set(expired.map(e => e.id));
        return prev.filter(e => !expiredIds.has(e.id));
      });
    };
    purge();
    const interval = window.setInterval(purge, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Push the countdown list to iCloud whenever it changes. Skips writes that
  // match what was last reconciled with iCloud (set on push AND on pull), which
  // breaks the ping-pong loop between devices re-pushing the same merged list.
  useEffect(() => {
    if (!isNative) return;

    // Never push an empty list before the first pull has completed — a fresh
    // device would otherwise overwrite another device's data with [].
    if (events.length === 0 && !initialPullDoneRef.current) return;

    const deleted = deletedRef.current;
    const serialized = serializeCloudBlob(events, deleted);
    // Compare by order-independent fingerprint over the whole envelope (events +
    // tombstones). The ref tracks what the cloud holds (set on pull to the
    // remote fingerprint, on push to what we uploaded), so this fires whenever
    // this device has changes the cloud is missing and skips true no-ops.
    const fingerprint = cloudFingerprint(events, deleted);
    if (fingerprint === lastSyncedICloudJsonRef.current) return;

    const pushToICloud = async () => {
      try {
        const result = await CountdownSyncPlugin.pushCountdowns({
          json: serialized,
          updatedAt: localStorage.getItem('countdownsLastUpdated') ?? new Date().toISOString(),
        });
        if (result.success) {
          lastSyncedICloudJsonRef.current = fingerprint;
        } else if (result.reason === 'tooLarge') {
          console.warn('[iCloudSync] Countdown blob too large for iCloud KVS:', result.byteCount);
        }
      } catch (error) {
        console.warn('[iCloudSync] Failed to push countdowns to iCloud:', error);
      }
    };

    pushToICloud();
  }, [events, isNative]);

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
          emojiShape: event.emojiShape,
          isRecurring: event.isRecurring,
          createdAt: event.createdAt,
          hasTime: event.hasTime ?? false,
          invertTimeFormat: event.invertTimeFormat,
        }));

        const payload = {
          events: widgetEvents,
          appearanceMode: selectedAppearanceMode,
          countdownStyle: selectedCountdownStyle,
          legacyTimeFormat,
          appLanguage: i18n.language,
        };
        const serializedPayload = JSON.stringify(payload);
        const widgetEventIds = widgetEvents.map(event => event.id);

        if (lastSyncedWidgetPayloadRef.current === serializedPayload) {
          console.log('[WidgetSync] Skipping native sync - payload unchanged. Event IDs:', widgetEventIds);
          return;
        }

        console.log('[WidgetSync] Calling updateWidgetData with', widgetEvents.length, 'events. Event IDs:', widgetEventIds);
        console.log('[WidgetSync] Events:', JSON.stringify(widgetEvents, null, 2));
        
        const result = await CalendarPlugin.updateWidgetData(payload);
        lastSyncedWidgetPayloadRef.current = serializedPayload;
        
        console.log('[WidgetSync] Success:', result);
      } catch (error) {
        console.error('[WidgetSync] Failed to sync widget data:', error);
      }
    };

    syncWidgetData();
  }, [events, selectedAppearanceMode, selectedCountdownStyle, isNative, legacyTimeFormat, i18n.language]);

  // Check scheduled notifications on app load (for web platform).
  // Only runs while the tab/app is visible — no point polling in background.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval !== null) return;
      checkScheduledNotifications();
      interval = setInterval(() => {
        checkScheduledNotifications();
      }, 60000);
    };

    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') {
      start();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, []);

  // Handle pending imported events — open DatePickerModal prefilled
  useEffect(() => {
    const handlePendingImport = () => {
      const pendingImportStr = localStorage.getItem('pendingImportedEvent');
      if (!pendingImportStr) return;

      try {
        const payload: EventImportPayload = JSON.parse(pendingImportStr);
        localStorage.removeItem('pendingImportedEvent');
        setImportPrefillData(payload);
        setEditingEvent(null);
        setIsModalOpen(true);
        trigger('medium');
      } catch (error) {
        console.error('Failed to import event:', error);
        localStorage.removeItem('pendingImportedEvent');
      }
    };

    handlePendingImport();

    window.addEventListener(IMPORT_EVENT_READY, handlePendingImport);
    return () => window.removeEventListener(IMPORT_EVENT_READY, handlePendingImport);
  }, [trigger]);

  // Handle deep link edit event (when user taps widget to edit an event)
  useEffect(() => {
    const handleEditDeepLink = (event: Event) => {
      const customEvent = event as CustomEvent<EditEventDeepLinkDetail>;
      const { eventId } = customEvent.detail;
      
      console.log('[Index] Received edit deep link for event:', eventId);
      
      // Find the event by ID
      const eventToEdit = events.find(e => e.id === eventId);
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

  // Close swiped cards when clicking/tapping outside
  useEffect(() => {
    const handleClickOutside = async (event: MouseEvent) => {
      // Don't close if modals are open
      if (isModalOpen || isCalendarImportOpen || isRemoveAdsOpen) {
        return;
      }

      // Don't close if we're currently dragging/reordering
      if (activeDragId !== null) {
        return;
      }

      const target = event.target as Node;
      
      // Query all ion-item-sliding elements
      const slidingItems = document.querySelectorAll('ion-item-sliding');
      
      if (slidingItems.length === 0) {
        return;
      }

      // Check each sliding item to see if it's open
      for (const slidingItem of slidingItems) {
        const element = slidingItem as HTMLIonItemSlidingElement;
        
        try {
          const openAmount = await element.getOpenAmount();
          
          // If the item is open (openAmount !== 0)
          if (Math.abs(openAmount) > 2) {
            // Check if click is on ion-item-options (the delete button area)
            // We only want to prevent closing if clicking directly on the delete button
            const itemOptions = slidingItem.querySelector('ion-item-options');
            const isClickOnDeleteButton = itemOptions?.contains(target) ?? false;
            
            // Check if click is on the sliding item itself (the swiped card)
            // Don't close if user is interacting with the open card
            const isClickOnSlidingItem = slidingItem.contains(target);
            
            // Close if click is outside the sliding item entirely
            // This allows the swipe to stay open when clicking the card or delete button
            if (!isClickOnSlidingItem) {
              await element.close();
            }
          }
        } catch (error) {
          // Ignore errors (element might be unmounted)
          console.debug('[Index] Error checking sliding item:', error);
        }
      }
    };

    // Only use click event (fires after gesture completes)
    // touchstart would interfere with the swipe gesture
    document.addEventListener('click', handleClickOutside, false);

    return () => {
      document.removeEventListener('click', handleClickOutside, false);
    };
  }, [isModalOpen, isCalendarImportOpen, isRemoveAdsOpen, activeDragId]);

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

  const offerNotificationPermissionAfterSave = (
    eventId: string,
    title: string,
    targetDate: Date | null,
    emoji: string
  ) => {
    if (!isNative || !targetDate) return;

    window.setTimeout(async () => {
      const { value: shouldEnable } = await Dialog.confirm({
        title: t('notifications.enableTitle'),
        message: t('notifications.enableMessage'),
        okButtonTitle: t('notifications.enable'),
        cancelButtonTitle: t('notifications.notNow'),
      });

      if (!shouldEnable) {
        return;
      }

      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleEventNotification(eventId, title, targetDate, emoji);
      }
    }, 0);
  };

  const handleSave = async (title: string, date: Date, emoji: string, isRecurring: boolean, hasSpecificTime: boolean, emojiColor?: string, emojiShape?: EmojiShape, invertTimeFormat?: boolean) => {
    const saveKind = editingEvent ? 'edit' : 'create';

    // ponytail: unchanged edit = same as cancel, no rescheduling and no "changes saved" toast
    if (editingEvent && !hasEventChanged(editingEvent, {
      title,
      targetDate: date.toISOString(),
      emoji,
      emojiColor,
      emojiShape,
      isRecurring,
      hasTime: hasSpecificTime,
      invertTimeFormat,
    })) {
      setEditingEvent(null);
      return;
    }

    const hasPermission = await checkNotificationPermission();

    if (editingEvent) {
      // Cancel old notification and schedule new one
      await cancelEventNotification(editingEvent.id);
      
      setEvents(prev => updateCountdownEvent(prev, editingEvent.id, {
        title,
        targetDate: date.toISOString(),
        emoji,
        emojiColor,
        emojiShape,
        isRecurring,
        hasTime: hasSpecificTime,
        invertTimeFormat,
      }));
      
      // Schedule notification for the updated event
      const targetDateForNotification = isRecurring 
        ? getNextRecurringDate(date)
        : date;
      if (hasPermission) {
        await scheduleEventNotification(editingEvent.id, title, targetDateForNotification, emoji);
      } else {
        offerNotificationPermissionAfterSave(editingEvent.id, title, targetDateForNotification, emoji);
      }
    } else {
      const newEvent = createCountdownEvent({
        title,
        targetDate: date.toISOString(),
        emoji,
        emojiColor,
        emojiShape,
        isRecurring,
        hasTime: hasSpecificTime,
        invertTimeFormat,
      }, generateId());
      setEvents(prev => [...prev, newEvent]);
      setSelectedEventId(newEvent.id);
      
      // Schedule notification for the new event
      const targetDateForNotification = isRecurring 
        ? getNextRecurringDate(date)
        : date;
      if (hasPermission) {
        await scheduleEventNotification(newEvent.id, title, targetDateForNotification, emoji);
      } else {
        offerNotificationPermissionAfterSave(newEvent.id, title, targetDateForNotification, emoji);
      }
    }
    setEditingEvent(null);

    const shouldShowWidgetTip =
      saveKind === 'create' &&
      events.length === 0 &&
      isNative &&
      !localStorage.getItem('widgetTipShown');

    fabRef.current?.confirm(
      saveKind === 'create' ? t('feedback.eventCreated') : t('feedback.eventUpdated'),
    );

    if (shouldShowWidgetTip) {
      localStorage.setItem('widgetTipShown', '1');
      // Let the "event created" confirmation land before taking over the screen.
      setTimeout(() => setIsWidgetOnboardingOpen(true), 2200);
    }

    void AdsManager.maybeShowInterstitialAfterSave({ kind: saveKind });
  };

  const handleEdit = (event: CountdownEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  // Text for the iOS Settings rows. Built here because only the app knows the
  // active language — Settings itself can only render what we store.
  const slotLabels = (): SlotLabels => ({
    locale: i18n.language,
    empty: t('settings.recentlyDeleted.empty'),
    daysLeft: (days: number) => t('settings.recentlyDeleted.daysLeft', { count: days }),
  });

  const commitDelete = (eventId: string) => {
    const event = pendingDeleteRef.current.get(eventId);
    if (!event) return;
    pendingDeleteRef.current.delete(eventId);
    // Past the undo window: keep a copy for 30 days so it can be recovered from
    // the iOS Settings app (Settings > Yet Another Countdown > Recently Deleted).
    void rememberDeleted(event, slotLabels());
    void cancelEventNotification(eventId);
    void AdsManager.maybeShowInterstitialAfterSave({ kind: 'delete' });
  };

  const restoreEvents = (restored: CountdownEvent[]) => {
    const ids = restored.map(e => e.id);
    // Drop the tombstones so the restored countdowns aren't re-deleted on merge
    // and so the restore propagates back out to the other devices.
    if (ids.some(id => deletedRef.current[id])) {
      const rest = { ...deletedRef.current };
      for (const id of ids) delete rest[id];
      persistTombstones(rest);
    }
    setEvents(prev =>
      [...prev.filter(e => !ids.includes(e.id)), ...restored].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    );
    setRestoringIds(ids);
    window.setTimeout(() => setRestoringIds([]), 450);
  };

  const handleUndoDelete = (eventId: string) => {
    const event = pendingDeleteRef.current.get(eventId);
    if (!event) return;
    pendingDeleteRef.current.delete(eventId);
    trigger('light');
    restoreEvents([event]);
  };

  const handleDeleteRequest = async (event: CountdownEvent): Promise<boolean> => {
    trigger('heavy');
    setDeletingEventId(event.id);
    pendingDeleteRef.current.set(event.id, event);

    await new Promise(resolve => setTimeout(resolve, 400));

    const eventId = event.id;
    const wasSelected = selectedEventId === eventId;

    // Record a tombstone so the deletion propagates across devices — the per-id
    // union merge would otherwise re-add this countdown from whichever device
    // still has it. Undo removes the tombstone. Set before setEvents so the
    // push effect (fired by the events change) uploads it in the same blob.
    persistTombstones(mergeTombstones(deletedRef.current, { [eventId]: new Date().toISOString() }));

    setEvents(prev => {
      const filtered = removeCountdownEvent(prev, eventId);
      if (wasSelected) {
        setSelectedEventId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    setDeletingEventId(null);

    // The FAB shows an undo arrow in this state, so the label is the action —
    // "Undo", not "Deleted".
    fabRef.current?.confirm(t('feedback.undoDelete'), {
      onUndo: () => handleUndoDelete(eventId),
      holdMs: 3500,
      onDismiss: () => commitDelete(eventId),
    });

    return true;
  };

  // Countdowns the user asked back from the iOS Settings app. Settings can only
  // flip a switch; the recovery itself happens the next time the app is open.
  useEffect(() => {
    const check = async () => {
      const recovered = await takeRecoverRequests(slotLabels());
      if (!recovered.length) return;
      trigger('light');
      restoreEvents(recovered);
    };
    void check();
    if (!isNative) return;
    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void check();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative, i18n.language]);

  const handleAddNew = async () => {
    console.log('handleAddNew called');
    trigger('medium');
    setEditingEvent(null);
    setIsModalOpen(true);
    // Note: Focus is now handled by onDidPresent + Capacitor Keyboard.show()
  };

  const handleFabClick = async () => {
    trigger('medium');
    if (isCalendarImportOpen) {
      calendarImportModalRef.current?.import();
    } else if (isModalOpen) {
      datePickerModalRef.current?.save();
    } else {
      await handleAddNew();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setImportPrefillData(null);
  };

  const handleOpenRemoveAds = () => {
    trigger('light');
    setIsRemoveAdsOpen(true);
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

    // Build the new countdown events first so we know which IDs to undo.
    const newEvents: CountdownEvent[] = deduplicatedImports.map((importedEvent) => {
      const eventData = convertToCountdownEvent(importedEvent, generateId);
      return {
        id: generateId(),
        ...eventData,
        createdAt: new Date().toISOString(),
      };
    });

    if (newEvents.length === 0) {
      trigger('medium');
      return;
    }

    setEvents(prev => [...prev, ...newEvents]);

    // Schedule notifications if permission is already granted
    if (hasPermission) {
      for (const newEvent of newEvents) {
        const targetDateForNotification = newEvent.isRecurring
          ? getNextRecurringDate(new Date(newEvent.targetDate))
          : new Date(newEvent.targetDate);
        await scheduleEventNotification(newEvent.id, newEvent.title, targetDateForNotification, newEvent.emoji);
      }
    }

    const importedIds = new Set(newEvents.map(e => e.id));
    fabRef.current?.confirm(
      t('feedback.eventImported', { count: newEvents.length }),
      {
        onUndo: () => {
          // Tombstone the undone imports so the removal also propagates to other
          // devices that may have already received them via sync.
          const now = new Date().toISOString();
          const undone: DeletedMap = {};
          for (const id of importedIds) undone[id] = now;
          persistTombstones(mergeTombstones(deletedRef.current, undone));
          setEvents(prev => prev.filter(e => !importedIds.has(e.id)));
          for (const id of importedIds) void cancelEventNotification(id);
          trigger('light');
        },
        holdMs: 3500,
      },
    );

    trigger('medium');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;

    // Read the grab point now, synchronously — the first drag move can land
    // before the width measurement below gets its frame.
    const activator = event.activatorEvent as PointerEvent & { touches?: TouchList };
    const grabX = activator?.touches?.[0]?.clientX ?? activator?.clientX;
    const grabbedCard = document.querySelector(`[data-sortable-id="${activeId}"]`) as HTMLElement | null;
    const grabbedRect = grabbedCard?.getBoundingClientRect();
    dragGrabOffsetRef.current =
      typeof grabX === 'number' && grabbedRect && grabbedRect.width > 0
        ? Math.max(-1, Math.min(1, (grabX - (grabbedRect.left + grabbedRect.width / 2)) / (grabbedRect.width / 2)))
        : -1;

    setActiveDragId(activeId);
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
      // Vertical movement: highly reactive, and pivoted around the grab point.
      // Held by the left edge, dragging down drops that edge and the far side
      // lags up; held by the right edge it mirrors; held dead centre the card
      // stays level, the way a real card would.
      const verticalTiltMultiplier = 0.08;
      const verticalRotationDelta = deltaY * verticalTiltMultiplier * dragGrabOffsetRef.current;

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

  const isAnyModalOpen = isModalOpen || isCalendarImportOpen;
  const fabDisabled = (isModalOpen && !canSaveForm) || (isCalendarImportOpen && !canImportCalendar);
  const fabIcon = isAnyModalOpen ? checkmark : add;
  const fabAriaLabel = isCalendarImportOpen
    ? t('aria.importEvents')
    : isModalOpen
      ? t('aria.saveEvent')
      : t('aria.addEvent');

  // Read-only mirror of the edit FAB: how long is left / how long ago, pinned
  // opposite it while an existing countdown is being edited. Driven by the
  // modal's live draft, not the saved event, so date/time/format toggles are
  // reflected as you change them.
  const pillSource = editingEvent && isModalOpen
    ? (draft ?? {
        date: new Date(editingEvent.targetDate),
        hasTime: editingEvent.hasTime ?? false,
        invertTimeFormat: editingEvent.invertTimeFormat ?? false,
        isRecurring: editingEvent.isRecurring,
      })
    : null;
  const pillTarget = pillSource
    ? (pillSource.isRecurring ? getNextRecurringDate(pillSource.date) : pillSource.date)
    : null;

  const fabPortal = (
    <div
      className={`fab-portal${isAnyModalOpen ? ' fab-portal--above-modal' : ''} transition-all duration-300`}
      style={{
        position: 'fixed',
        right: 'calc(16px + env(safe-area-inset-left))',
        bottom: 'calc(16px + env(safe-area-inset-bottom) + 56px)',
        zIndex: isAnyModalOpen ? 100000 : 50,
        display:
          isRemoveAdsOpen || isTrackingConsentOpen || isWidgetOnboardingOpen || isFirstRunOpen
            ? 'none'
            : undefined,
      }}
    >
      <div className="active:scale-90 transition-transform duration-150">
        <MorphingFab
          ref={fabRef}
          icon={fabIcon}
          onClick={handleFabClick}
          ariaLabel={fabAriaLabel}
          disabled={fabDisabled}
        />
      </div>
    </div>
  );

  const countdownPill = (
    <CountdownPill
      target={pillTarget}
      includeTime={pillSource?.hasTime ?? false}
      legacy={resolveLegacy(pillSource?.invertTimeFormat, legacyTimeFormat)}
    />
  );

  return (
    <IonPage>

      {/* Sticky top scroll-shadow: fades in when the page is scrolled. */}
      <div
        className={`home-scroll-shadow${isHomeScrolled ? ' is-scrolled' : ''}`}
        aria-hidden="true"
      />

      <IonContent
        fullscreen
        scrollEvents
        onIonScroll={(e) => {
          const top = e.detail.scrollTop;
          setIsHomeScrolled(top > 4);
        }}
        className="ion-padding"
      >
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
                  {hasRemoveAds && (
                    <span className="header-adfree-badge">
                      {t('iap.adFreeBadge')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="header-brand-line2">COUNTDOWN</span>
                </div>
              </div>
            </IonTitle>
            <IonButtons slot="end" className="px-2">
              {isNative && !hasRemoveAds && (
                <div className="active:scale-90 transition-transform duration-150">
                  <IonButton
                    onClick={handleOpenRemoveAds}
                    aria-label={t('aria.openRemoveAds')}
                    className="header-action-button"
                  >
                    <NoAdsIcon className="w-5 h-5" />
                  </IonButton>
                </div>
              )}
              <div className="active:scale-90 transition-transform duration-150">
                <IonButton
                  onClick={handleOpenCalendarImport}
                  aria-label={t('aria.importFromCalendar')}
                  className="header-action-button"
                >
                  <IonIcon icon={calendarOutline} />
                </IonButton>
              </div>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        {/* Main content */}
        <div
          className="pb-12"
          style={{ paddingBottom: 'calc(3rem + var(--ad-banner-height, 0px))' }}
        >
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center shadow-ios-lg mb-6 animate-float">
                <span className="text-4xl">⏳</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('app.noCountdowns')}</h2>
              <p className="text-muted-foreground text-center max-w-xs mb-8">
                {t('app.createFirst')}
              </p>
              {/* The guided flow opens itself on a first launch; this is how
                  you get back to it after dismissing it. */}
              <button
                onClick={() => setIsFirstRunOpen(true)}
                className="wo-primary mb-4 rounded-2xl px-6 py-3 text-base font-semibold transition-transform duration-150 active:scale-[0.97]"
              >
                {t('firstRun.emptyCta')}
              </button>
              <button
                onClick={handleOpenCalendarImport}
                className="text-sm text-primary underline underline-offset-2 active:opacity-70 transition-opacity"
              >
                {t('app.orImportFromCalendar')}
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Events list */}
              <section className="space-y-3">
                {!isNative && (
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                    {t('events.title')}
                  </h2>
                )}
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
                    <div className="space-y-2" style={{ backgroundColor: 'hsl(var(--background))', overflow: 'visible' }}>
                      {events.map((event) => (
                        <div key={event.id}>
                          <SortableCountdownCard
                            event={event}
                            isSelected={event.id === selectedEventId}
                            isReordering={activeDragId !== null}
                            isDragDisabled={isDragDisabledByDeleteButton}
                            isNative={isNative}
                            isMobile={isMobile}
                            isDeleting={deletingEventId === event.id}
                            isRestoring={restoringIds.includes(event.id)}
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
                        </div>
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
                            backgroundColor: 'hsl(var(--card))',
                            borderRadius: '1rem',
                            boxShadow: '0 8px 24px -4px hsl(0 0% 0% / 0.12), 0 4px 12px -2px hsl(0 0% 0% / 0.08)',
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
                      <div className="animate-scale-in">
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

                  {/* Triple widget preview (iOS Triple Countdown widget is large-only in the system picker) */}
                  {events.length > 0 && (
                    <section className="space-y-3">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                        Triple Countdown Preview
                      </h2>
                      <div className="flex justify-center py-4">
                        <div className="animate-scale-in">
                          <TripleWidgetPreview
                            events={events.slice(0, 3)}
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

      {typeof document !== 'undefined' ? createPortal(fabPortal, document.body) : null}
      {typeof document !== 'undefined' ? createPortal(countdownPill, document.body) : null}

      {/* Ad Integration Bar - Background for the ad area (only show when loading/placeholder is active) */}
      {showAdPlaceholder && !hasRemoveAds && !isTrackingConsentOpen && (
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
        onCanSaveChange={setCanSaveForm}
        onDraftChange={setDraft}
        initialTitle={editingEvent?.title ?? importPrefillData?.title}
        initialDate={
          editingEvent
            ? new Date(editingEvent.targetDate)
            : importPrefillData
              ? new Date(importPrefillData.targetDate)
              : (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; })()
        }
        initialEmoji={editingEvent?.emoji ?? importPrefillData?.emoji}
        initialEmojiColor={editingEvent?.emojiColor ?? importPrefillData?.emojiColor}
        initialEmojiShape={editingEvent?.emojiShape}
        initialInvertTimeFormat={editingEvent?.invertTimeFormat}
        initialIsRecurring={editingEvent?.isRecurring ?? importPrefillData?.isRecurring}
        initialIsImported={editingEvent?.isImported}
        initialImportedFrom={editingEvent?.importedFrom}
        isEditing={!!editingEvent}
        onDelete={editingEvent ? () => handleDeleteRequest(editingEvent) : undefined}
        onConfirmDateChange={confirmDateChange}
      />

      <CalendarImportModal
        ref={calendarImportModalRef}
        isOpen={isCalendarImportOpen}
        onClose={() => setIsCalendarImportOpen(false)}
        onImport={handleCalendarImport}
        onCanImportChange={setCanImportCalendar}
      />

      <RemoveAdsModal
        isOpen={isRemoveAdsOpen}
        onClose={() => setIsRemoveAdsOpen(false)}
        isNative={isNative}
        hasRemoveAds={hasRemoveAds}
        isDevBuild={isDevBuild}
      />

      <TrackingConsentModal
        isOpen={isTrackingConsentOpen}
        onContinue={() => {
          setIsTrackingConsentOpen(false);
          void AdsManager.requestTrackingConsent();
        }}
      />

      <WidgetOnboardingModal
        isOpen={isWidgetOnboardingOpen}
        onDismiss={() => {
          setIsWidgetOnboardingOpen(false);
          setWidgetConfirmOnOpen(false);
        }}
        startOnSuccess={widgetConfirmOnOpen}
      />

      {/* Hands its answers to the same save path as the + sheet, so the new
          countdown gets notifications, the confirmation toast and the widget
          pitch that follows a first creation. */}
      <FirstRunOnboardingModal
        isOpen={isFirstRunOpen}
        onDismiss={() => setIsFirstRunOpen(false)}
        onCreate={async (...args) => {
          setIsFirstRunOpen(false);
          await handleSave(...args);
        }}
      />

    </IonPage>
  );
}
