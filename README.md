# Yet Another Countdown App

A beautiful, feature-rich countdown timer application built with React and Ionic. Create and manage multiple countdown timers with support for recurring events, widget previews, and native iOS features.

## Features

- **Multiple Countdown Timers** - Create and manage unlimited countdown events
- **Count Up & Down** - Select future dates to count down, or past dates to count up (days since)
- **Recurring Events** - Set up yearly recurring countdowns (birthdays, anniversaries, etc.)
- **Drag-and-Drop Sorting** - Reorder your countdowns with intuitive drag-and-drop
- **Widget Previews** - Preview your countdowns in four different widget sizes:
  - Small
  - Medium
  - Large
  - Extra Large
- **iOS Native Features**:
  - Haptic feedback for better user interaction
  - Native action sheets and dialogs
  - Notification support
  - iOS-style UI components
- **Local Storage** - All countdowns are automatically saved locally
- **Mobile-First Design** - Responsive design optimized for mobile devices
- **Beautiful UI** - Modern, iOS-inspired interface with smooth animations

## Tech Stack

### Frontend

- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server

### UI Framework & Styling

- **Ionic React** - Mobile-first UI components
- **shadcn-ui** - High-quality React components
- **Tailwind CSS** - Utility-first CSS framework

### Mobile

- **Capacitor** - Native runtime for iOS (and Android-ready)

### Libraries & Tools

- **@dnd-kit** - Drag and drop functionality
- **date-fns** - Date manipulation and formatting
- **react-hook-form** - Form state management
- **zod** - Schema validation
- **@tanstack/react-query** - Data fetching and caching

## Prerequisites

- **Node.js** (v18 or higher) and npm - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Bun** (optional) - Alternative package manager, detected via `bun.lockb`
- **Xcode** (for iOS development) - Required for building and running on iOS devices/simulators

## Installation & Setup

1. **Clone the repository**

   ```bash
   git clone <YOUR_GIT_URL>
   cd yet-another-countdown-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`

## Development

### Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

### Development Server

The development server runs on port `8080` by default (configured in `vite.config.ts`). The server supports hot module replacement (HMR) for instant updates during development.

## iOS Development

This app uses Capacitor to provide native iOS functionality. To work with the iOS app:

### Sync Web Assets to iOS

After making changes to the web app, sync them to the iOS project:

```bash
npx cap sync ios
```

### Open in Xcode

```bash
npx cap open ios
```

This will open the iOS project in Xcode, where you can:

- Build and run on iOS simulators
- Build and run on physical iOS devices
- Configure app settings and capabilities

### Native Plugins Used

- **@capacitor/dialog** - Native dialog boxes
- **@capacitor/action-sheet** - Native action sheets
- **@capacitor/haptics** - Haptic feedback
- **@capacitor/keyboard** - Keyboard management
- **@capacitor/splash-screen** - Splash screen control
- **@capacitor/status-bar** - Status bar styling

### App Configuration

- **App ID**: `com.countdown.app`
- **App Name**: `Countdown`
- **Web Directory**: `dist` (built output)

## Project Structure

```text
yet-another-countdown-app/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn-ui components
│   │   └── widgets/        # Widget preview components
│   ├── pages/              # Page components
│   │   └── Index.tsx       # Main countdown page
│   ├── hooks/              # Custom React hooks
│   │   ├── useCountdown.ts # Countdown timer logic
│   │   └── useHaptic.ts    # Haptic feedback hook
│   ├── lib/                # Utility functions
│   │   ├── recurring.ts   # Recurring date calculations
│   │   └── notifications.ts # Notification helpers
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Root component
│   └── main.tsx            # Application entry point
├── ios/                    # iOS native project
├── public/                 # Static assets
├── capacitor.config.ts     # Capacitor configuration
├── vite.config.ts          # Vite configuration
└── tailwind.config.ts      # Tailwind CSS configuration
```

## Usage

### Creating a Countdown

1. Tap the **+** button in the top right corner
2. Enter a title for your countdown
3. Select a target date using the date picker
4. Choose an emoji to represent your event
5. Optionally enable "Recurring" for yearly events (e.g., birthdays)
6. Tap "Save" to create the countdown

### Editing a Countdown

1. Tap on a countdown card to select it
2. Tap the edit button (pencil icon) on the card
3. Modify the title, date, emoji, or recurring setting
4. Tap "Save" to update

### Deleting a Countdown

1. Tap the edit button on a countdown card
2. Tap the "Delete" button in the edit modal
3. Confirm the deletion

### Reordering Countdowns

1. Long-press (hold for ~300ms) on a countdown card
2. Drag it to the desired position
3. Release to drop it in the new position

### Widget Preview

1. Select a countdown by tapping on its card
2. Choose a widget size (Small, Medium, Large, or Extra Large)
3. View the preview below to see how it will appear as a widget

### Recurring Events

When you enable "Recurring" for a countdown:

- The countdown automatically resets each year on the same date
- Perfect for birthdays, anniversaries, holidays, and other yearly events
- The app calculates the next occurrence automatically

## Deployment

### GitHub Pages Deployment

This repository is configured for automatic deployment to GitHub Pages using GitHub Actions.

#### Setup Instructions

1. **Enable GitHub Pages in your repository settings:**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Save the settings

2. **Push to the main branch:**
   - The GitHub Actions workflow will automatically build and deploy your app
   - The workflow triggers on pushes to the `main` branch
   - You can also manually trigger it from the **Actions** tab

3. **Access your deployed app:**
   - Your app will be available at: `https://<username>.github.io/<repository-name>/`
   - The deployment URL will be shown in the GitHub Actions workflow output

#### Manual Deployment

If you prefer to deploy manually:

1. **Build the production bundle**

   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to GitHub Pages:
   - Use the `gh-pages` branch method, or
   - Use GitHub Actions manually from the Actions tab

### Other Web Deployment Options

The app can also be deployed to other static hosting services:

1. **Build the production bundle**

   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting service:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Any static hosting provider

### iOS App Store Deployment

To deploy to the iOS App Store:

1. Build the web app: `npm run build`
2. Sync to iOS: `npx cap sync ios`
3. Open in Xcode: `npx cap open ios`
4. Follow Apple's App Store submission process:
   - Configure app metadata and screenshots
   - Archive the app
   - Submit through App Store Connect

## License

This project is private and proprietary.

## Contributing

This is a private project. For questions or issues, please contact the repository owner.
