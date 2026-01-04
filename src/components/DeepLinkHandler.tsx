import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

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
      const urlObj = new URL(url);
      
      // Route to import page with the full URL as query
      if (urlObj.pathname === '/import' || urlObj.pathname.endsWith('/import')) {
        history.push(`/import${urlObj.search}`);
      }
    } catch (error) {
      console.error('Failed to handle deep link:', error);
    }
  };

  return null;
}
