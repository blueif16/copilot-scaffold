# Save Course Implementation Summary

## Overview
Implemented a complete save course flow that allows teachers to save their generated courses from the CourseBuilder chat interface to the database, with proper UI integration and status management.

## Components Implemented

### 1. API Endpoint: `/app/api/courses/route.ts`
**POST /api/courses** - Creates a new course record

**Request Body:**
```typescript
{
  title: string;
  description?: string;
  format: "lab" | "quiz" | "dialogue";
  files: Record<string, string>;  // JSONB
  conversationId?: string;
}
```

**Features:**
- Supabase authentication (401 if not authenticated)
- Validation for required fields and non-empty files
- Sets status to 'saved' by default
- Links to conversation via conversation_id
- Returns created course with 201 status

### 2. SaveDraftButton Component: `/components/teacher/SaveDraftButton.tsx`
**Redesigned UI** matching CourseBuilder's Claude-style design

**Props:**
```typescript
{
  conversationId: string | null;
  title: string;
  format: CourseFormat;
  files: Record<string, string>;
  onSaveSuccess?: (courseId: string) => void;
}
```

**States:**
- **Idle:** Save icon + "保存课程"
- **Loading:** Spinner + "保存中..." (disabled)
- **Success:** Checkmark + "已保存" (2s, then back to idle)
- **Error:** Red error message below button (3s)

**Validation:**
- Disables if title is empty or files object is empty
- Shows validation message: "请输入标题并生成课程内容"

### 3. CourseBuilder Integration: `/components/teacher/CourseBuilder.tsx`
**Location:** Chat view top bar (lines 991-1006)

**Integration:**
- SaveDraftButton appears before preview toggle button
- Only shows when `hasFiles` is true
- Uses `generateConversationTitle()` for course title
- Dispatches `course-builder:course-created` event on success

### 4. Teacher Layout Sidebar: `/app/teacher/layout.tsx`
**New Section:** "已保存课程" (Saved Courses)

**Features:**
- Fetches courses with `status='saved'` from database
- Shows format icons: 🧪 lab, 📝 quiz, 💬 dialogue
- Links to `/teacher/courses/${course.id}`
- Listens to `course-builder:course-created` event for auto-refresh
- Only visible when sidebar is expanded and courses exist
- Independent scrolling from conversation history

### 5. Courses Page Update: `/app/teacher/courses/page.tsx`
**Status System:** Changed from 2-state to 3-state

**Old:** `"draft" | "published"`
**New:** `"saved" | "pending-review" | "published"`

**Tab Labels:**
- 全部 (All)
- 已保存 (Saved)
- 待审核 (Pending Review)
- 已发布 (Published)

**Schema Updates:**
- Course interface now uses `files: Record<string, string>` (JSONB)
- Removed deprecated `simulation_jsx` column
- Preview card shows `files["/Simulation.js"]` or `files["/App.js"]`

**Status Badges:**
- Saved: Gray badge "已保存"
- Pending Review: Amber badge "待审核"
- Published: No badge (default state)

## Data Flow

```
CourseBuilder (chat)
  → User clicks "保存课程"
  → SaveDraftButton validates (title + files)
  → POST /api/courses
  → Database: courses table (status='saved')
  → Dispatch 'course-builder:course-created' event
  → Sidebar refreshes (shows in "已保存课程")
  → /teacher/courses page shows in "已保存" tab
```

## Database Schema

**courses table:**
```sql
- id: uuid (PK)
- teacher_id: uuid (FK to profiles)
- title: text
- description: text (nullable)
- format: text (CHECK: 'lab' | 'quiz' | 'dialogue')
- status: text (CHECK: 'saved' | 'pending-review' | 'published')
- files: jsonb (JSONB column)
- related_topics: text[] (array)
- conversation_id: uuid (nullable, FK to course_builder_conversations)
- created_at: timestamp
- updated_at: timestamp
```

## Event System

**Event:** `course-builder:course-created`
**Payload:** `{ detail: { id: courseId } }`

**Listeners:**
1. Teacher layout sidebar → refreshes saved courses list
2. (Future) Courses page → could refresh if on that page

## Testing

**Manual Test Flow:**
1. Open CourseBuilder: `/teacher/chat/new`
2. Select a format (lab/quiz/dialogue)
3. Generate course content via chat
4. Wait for files to be generated (preview opens automatically)
5. Click "保存课程" button in top bar
6. Verify success state: "已保存" (2 seconds)
7. Check sidebar: course appears in "已保存课程" section
8. Navigate to `/teacher/courses`
9. Verify course appears in "已保存" tab

**API Test:**
```bash
/tmp/test_courses_api.sh
# Expected: 401 Unauthorized (if not logged in)
# Expected: 201 Created (if authenticated with valid session)
```

## Next Steps (Future Enhancements)

1. **Edit Course:** Allow editing saved courses from `/teacher/courses/${id}`
2. **Status Transitions:** Implement "Submit for Review" (saved → pending-review)
3. **Publish Flow:** Implement promotion logic (pending-review → published)
4. **Thumbnail Generation:** Auto-generate course thumbnails from Sandpack preview
5. **Duplicate Course:** Allow teachers to duplicate existing courses
6. **Delete Course:** Add delete functionality with confirmation
7. **Course Preview:** Show full preview before saving
8. **Auto-save:** Periodically auto-save as draft while editing

## Files Modified

1. ✅ `/app/api/courses/route.ts` - Created
2. ✅ `/components/teacher/SaveDraftButton.tsx` - Redesigned
3. ✅ `/components/teacher/CourseBuilder.tsx` - Integrated button
4. ✅ `/app/teacher/layout.tsx` - Added saved courses section
5. ✅ `/app/teacher/courses/page.tsx` - Updated status system

## Migration Status

- ✅ Database schema updated (migration applied)
- ✅ TypeScript types updated
- ✅ API routes created
- ✅ UI components integrated
- ✅ Event system implemented
- ⏳ Promotion transformers (not yet implemented)
- ⏳ Old columns cleanup (simulation_jsx, interactions_json, companion_config)
