# Haptic Feedback Guidelines

This document defines when to use each haptic feedback level to ensure consistent user experience across the application.

## Overview

Haptic feedback provides tactile confirmation for user interactions. The intensity should match the importance and permanence of the action.

## Haptic Levels

### **Light** (`trigger('light')`)

Use for subtle, frequent interactions that provide gentle confirmation without being intrusive.

**When to use:**
- **Simple selections**: Card taps, item selections, checkbox toggles
- **Navigation**: Opening/closing modals, navigating between views
- **Minor actions**: Emoji selection, filter toggles, cancel buttons
- **Progressive feedback**: During drag/swipe operations when threshold is reached
- **Non-destructive cancellations**: Dialog cancel, form cancel

**Examples:**
- Tapping a countdown card to select it
- Closing a modal
- Selecting an emoji
- Toggling a calendar filter
- Canceling a dialog

### **Medium** (`trigger('medium')`)

Use for significant actions that commit changes or initiate important flows. This is the default for most primary actions.

**When to use:**
- **Edit actions**: Opening edit modal, editing items
- **Save/commit actions**: Saving events, confirming changes, importing data
- **Primary actions**: FAB clicks, primary button presses
- **Drag operations**: Starting to drag/reorder items
- **Date/time changes**: Selecting dates in picker, changing time values
- **Wheel picker**: Clicking items or confirming selection

**Examples:**
- Clicking the FAB to create a new event
- Saving an event (create or edit)
- Starting to drag a card for reordering
- Changing the date in a date picker
- Confirming a wheel picker selection
- Importing calendar events

### **Heavy** (`trigger('heavy')`)

Use sparingly for destructive or irreversible actions. This should feel significant and make the user aware of the gravity of the action.

**When to use:**
- **Delete confirmations**: Only when deletion is confirmed and executed
- **Critical warnings**: Actions that permanently remove data

**Examples:**
- Confirming deletion of an event
- Executing a swipe-to-delete action

## Best Practices

1. **Consistency**: Similar actions should use the same haptic level across the app
2. **Progression**: Use light → medium → heavy for progressive interactions (e.g., swipe threshold → confirm → execute)
3. **Frequency**: Light haptics can be frequent, heavy haptics should be rare
4. **Context**: Consider the user's mental model - destructive actions should feel heavier
5. **Feedback timing**: Trigger haptics immediately when the action occurs, not before

## Implementation Notes

- All haptic triggers use the `useHaptic` hook: `const { trigger } = useHaptic();`
- The hook automatically handles platform differences (native vs web)
- On web, haptics fall back to `navigator.vibrate` with appropriate durations
- Always add inline comments explaining why a specific level was chosen

## Code Example

```typescript
const { trigger } = useHaptic();

// Light: Simple selection
const handleSelect = () => {
  trigger('light'); // Simple selection - gentle confirmation
  onSelect();
};

// Medium: Significant action
const handleSave = () => {
  trigger('medium'); // Save action - commits changes
  onSave();
};

// Heavy: Destructive action
const handleDelete = () => {
  trigger('heavy'); // Delete confirmation - destructive action
  onDelete();
};
```
