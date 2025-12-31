import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection';

export function useHaptic() {
  const trigger = useCallback((style: HapticStyle = 'light') => {
    // Try native haptic feedback first (for Capacitor/native apps)
    if ('vibrate' in navigator) {
      const durations: Record<HapticStyle, number> = {
        light: 10,
        medium: 20,
        heavy: 30,
        selection: 5,
      };
      navigator.vibrate(durations[style]);
    }
    
    // Add visual haptic feedback animation
    document.documentElement.style.setProperty('--haptic-scale', '0.98');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--haptic-scale', '1');
      });
    });
  }, []);

  return { trigger };
}
