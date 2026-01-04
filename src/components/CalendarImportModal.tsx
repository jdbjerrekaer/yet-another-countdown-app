import { useState, useEffect } from 'react';
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
} from '@ionic/react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptic } from '@/hooks/useHaptic';
import {
  isNativeCalendarAvailable,
  fetchNativeCalendarEvents,
  fetchICSCalendarEvents,
  ImportableEvent,
  deduplicateEvents,
  sortEventsByDate,
} from '@/lib/calendarImport';
import { isValidICSUrl } from '@/lib/icsParser';

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
  const [events, setEvents] = useState<ImportableEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEvents([]);
      setSelectedEventIds(new Set());
      setSearchQuery('');
      setError(null);
      setUrlError(null);
      setIcsUrl('');
      
      // Auto-fetch native calendar events on iOS
      if (isNativeCalendarAvailable()) {
        fetchNativeEvents();
      }
    }
  }, [isOpen]);
  
  // Fetch native calendar events
  const fetchNativeEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchNativeCalendarEvents();
      
      if (result.error) {
        setError(result.error);
        setEvents([]);
      } else {
        const dedupedEvents = deduplicateEvents(result.events);
        const sortedEvents = sortEventsByDate(dedupedEvents);
        setEvents(sortedEvents);
      }
    } catch (err) {
      setError(t('calendar.fetchError'));
    } finally {
      setLoading(false);
    }
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
        setEvents([]);
      } else {
        const dedupedEvents = deduplicateEvents(result.events);
        const sortedEvents = sortEventsByDate(dedupedEvents);
        setEvents(sortedEvents);
      }
    } catch (err) {
      setError(t('calendar.fetchError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Filter events by search query
  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
    const selectedEvents = events.filter(e => selectedEventIds.has(e.id));
    onImport(selectedEvents);
    onClose();
  };
  
  // Handle close
  const handleClose = () => {
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
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleClose}>{t('modal.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{t('calendar.importTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={handleImport}
              disabled={selectedEventIds.size === 0}
              strong
            >
              {t('calendar.importButton')} ({selectedEventIds.size})
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Web: URL input for .ics files */}
        {!isNative && (
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="ics-url" className="text-sm font-medium text-muted-foreground">
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
              <IonButton onClick={fetchNativeEvents} fill="outline">
                {t('calendar.tryAgain')}
              </IonButton>
            )}
          </div>
        )}
        
        {/* Events list */}
        {!loading && !error && events.length > 0 && (
          <>
            {/* Search and select all */}
            <div className="space-y-3 mb-4">
              <IonSearchbar
                value={searchQuery}
                onIonInput={(e) => setSearchQuery(e.detail.value || '')}
                placeholder={t('calendar.searchPlaceholder')}
                className="p-0"
              />
              
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
              {filteredEvents.map((event) => (
                <IonItem
                  key={event.id}
                  button
                  onClick={() => toggleEventSelection(event.id)}
                  className="ion-no-padding"
                >
                  <IonCheckbox
                    slot="start"
                    checked={selectedEventIds.has(event.id)}
                    onIonChange={() => toggleEventSelection(event.id)}
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
                        <span className="ml-2 text-primary">• {t('calendar.yearly')}</span>
                      )}
                    </p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </>
        )}
        
        {/* Empty state */}
        {!loading && !error && events.length === 0 && isNative && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <IonText color="medium" className="text-center">
              <p className="text-lg font-medium">{t('calendar.noEventsTitle')}</p>
              <p className="text-sm">{t('calendar.noEventsMessage')}</p>
            </IonText>
            <IonButton onClick={fetchNativeEvents} fill="outline">
              {t('calendar.refresh')}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
}
