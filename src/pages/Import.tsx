import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { decodeEventImportLink, validatePayload } from '@/lib/eventImportLink';

/**
 * Import page that handles event import links
 * Decodes the payload from URL, stores it in localStorage, and redirects to home
 */
export default function Import() {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    const handleImport = () => {
      try {
        // Extract payload from search params
        const searchParams = new URLSearchParams(location.search);
        const payloadParam = searchParams.get('payload');
        const versionParam = searchParams.get('v');
        
        if (!payloadParam) {
          console.error('Missing payload parameter');
          history.push('/');
          return;
        }
        
        // Construct a URL for decoding (works with both custom scheme and web URLs)
        // Use web URL format for browser compatibility
        const importUrl = `${window.location.origin}/import?payload=${payloadParam}${versionParam ? `&v=${versionParam}` : '&v=1'}`;
        
        // Decode the payload
        const payload = decodeEventImportLink(importUrl);
        
        // Validate payload
        if (!validatePayload(payload)) {
          console.error('Invalid payload structure');
          history.push('/');
          return;
        }
        
        // Store pending import in localStorage
        localStorage.setItem('pendingImportedEvent', JSON.stringify(payload));
        
        // Redirect to home page
        history.push('/');
      } catch (error) {
        console.error('Failed to import event:', error);
        // Redirect to home on error
        history.push('/');
      }
    };

    handleImport();
  }, [history, location]);

  // Show nothing while processing
  return null;
}
