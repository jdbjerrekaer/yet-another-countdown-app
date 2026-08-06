/**
 * Illustrations for the "add the widget" flow, drawn as live DOM rather than
 * exported images: they stay sharp at any size, follow the app's theme, and the
 * widget in the picture is the real <SmallWidget /> component.
 *
 * Frames are laid out at a fixed 400x620 design size; <FrameFit> scales that to
 * whatever box you give it.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SmallWidget } from '@/components/widgets/SmallWidget';
import type { CountdownTime } from '@/hooks/useCountdown';
import './frames.css';

export const FRAME_WIDTH = 400;
export const FRAME_HEIGHT = 620;

export type FrameName =
  | '01-long-press'
  | '02-tap-plus'
  | '02-tap-edit'
  | '03-search'
  | '04-add-widget'
  | '05-done';

const APP_NAME = 'Yet Another Countdown';
const APP_ICON = '/apple-touch-icon.png';

// Muted placeholder home-screen apps — deliberately not real brands.
const ICON_HUES = [
  12, 205, 145, 268, 32, 190, 340, 96, 250, 8,
  172, 300, 45, 218, 128, 282, 20, 236, 160, 318,
];
const DOCK_HUES = [210, 20, 150, 275];

/** Fixed sample so the illustration never shows a live-updating number. */
const SAMPLE_COUNTDOWN: CountdownTime = {
  days: 12,
  hours: 4,
  minutes: 30,
  seconds: 0,
  totalSeconds: 12 * 86400,
  isComplete: false,
  isPast: false,
  daysSince: 0,
};
const SAMPLE_TARGET = new Date(2026, 7, 18, 12, 0, 0);

function useIsDark() {
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

function AppIcon({ hue }: { hue: number }) {
  return (
    <div
      className="wof-icon"
      style={{ background: `linear-gradient(150deg, hsl(${hue} 62% 68%), hsl(${hue + 18} 58% 55%))` }}
    />
  );
}

function Dock() {
  return (
    <div className="wof-dock">
      {DOCK_HUES.map((hue) => (
        <div className="wof-dock-slot" key={hue}>
          <AppIcon hue={hue} />
        </div>
      ))}
    </div>
  );
}

/** Home Screen in jiggle mode: tilted icons with a remove badge. */
function JiggleGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="wof-grid is-jiggle">
      {ICON_HUES.slice(0, count).map((hue, i) => (
        <div className="wof-cell" key={i}>
          <AppIcon hue={hue} />
          <div className="wof-minus" />
        </div>
      ))}
    </div>
  );
}

function BlurredGrid() {
  return (
    <div className="wof-grid is-behind">
      {ICON_HUES.slice(0, 8).map((hue, i) => (
        <div className="wof-cell" key={i}>
          <AppIcon hue={hue} />
        </div>
      ))}
    </div>
  );
}

function Widget({ dark }: { dark: boolean }) {
  return (
    <SmallWidget
      title="Summer break"
      countdown={SAMPLE_COUNTDOWN}
      targetDate={SAMPLE_TARGET}
      emoji="🏖️"
      emojiColor="#FF9F0A"
      appearanceMode={dark ? 'dark' : 'light'}
      countdownStyle="focus"
    />
  );
}

const PlusGlyph = ({ size = 22, width = 2.4 }: { size?: number; width?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth={width} strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth={width} strokeLinecap="round" />
  </svg>
);

/**
 * One illustration. Rendered at the fixed design size — wrap in <FrameFit> to
 * scale it into the available space.
 */
export function WidgetOnboardingFrame({ name }: { name: FrameName }) {
  const dark = useIsDark();

  switch (name) {
    // Touch and hold the Home Screen *background* (not an app icon).
    case '01-long-press':
      return (
        <div className="wof-phone">
          <JiggleGrid />
          <div className="wof-empty-spot">
            <div className="wof-touch" />
          </div>
          <Dock />
        </div>
      );

    // iOS 16–17: the widget gallery opens from a "+" at the top of the screen.
    case '02-tap-plus':
      return (
        <div className="wof-phone">
          <div className="wof-topbar">
            <div className="wof-pill is-round is-highlighted">
              <PlusGlyph />
            </div>
          </div>
          <JiggleGrid count={16} />
          <Dock />
        </div>
      );

    // iOS 18+: "Edit" at the top, then "Add Widget".
    case '02-tap-edit':
      return (
        <div className="wof-phone">
          <div className="wof-topbar">
            <div className="wof-pill is-highlighted">Edit</div>
            <div className="wof-menu">
              <div className="wof-menu-item is-on">Add Widget</div>
              <div className="wof-menu-item">Customise</div>
            </div>
          </div>
          <JiggleGrid count={16} />
          <Dock />
        </div>
      );

    case '03-search':
      return (
        <div className="wof-phone">
          <BlurredGrid />
          <div className="wof-sheet">
            <div className="wof-grabber" />
            <div className="wof-search">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span>{APP_NAME}</span>
              <i className="wof-caret" />
            </div>
            <div className="wof-result is-highlighted">
              <img src={APP_ICON} alt="" />
              <span>{APP_NAME}</span>
            </div>
            <div className="wof-result">
              <div className="wof-result-ghost" />
              <div className="wof-line" />
            </div>
            <div className="wof-result">
              <div className="wof-result-ghost" />
              <div className="wof-line is-short" />
            </div>
          </div>
        </div>
      );

    case '04-add-widget':
      return (
        <div className="wof-phone">
          <BlurredGrid />
          <div className="wof-sheet is-tall">
            <div className="wof-grabber" />
            <div className="wof-picker-app">
              <img src={APP_ICON} alt="" />
              <span>{APP_NAME}</span>
            </div>
            <div className="wof-picker-stage">
              <div className="wof-widget">
                <Widget dark={dark} />
              </div>
            </div>
            <div className="wof-dots">
              <i className="is-on" />
              <i />
              <i />
            </div>
            <div className="wof-cta">
              <PlusGlyph width={2.6} />
            </div>
          </div>
        </div>
      );

    case '05-done':
      return (
        <div className="wof-phone">
          <div className="wof-grid">
            <div className="wof-cell is-span2">
              <div className="wof-widget is-placed">
                <Widget dark={dark} />
              </div>
            </div>
            {ICON_HUES.slice(0, 16).map((hue, i) => (
              <div className="wof-cell" key={i}>
                <AppIcon hue={hue} />
              </div>
            ))}
          </div>
          <Dock />
        </div>
      );
  }
}

/**
 * Scales a fixed-size frame to fit its box. A plain transform keeps the frame's
 * internal proportions exact — laying it out in relative units instead would
 * drift on every screen size.
 */
export function FrameFit({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => {
      const { width, height } = box.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="wof-fit">
      <div style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
