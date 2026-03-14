# Codebase Scan Results

## Current Implementation

### Sandpack Preview
- **File:** `components/teacher/SandpackEditor.tsx`
- Uses `@codesandbox/sandpack-react` with `SandpackPreview` component
- Preview mode toggles visibility (not unmount) to preserve state
- Preview iframe renders React app from files

### Save Flow
- **File:** `components/teacher/SaveDraftButton.tsx`
- POSTs to `/api/courses` with `{ title, format, files, conversationId }`
- Returns `courseId` on success
- Shows 3-state UI: idle → loading → success

### Database Schema
- `courses.thumbnail_url` column already exists (text, nullable)
- No Supabase Storage buckets configured yet
- Files stored as JSONB in PostgreSQL

### API Routes
- `POST /api/courses` - Save course (app/api/courses/route.ts)
- Uses `createSupabaseServer()` for auth

## Key Constraints

1. Screenshot must be captured from Sandpack preview iframe
2. Must upload to Supabase Storage (not base64 in DB)
3. Must integrate with existing save flow (no UX changes)
4. Must handle preview not ready state
5. Must respect RLS policies (teacher-owned thumbnails)
