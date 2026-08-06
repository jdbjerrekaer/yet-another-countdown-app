/**
 * Preview / export page for the widget-onboarding illustrations.
 *
 * The frames themselves live in src/components/WidgetOnboardingFrames and are
 * rendered live inside the app — this page exists only to eyeball them side by
 * side, or to screenshot them for App Store material via capture.mjs.
 *
 * http://localhost:8080/marketing/widget-onboarding/?theme=dark
 */
import { createRoot } from 'react-dom/client';
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  WidgetOnboardingFrame,
  type FrameName,
} from '@/components/WidgetOnboardingFrames';
import i18n from '@/i18n';
import '@/styles/index.scss';

const params = new URLSearchParams(location.search);
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
await i18n.changeLanguage(params.get('lang') ?? 'en');

const FRAMES: FrameName[] = [
  '01-long-press',
  '02-tap-plus', // iOS 16–17
  '02-tap-edit', // iOS 18+
  '03-search',
  '04-add-widget',
  '05-done',
];

function App() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24 }}>
      {FRAMES.map((name) => (
        <div
          className="frame"
          data-frame={name}
          key={name}
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
        >
          <WidgetOnboardingFrame name={name} />
        </div>
      ))}
    </div>
  );
}

document.documentElement.classList.toggle('dark', theme === 'dark');
document.documentElement.classList.toggle('ion-palette-dark', theme === 'dark');
createRoot(document.getElementById('root')!).render(<App />);
