# Execution Plan: Sandpack Screenshot Thumbnails

**Goal:** Capture Sandpack preview screenshots and upload to Supabase Storage as course thumbnails

**Complexity:** Level 2 (Multi-component feature)

**Estimated Time:** ~115 minutes

---

## Task DAG

```
T1: Setup Supabase Storage bucket
    ├─→ T2: Create thumbnail upload API
    └─→ T3: Implement screenshot capture utility
         └─→ T4: Integrate into save flow
              └─→ T5: Update courses API
                   └─→ T6: End-to-end testing
```

---

## Tasks

### T1: Setup Supabase Storage bucket (15 min)
**Dependencies:** None
**Blocks:** T2, T3

Create migration to setup 'course-thumbnails' storage bucket with RLS policies allowing teachers to upload their own thumbnails.

**Deliverables:**
- New migration file in `supabase/migrations/`
- Bucket created with public read access
- RLS policies for teacher uploads

---

### T2: Create thumbnail upload API endpoint (20 min)
**Dependencies:** T1
**Blocks:** T4

Create POST /api/courses/thumbnail endpoint that accepts base64 image, uploads to Supabase Storage, returns public URL.

**Deliverables:**
- `app/api/courses/thumbnail/route.ts`
- Accepts `{ image: string }` (base64 data URL)
- Returns `{ url: string }`
- Error handling for upload failures

---

### T3: Implement screenshot capture utility (25 min)
**Dependencies:** T1
**Blocks:** T4

Create utility function to capture screenshot from Sandpack preview iframe using html2canvas or native browser APIs, return base64 data URL.

**Deliverables:**
- `lib/utils/screenshot.ts`
- Function: `capturePreviewScreenshot(iframeRef: RefObject<HTMLIFrameElement>): Promise<string>`
- Handles iframe not ready state
- Returns compressed JPEG data URL

---

### T4: Integrate screenshot capture into save flow (30 min)
**Dependencies:** T2, T3
**Blocks:** T5

Modify SaveDraftButton to: 1) capture screenshot from SandpackEditor preview, 2) upload via thumbnail API, 3) include thumbnail_url in course save payload.

**Deliverables:**
- Updated `SaveDraftButton.tsx`
- Updated `SandpackEditor.tsx` (expose preview ref)
- Screenshot captured before save
- Upload happens during save loading state
- Graceful fallback if screenshot fails

---

### T5: Update courses API to accept thumbnail_url (10 min)
**Dependencies:** T4
**Blocks:** T6

Modify POST /api/courses to accept optional thumbnail_url field and save to courses.thumbnail_url column.

**Deliverables:**
- Updated `app/api/courses/route.ts`
- Accept `thumbnail_url?: string` in request body
- Save to `courses.thumbnail_url` column

---

### T6: End-to-end testing (15 min)
**Dependencies:** T5
**Blocks:** None

Manual verification: create course, verify screenshot captured, uploaded to storage, URL saved to DB, thumbnail displays in course list.

**Test Cases:**
- Create new lab course → verify thumbnail
- Create quiz course → verify thumbnail
- Create dialogue course → verify thumbnail
- Verify thumbnail displays in sidebar
- Verify thumbnail accessible via public URL

---

## Context Files

- `.godag/context/codebase-scan.md` - Current implementation details
- `CLAUDE.md` - Project-specific instructions (Docker, migrations, testing)

---

## Notes

- Dashboard server not available (skipped)
- Browser testing required for T6
- Supabase Storage bucket must be created before API work
- Screenshot capture may require CORS handling for iframe access
