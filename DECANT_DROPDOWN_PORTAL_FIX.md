# Decant Dropdown Portal Fix

## Problem
The decant dropdown was appearing behind other product cards/images even with high z-index values. This was because parent containers (product cards and grid) were creating new stacking contexts, preventing z-index from working across card boundaries.

## Solution
Implemented React Portal to render the dropdown menu outside the product card DOM hierarchy, directly into `document.body`. This ensures the dropdown always appears above all other elements regardless of stacking contexts.

## Changes Made

### 1. Added React Portal Import
```typescript
import { createPortal } from "react-dom";
```

### 2. Created DecantDropdown Component
- New component that manages dropdown positioning and rendering
- Uses `useRef` to track trigger button and menu positions
- Calculates absolute position using `getBoundingClientRect()`
- Renders dropdown menu via Portal into `document.body`
- Handles click outside to close
- Updates position on scroll/resize when open

### 3. Updated State Management
Changed from storing string labels to storing full decant objects:
```typescript
// Before
const [selectedDecants, setSelectedDecants] = useState<Record<number, string>>({});

// After
const [selectedDecants, setSelectedDecants] = useState<Record<number, { label: string; price: number }>>({});
```

### 4. Simplified Product Card
- Removed complex z-index management (`z-[999]` when open)
- Removed `overflow-visible` from card wrapper
- Restored `overflow-hidden` on card for clean design
- No longer needs dynamic z-index based on dropdown state

### 5. Portal Dropdown Features
- **Fixed positioning**: Dropdown uses `position: fixed` with calculated coordinates
- **SSR safe**: Uses `mounted` state to prevent hydration issues
- **Responsive**: Updates position on scroll and window resize
- **Click outside**: Closes when clicking outside trigger or menu
- **Same design**: Maintains exact same visual appearance
- **z-index**: Uses `z-[999999]` to ensure it's always on top

## How It Works

1. User clicks "Select decant size" button
2. `updatePosition()` calculates button's screen position
3. Dropdown state opens
4. Portal renders menu at calculated position in `document.body`
5. Menu appears directly under the button, above all cards
6. Selecting an option updates state and closes dropdown
7. Price display updates based on selected decant

## Benefits

✅ Dropdown always appears above all product cards/images
✅ No z-index conflicts or stacking context issues
✅ Maintains same visual design and user experience
✅ Handles scroll and resize gracefully
✅ Click outside to close works properly
✅ SSR compatible with mounted check
✅ Cleaner product card code (no complex z-index logic)

## Files Modified
- `gosh-main/components/ProductSection.tsx`

## Testing Checklist
- [x] Dropdown opens when clicking "Select decant size"
- [x] Dropdown appears directly under the button
- [x] Dropdown appears above all other product cards
- [x] Other product images don't cover the dropdown
- [x] Selecting a decant updates the button text
- [x] Selecting a decant updates the price display
- [x] Add to Bag validates decant selection
- [x] Add to Bag uses selected decant price
- [x] Click outside closes the dropdown
- [x] Only one dropdown opens at a time
- [x] Dropdown repositions on scroll
- [x] Dropdown repositions on window resize
- [x] No TypeScript errors
