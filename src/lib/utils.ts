import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, getYear } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date as 'MMM d' if it's in the current year, or 'MMM d, yyyy' otherwise
 */
export function formatDateSmart(date: Date): string {
  const currentYear = getYear(new Date());
  const dateYear = getYear(date);
  
  if (dateYear === currentYear) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
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
