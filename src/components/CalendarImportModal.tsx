import { useState, useEffect, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonSpinner,
  IonText,
  IonSearchbar,
  IonIcon,
} from '@ionic/react';
import { downloadOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptic } from '@/hooks/useHaptic';
import {
  isNativeCalendarAvailable,
  fetchNativeCalendarEvents,
  fetchAllNativeCalendarEvents,
  fetchICSCalendarEvents,
  ImportableEvent,
  deduplicateEvents,
  sortEventsByDate,
} from '@/lib/calendarImport';
import { isValidICSUrl } from '@/lib/icsParser';
import CalendarPlugin from '@/plugins/CalendarPlugin';

interface CalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: ImportableEvent[]) => void;
}

export function CalendarImportModal({ isOpen, onClose, onImport }: CalendarImportModalProps) {
  const { t } = useTranslation();
  const { trigger } = useHaptic();
  const isNative = Capacitor.isNativePlatform();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [recurringEvents, setRecurringEvents] = useState<ImportableEvent[]>([]); // Only recurring events (default view)
  const [allEvents, setAllEvents] = useState<ImportableEvent[]>([]); // All events (for filter/search)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  
  // Determine which event set to use based on filters
  // Show all events when: calendar is selected OR search query is entered
  const shouldShowAllEvents = selectedCalendars.size > 0 || searchQuery.trim().length > 0;
  const events = shouldShowAllEvents ? allEvents : recurringEvents;
  
  // Get unique calendars from all events (not just recurring)
  const availableCalendars = [...new Set(allEvents.map(e => e.calendarTitle).filter(Boolean))] as string[];
  
  // Fetch native calendar events (both recurring and all)
  const fetchNativeEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsPermissionError(false);
    
    try {
      // Fetch both recurring-only and all events in parallel
      const [recurringResult, allResult] = await Promise.all([
        fetchNativeCalendarEvents(),
        fetchAllNativeCalendarEvents(),
      ]);
      
      if (recurringResult.error) {
        // Check if this is a permission error
        const isPermDenied = recurringResult.error.toLowerCase().includes('permission') || 
                             recurringResult.error.toLowerCase().includes('denied');
        setIsPermissionError(isPermDenied);
        setError(isPermDenied ? t('calendar.permissionDeniedMessage') : recurringResult.error);
        setRecurringEvents([]);
        setAllEvents([]);
      } else {
        // Sort first, then dedupe - this ensures the upcoming occurrence is kept
        const sortedRecurring = sortEventsByDate(recurringResult.events);
        const dedupedRecurring = deduplicateEvents(sortedRecurring);
        setRecurringEvents(dedupedRecurring);
        
        // Process all events too
        if (!allResult.error) {
          const sortedAll = sortEventsByDate(allResult.events);
          const dedupedAll = deduplicateEvents(sortedAll);
          setAllEvents(dedupedAll);
        }
      }
    } catch (err) {
      setError(t('calendar.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecurringEvents([]);
      setAllEvents([]);
      setSelectedEventIds(new Set());
      setSearchQuery('');
      setError(null);
      setIsPermissionError(false);
      setUrlError(null);
      setIcsUrl('');
      setSelectedCalendars(new Set());
      
      // Auto-fetch native calendar events on iOS
      // Permission is already requested before opening the modal,
      // so we can proceed directly to fetching events
      if (isNativeCalendarAvailable()) {
        fetchNativeEvents();
      }
    }
  }, [isOpen, fetchNativeEvents]);
  
  // Open iOS Settings
  const handleOpenSettings = async () => {
    trigger('light');
    try {
      await CalendarPlugin.openSettings();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  };
  
  // Handle Try Again button click
  const handleTryAgain = () => {
    trigger('light');
    fetchNativeEvents();
  };
  
  // Fetch events from ICS URL
  const fetchICSEvents = async () => {
    if (!icsUrl.trim()) {
      setUrlError(t('calendar.urlRequired'));
      return;
    }
    
    if (!isValidICSUrl(icsUrl)) {
      setUrlError(t('calendar.invalidUrl'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setUrlError(null);
    
    try {
      const result = await fetchICSCalendarEvents(icsUrl);
      
      if (result.error) {
        setError(result.error);
        setRecurringEvents([]);
        setAllEvents([]);
      } else {
        // Sort first, then dedupe - this ensures the upcoming occurrence is kept
        const sortedEvents = sortEventsByDate(result.events);
        const dedupedEvents = deduplicateEvents(sortedEvents);
        // For ICS, all fetched events are recurring, so both arrays are the same
        setRecurringEvents(dedupedEvents);
        setAllEvents(dedupedEvents);
      }
    } catch (err) {
      setError(t('calendar.fetchError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Filter events by search query and selected calendars
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    // If no calendars are selected, show all events
    // If calendars are selected, only show events from those calendars
    let matchesCalendar = true;
    if (selectedCalendars.size > 0) {
      matchesCalendar = event.calendarTitle !== undefined && 
                        event.calendarTitle !== null && 
                        selectedCalendars.has(event.calendarTitle);
    }
    return matchesSearch && matchesCalendar;
  });
  
  // Toggle calendar filter
  const toggleCalendarFilter = (calendarTitle: string) => {
    trigger('light');
    setSelectedCalendars(prev => {
      const next = new Set(prev);
      if (next.has(calendarTitle)) {
        next.delete(calendarTitle);
      } else {
        next.add(calendarTitle);
      }
      return next;
    });
  };
  
  // Toggle event selection
  const toggleEventSelection = (eventId: string) => {
    trigger('light');
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };
  
  // Select all visible events
  const selectAll = () => {
    trigger('light');
    setSelectedEventIds(new Set(filteredEvents.map(e => e.id)));
  };
  
  // Deselect all events
  const deselectAll = () => {
    trigger('light');
    setSelectedEventIds(new Set());
  };
  
  // Handle import button click
  const handleImport = () => {
    trigger('medium');
    // Look in both event arrays to find selected events
    const allAvailableEvents = [...recurringEvents, ...allEvents];
    // Dedupe by id in case same event appears in both
    const uniqueEvents = new Map(allAvailableEvents.map(e => [e.id, e]));
    const selectedEvents = Array.from(uniqueEvents.values()).filter(e => selectedEventIds.has(e.id));
    onImport(selectedEvents);
    onClose();
  };
  
  // Handle close button click (with haptics)
  const handleCloseClick = () => {
    trigger('light');
    onClose();
  };
  
  // Get emoji for event type
  const getEventEmoji = (event: ImportableEvent): string => {
    if (event.isBirthday) return '🎂';
    const lower = event.title.toLowerCase();
    if (lower.includes('anniversary')) return '💍';
    if (lower.includes('wedding')) return '💒';
    return '🎉';
  };
  
  // Format date for display
  const formatEventDate = (date: Date): string => {
    return format(date, 'MMM d');
  };
  
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleCloseClick}>{t('modal.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{t('calendar.importTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={handleImport}
              disabled={selectedEventIds.size === 0}
              strong
            >
              {t('calendar.importButton')} ({selectedEventIds.size})
              <IonIcon icon={downloadOutline} slot="end" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Web: URL input for .ics files */}
        {!isNative && (
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="ics-url" className="text-sm font-medium text-muted-foreground pl-4">
                {t('calendar.icsUrlLabel')}
              </Label>
              <Input
                id="ics-url"
                type="url"
                value={icsUrl}
                onChange={(e) => {
                  setIcsUrl(e.target.value);
                  setUrlError(null);
                }}
                placeholder={t('calendar.icsUrlPlaceholder')}
                className="h-12 rounded-xl text-base bg-secondary/50 border-0"
              />
              {urlError && (
                <p className="text-sm text-destructive">{urlError}</p>
              )}
            </div>
            <IonButton
              expand="block"
              onClick={fetchICSEvents}
              disabled={loading || !icsUrl.trim()}
              className="black-button"
            >
              {loading ? <IonSpinner name="crescent" /> : t('calendar.fetchEvents')}
            </IonButton>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>{t('calendar.icsUrlHint')}</p>
            </div>
          </div>
        )}
        
        {/* Native: Permission/loading states */}
        {isNative && loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <IonSpinner name="crescent" className="w-8 h-8" />
            <IonText color="medium">{t('calendar.loading')}</IonText>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <IonText color="danger" className="text-center">
              <p>{error}</p>
            </IonText>
            {isNative && (
              <div className="flex flex-col gap-2">
                {isPermissionError ? (
                  <IonButton onClick={handleOpenSettings} fill="solid">
                    {t('calendar.openSettings')}
                  </IonButton>
                ) : (
                  <IonButton onClick={handleTryAgain} fill="outline">
                    {t('calendar.tryAgain')}
                  </IonButton>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Events list */}
        {!loading && !error && (recurringEvents.length > 0 || allEvents.length > 0) && (
          <>
            {/* Search and select all */}
            <div className="space-y-3 mb-4">
              <IonSearchbar
                value={searchQuery}
                onIonInput={(e) => setSearchQuery(e.detail.value || '')}
                placeholder={t('calendar.searchPlaceholder')}
                className="p-0"
              />
              
              {/* Calendar filter chips */}
              {availableCalendars.length > 1 && (
                <div className="flex flex-wrap gap-2 px-2">
                  <AnimatePresence mode="popLayout">
                    {availableCalendars.map((calendar, index) => (
                      <motion.button
                        key={calendar}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 400, 
                          damping: 25,
                          delay: index * 0.03 
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleCalendarFilter(calendar)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          selectedCalendars.has(calendar)
                            ? 'bg-primary text-primary-foreground'
                            : selectedCalendars.size === 0
                            ? 'bg-secondary/80 text-foreground/80'
                            : 'bg-secondary/50 text-muted-foreground'
                        }`}
                      >
                        {calendar}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  {selectedCalendars.size > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedCalendars(new Set())}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/30 text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                      {t('calendar.clearFilter')}
                    </motion.button>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center px-2">
                <IonText color="medium" className="text-sm">
                  {t('calendar.eventsFound', { count: filteredEvents.length })}
                </IonText>
                <div className="flex gap-2">
                  <IonButton fill="clear" size="small" onClick={selectAll}>
                    {t('calendar.selectAll')}
                  </IonButton>
                  <IonButton fill="clear" size="small" onClick={deselectAll}>
                    {t('calendar.deselectAll')}
                  </IonButton>
                </div>
              </div>
            </div>
            
            {/* Event list */}
            <IonList className="rounded-xl overflow-hidden">
              <AnimatePresence mode="popLayout">
                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 25,
                      delay: Math.min(index * 0.02, 0.3) 
                    }}
                    layout
                  >
                    <IonItem
                      button
                      onClick={() => toggleEventSelection(event.id)}
                      className="ion-no-padding"
                    >
                      <IonCheckbox
                        slot="start"
                        checked={selectedEventIds.has(event.id)}
                        className="ml-4"
                      />
                      <IonLabel className="py-3">
                        <h2 className="flex items-center gap-2">
                          <span>{getEventEmoji(event)}</span>
                          <span className="font-medium">{event.title}</span>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {formatEventDate(event.date)}
                          {event.isRecurring && (
                            <span className="text-primary"> · {t('calendar.yearly')}</span>
                          )}
                          {event.calendarTitle && (
                            <span className="text-muted-foreground/70"> · {event.calendarTitle}</span>
                          )}
                        </p>
                      </IonLabel>
                    </IonItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </IonList>
          </>
        )}
        
        {/* Empty state */}
        {!loading && !error && recurringEvents.length === 0 && isNative && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <IonText color="medium" className="text-center">
              <p className="text-lg font-medium">{t('calendar.noEventsTitle')}</p>
              <p className="text-sm">{t('calendar.noEventsMessage')}</p>
            </IonText>
            <IonButton onClick={handleTryAgain} fill="outline">
              {t('calendar.refresh')}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
}
