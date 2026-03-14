# Screenshot Capture Not Working - Fix Needed

## Problem
The screenshot capture is still not working correctly. When saving a course, the thumbnail should capture what the user sees in the Sandpack preview, but it's not capturing the actual content.

## Current Implementation

**File:** `components/teacher/SandpackEditor.tsx`
- Lines 89-109: Screenshot capture callback using `sandpackContainerRef`
- Line 153: Ref attached to Sandpack container div
- Uses `lib/utils/screenshot.ts` with html2canvas

**File:** `lib/utils/screenshot.ts`
- Uses html2canvas to capture the element
- Compresses to JPEG with 800x600 max dimensions

**File:** `components/teacher/SaveDraftButton.tsx`
- Lines 48-75: Calls `onCaptureScreenshot()` callback
- Lines 56-69: Uploads screenshot to `/api/courses/thumbnail`

**File:** `app/api/courses/thumbnail/route.ts`
- Validates and uploads image to Supabase storage `course-thumbnails` bucket

## Root Cause
html2canvas **cannot capture iframe content** due to browser same-origin policy. Sandpack renders the preview in a sandboxed iframe, so we're only capturing the container div, not the actual rendered preview.

## What Needs to Be Fixed

You need to implement ONE of these solutions:

### Option 1: Server-Side Screenshot (Best Quality)
Add Playwright to the backend to render and capture:
1. Install: `npm install playwright`
2. Create endpoint: `/api/courses/screenshot-server`
3. Accept HTML content, render with Playwright, return screenshot
4. Modify `SaveDraftButton.tsx` to send HTML content instead of capturing client-side

### Option 2: Capture Code Editor View (Quick Fix)
Instead of capturing the preview iframe, capture the code editor which is NOT in an iframe:
1. In `SandpackEditor.tsx`, switch to code view before capturing
2. Capture the code editor container
3. Switch back to preview view after capture

### Option 3: Use External Screenshot Service
Use a service like Microlink or ScreenshotAPI:
1. Get the Sandpack preview URL or deploy to CodeSandbox
2. Send URL to screenshot service
3. Download and upload the result

## Files to Modify

1. **`components/teacher/SandpackEditor.tsx`** - Change what element is captured
2. **`lib/utils/screenshot.ts`** - Change capture method or add server-side option
3. **`components/teacher/SaveDraftButton.tsx`** - Update capture flow
4. **`app/api/courses/screenshot/route.ts`** - Implement server-side capture if using Option 1

## Testing
After implementing, test by:
1. Creating a course with Sandpack preview
2. Clicking "保存课程" (Save Course)
3. Check if thumbnail shows the actual preview content
4. Verify thumbnail uploads to Supabase storage

## References
- `docs/screenshot-capture-issue.md` - Full explanation of the problem
- Sandpack iframe renders at: `SandpackPreview` component (line 182-185)
- Current capture ref: `sandpackContainerRef` (line 90)
