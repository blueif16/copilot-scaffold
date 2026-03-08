# Slice 9 — Teacher Dashboard Shell
Branch: worktree-imperative-baking-cupcake | Level: 1 | Type: implement | Status: complete
Started: 2026-03-07T00:00:00Z
Completed: 2026-03-07T00:00:00Z

## Tasks

### T1: Refine teacher layout and create components
- Scope: app/(teacher)/layout.tsx, components/teacher/
- Verify: `npm run build 2>&1 | tail -10`
- Status: done ✅

**Deliverables:**
- ✅ Refine `app/(teacher)/layout.tsx` with TeacherNav component
- ✅ Create `components/teacher/TeacherNav.tsx` — Sidebar with Dashboard, Create, Settings links
- ✅ Create `components/teacher/CourseCard.tsx` — Card showing course title, format badge, status
- ✅ Update `app/(teacher)/dashboard/page.tsx` — Wire "Create New Course" button to `/teacher/courses/new`
- ✅ Apply teacher design language (thinner borders, muted palette, shadow-sm)
- ✅ Fix TypeScript errors in auth callback, server client, and middleware

**Acceptance:**
- ✅ Teacher logs in → sees dashboard with empty state
- ✅ "Create New Course" button navigates to `/teacher/courses/new`
- ✅ Teacher nav sidebar works
- ✅ Visual style is clearly "professional sibling" of student UI
- ✅ TypeScript compilation passes

## Summary
Completed: 1/1 | Duration: ~15min
Files changed:
- app/(teacher)/layout.tsx
- app/(teacher)/dashboard/page.tsx
- components/teacher/TeacherNav.tsx (new)
- components/teacher/CourseCard.tsx (new)
- app/api/auth/callback/route.ts (TypeScript fix)
- lib/supabase/server.ts (TypeScript fix)
- middleware.ts (TypeScript fix)

Commit: bb4b32e
