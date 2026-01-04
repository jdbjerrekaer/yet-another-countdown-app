import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects if the current browser is Safari on mobile (iOS Safari)
 * Safari mobile blocks autoFocus in modals, so we need to disable it
 */
export function isSafariMobile(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  
  return isIOS && isSafari;
}
