/**
 * Helper functions for encoding/decoding event import links
 * Uses base64url encoding for URL-safe payload transmission
 */

export interface EventImportPayload {
  title: string;
  targetDate: string; // ISO string
  emoji: string;
  emojiColor?: string;
  isRecurring: boolean;
  v?: number; // version
}

const SCHEME = 'countdownapp';
const VERSION = 1;

/**
 * Encodes an event payload into a shareable import link
 */
export function encodeEventImportLink(payload: Omit<EventImportPayload, 'v'>): string {
  const fullPayload: EventImportPayload = {
    ...payload,
    v: VERSION,
  };
  
  const json = JSON.stringify(fullPayload);
  // Use base64url encoding (URL-safe base64)
  const base64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${SCHEME}://import?payload=${base64}&v=${VERSION}`;
}

/**
 * Converts a custom scheme URL to a web-friendly URL for testing
 * Useful for testing import links in the browser
 */
export function convertToWebUrl(customSchemeUrl: string, baseUrl: string = window.location.origin): string {
  try {
    const urlObj = new URL(customSchemeUrl);
    if (urlObj.protocol === `${SCHEME}:` && urlObj.pathname === '/import') {
      return `${baseUrl}/import${urlObj.search}`;
    }
    return customSchemeUrl;
  } catch {
    return customSchemeUrl;
  }
}

/**
 * Decodes an import link URL and returns the payload
 * Supports both custom scheme URLs (countdownapp://) and web URLs
 * @throws Error if the URL is invalid or payload cannot be decoded
 */
export function decodeEventImportLink(url: string): EventImportPayload {
  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    // Accept both custom scheme and web URLs
    const isValidScheme = urlObj.protocol === `${SCHEME}:` || urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    if (!isValidScheme) {
      throw new Error(`Invalid scheme: expected ${SCHEME}://, http://, or https://`);
    }
    
    if (urlObj.pathname !== '/import' && !urlObj.pathname.endsWith('/import')) {
      throw new Error(`Invalid path: expected /import`);
    }
    
    const payloadParam = urlObj.searchParams.get('payload');
    if (!payloadParam) {
      throw new Error('Missing payload parameter');
    }
    
    // Decode base64url
    const base64 = payloadParam
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    const json = decodeURIComponent(escape(atob(padded)));
    const payload: EventImportPayload = JSON.parse(json);
    
    // Validate version
    if (payload.v !== VERSION) {
      throw new Error(`Unsupported version: ${payload.v}`);
    }
    
    // Validate required fields
    if (!payload.title || !payload.targetDate || !payload.emoji) {
      throw new Error('Missing required fields in payload');
    }
    
    return payload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to decode import link: ${error.message}`);
    }
    throw new Error('Failed to decode import link: Unknown error');
  }
}

/**
 * Validates that a payload has all required fields
 */
export function validatePayload(payload: EventImportPayload): boolean {
  return !!(
    payload.title &&
    payload.targetDate &&
    payload.emoji &&
    typeof payload.isRecurring === 'boolean'
  );
}
