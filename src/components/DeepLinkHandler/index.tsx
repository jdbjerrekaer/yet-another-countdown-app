import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Custom event for edit deep links
export const EDIT_EVENT_DEEP_LINK = 'editEventDeepLink';

export interface EditEventDeepLinkDetail {
  eventId: string;
}

/**
 * Component that handles deep links on native platforms
 * Listens for app URL open events and routes them to the appropriate page
 */
export function DeepLinkHandler() {
  const history = useHistory();

  useEffect(() => {
    // Handle native deep links
    if (Capacitor.isNativePlatform()) {
      // Handle app launch URL (if app was opened via deep link)
      App.getLaunchUrl().then((result) => {
        if (result?.url) {
          handleDeepLink(result.url);
        }
      });

      // Listen for app URL open events (when app is already running)
      const listener = App.addListener('appUrlOpen', (event) => {
        handleDeepLink(event.url);
      });

      return () => {
        listener.then((l) => l.remove());
      };
    } else {
      // Web: Check if we're already on the import page (handled by Import component)
      // Also handle browser navigation to custom scheme URLs by converting them
      const handleWebDeepLink = () => {
        // Check if URL hash or search params contain import data
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('payload')) {
          // Already on import page with params, Import component will handle it
          return;
        }
      };
      
      handleWebDeepLink();
    }
  }, [history]);

  const handleDeepLink = (url: string) => {
    try {
      console.log('[DeepLink] Handling URL:', url);
      
      // Parse the URL - handle both standard URLs and custom scheme URLs
      // Custom scheme URLs like countdownapp://edit?id=xxx need special handling
      let pathname = '';
      let searchParams: URLSearchParams;
      
      if (url.startsWith('countdownapp://')) {
        // Custom scheme URL: countdownapp://edit?id=xxx
        const withoutScheme = url.replace('countdownapp://', '');
        const [path, query] = withoutScheme.split('?');
        pathname = '/' + path;
        searchParams = new URLSearchParams(query || '');
      } else {
        // Standard URL
        const urlObj = new URL(url);
        pathname = urlObj.pathname;
        searchParams = urlObj.searchParams;
      }
      
      console.log('[DeepLink] Parsed - pathname:', pathname, 'params:', Object.fromEntries(searchParams));
      
      // Handle edit deep link from widget tap
      if (pathname === '/edit' || pathname.endsWith('/edit')) {
        const eventId = searchParams.get('id');
        if (eventId) {
          console.log('[DeepLink] Dispatching edit event for:', eventId);
          // Dispatch custom event that Index.tsx will listen to
          window.dispatchEvent(new CustomEvent<EditEventDeepLinkDetail>(EDIT_EVENT_DEEP_LINK, {
            detail: { eventId }
          }));
        }
        return;
      }
      
      // Route to import page with the full URL as query
      if (pathname === '/import' || pathname.endsWith('/import')) {
        history.push(`/import?${searchParams.toString()}`);
      }
    } catch (error) {
      console.error('Failed to handle deep link:', error);
    }
  };

  return null;
}
