# Architecture v3 — End-to-End Testing Plan

**Date:** 2026-03-07
**Status:** 🟡 Ready for Testing
**Implementation:** ✅ 100% Complete

---

## Executive Summary

All 6 arch-v3 components are implemented. This plan verifies the complete student and teacher flows work end-to-end, including Letta memory persistence, course builder, and session tracking.

---

## Prerequisites

### Environment Setup

```bash
# 1. Backend services running
cd /Users/tk/Desktop/Omniscience
source venv/bin/activate
python agent/main.py  # Should start on port 8123

# 2. Frontend running
npm run dev  # Should start on port 3000

# 3. Letta service running
# Check if Letta is accessible
curl http://localhost:8283/v1/health

# 4. Supabase local or cloud
# Verify connection
psql $DATABASE_URL -c "SELECT 1;"

# 5. Environment variables set
echo $NEXT_PUBLIC_BACKEND_URL  # Should be http://localhost:8123
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Database State

```sql
-- Clear test data (optional, for clean slate)
DELETE FROM student_progress WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE 'test-%');
DELETE FROM courses WHERE teacher_id IN (SELECT id FROM profiles WHERE email LIKE 'test-%');
DELETE FROM profiles WHERE email LIKE 'test-%';
DELETE FROM auth.users WHERE email LIKE 'test-%';
```

---

## Test Suite 1: Student Flow (Memory Persistence)

### T1.1: Student Signup + Agent Creation

**Objective:** Verify Letta agent is created automatically on student signup

**Steps:**
1. Navigate to `http://localhost:3000/signup`
2. Fill form:
   - Email: `test-student-001@example.com`
   - Password: `TestPass123!`
   - Role: Student
3. Click "Sign Up"
4. Wait for redirect to `/student`

**Verification:**
```sql
-- Check profile created with letta_agent_id
SELECT id, email, role, letta_agent_id
FROM profiles
WHERE email = 'test-student-001@example.com';

-- Should return: role='student', letta_agent_id IS NOT NULL
```

```bash
# Check Letta agent exists
AGENT_ID="<letta_agent_id from query above>"
curl http://localhost:8283/v1/agents/$AGENT_ID
# Should return agent details with student memory blocks
```

**Expected Result:**
- ✅ Profile created with `role='student'`
- ✅ `letta_agent_id` is populated (not NULL)
- ✅ Letta agent exists with initial memory blocks (student_profile, learning_style, knowledge_state, interests)

**Failure Modes:**
- ❌ `letta_agent_id` is NULL → Signup didn't call `/api/students/{user_id}/create-memory-agent`
- ❌ Letta agent doesn't exist → Backend endpoint failed silently
- ❌ Memory blocks empty → Letta agent creation didn't initialize memory

---

### T1.2: Student Session Tracking

**Objective:** Verify session end handler updates Letta memory

**Steps:**
1. Login as `test-student-001@example.com`
2. Navigate to `/student/topics/changing-states`
3. Interact with simulation for 2+ minutes:
   - Add particles
   - Change temperature
   - Trigger phase transitions
4. Navigate away or close tab

**Verification:**
```bash
# Check backend logs for session end call
tail -f agent/logs/app.log | grep "session.*end"
# Should see: POST /api/sessions/{user_id}/end

# Check Letta memory updated
AGENT_ID="<from T1.1>"
curl http://localhost:8283/v1/agents/$AGENT_ID/memory
# Should see updated knowledge_state mentioning "changing states" or "phase transitions"
```

```sql
-- Check student_progress table
SELECT * FROM student_progress
WHERE user_id = (SELECT id FROM profiles WHERE email = 'test-student-001@example.com');
-- Should have entry with topic='changing-states', progress_data updated
```

**Expected Result:**
- ✅ Session end API called with topic, duration_minutes, session_summary
- ✅ Letta memory updated with session context
- ✅ `student_progress` table has new entry

**Failure Modes:**
- ❌ No session end call → `TopicPageLayout.tsx` unmount handler not firing
- ❌ Memory not updated → Backend endpoint failed or Letta unreachable
- ❌ Duration < 1 minute → Session too short, correctly skipped

---

### T1.3: Student Profile Memory Display

**Objective:** Verify profile page displays Letta memory

**Steps:**
1. Still logged in as `test-student-001@example.com`
2. Navigate to `/student/profile`
3. Observe memory sections

**Verification:**
```bash
# Check frontend calls memory endpoint
# Open browser DevTools → Network tab
# Should see: GET /api/students/{user_id}/memory with 200 response
```

**Expected Result:**
- ✅ Profile page loads without errors
- ✅ Memory sections display:
  - Student Profile (name, age, grade level)
  - Learning Style (visual/auditory/kinesthetic preferences)
  - Knowledge State (topics covered, misconceptions)
  - Interests (science topics, hobbies)
- ✅ Content reflects session from T1.2 (mentions "changing states" or similar)

**Failure Modes:**
- ❌ 404 error → GET endpoint not registered or router prefix wrong
- ❌ 403 error → Auth token invalid or user_id mismatch
- ❌ Empty memory → Letta agent has no memory blocks (check T1.1)
- ❌ Stale memory → Session end didn't update (check T1.2)

---

## Test Suite 2: Teacher Flow (Course Builder)

### T2.1: Teacher Signup

**Objective:** Verify teacher signup and dashboard access

**Steps:**
1. Logout (if logged in)
2. Navigate to `http://localhost:3000/signup`
3. Fill form:
   - Email: `test-teacher-001@example.com`
   - Password: `TeachPass123!`
   - Role: Teacher
4. Click "Sign Up"
5. Wait for redirect to `/teacher/chat/new`

**Verification:**
```sql
-- Check profile created with teacher role
SELECT id, email, role, letta_agent_id
FROM profiles
WHERE email = 'test-teacher-001@example.com';

-- Should return: role='teacher', letta_agent_id IS NULL (teachers don't get Letta agents)
```

**Expected Result:**
- ✅ Profile created with `role='teacher'`
- ✅ `letta_agent_id` is NULL (teachers don't need memory agents)
- ✅ Redirected to `/teacher/chat/new` (default route for teachers)
- ✅ Course builder landing page shows format options

**Failure Modes:**
- ❌ Redirected to `/student` → Middleware role routing broken
- ❌ `letta_agent_id` populated → Signup incorrectly created agent for teacher

---

### T2.2: Course Builder — Create Lab Simulation

**Objective:** Verify Gemini agent generates working Lab simulation

**Steps:**
1. Logged in as `test-teacher-001@example.com`
2. Click "Create New Course" on dashboard
3. Navigate to `/teacher/courses/new`
4. In chat interface, type:
   ```
   Create a lab simulation about photosynthesis.
   Students should be able to adjust light intensity and CO2 levels,
   and see the rate of oxygen production change in real-time.
   ```
5. Wait for agent to generate code
6. Observe live preview appears
7. Interact with preview (adjust sliders, observe changes)
8. Click "Save Draft"

**Verification:**
```bash
# Check backend logs for course builder agent calls
tail -f agent/logs/app.log | grep "course_builder"
# Should see: LangGraph ReAct agent invocations, write_file/update_file tool calls

# Check Sandpack files generated
# In browser DevTools → Console, check for Sandpack file structure
```

```sql
-- Check course saved to database
SELECT id, title, format, status, simulation_jsx, interactions_json
FROM courses
WHERE teacher_id = (SELECT id FROM profiles WHERE email = 'test-teacher-001@example.com');

-- Should return: format='lab', status='draft', simulation_jsx IS NOT NULL
```

**Expected Result:**
- ✅ Agent generates React component with:
  - Interactive controls (sliders for light/CO2)
  - Visual feedback (oxygen production rate display)
  - `onEvent` emissions for companion reactions
- ✅ Live preview renders without errors
- ✅ Draft saved with `simulation_jsx` populated
- ✅ `interactions.json` extracted and saved (if agent generated it)

**Failure Modes:**
- ❌ Agent doesn't respond → Backend unreachable or Gemini API key invalid
- ❌ Preview shows errors → Generated code has syntax errors
- ❌ Save fails → `SaveDraftButton` file extraction broken
- ❌ `interactions_json` NULL → File not generated or extraction failed

---

### T2.3: Course Builder — Iterate on Design

**Objective:** Verify agent can update existing code

**Steps:**
1. Still in course builder from T2.2
2. In chat, type:
   ```
   Add a graph that shows oxygen production over time.
   Use a line chart with the last 20 data points.
   ```
3. Wait for agent to update code
4. Observe preview updates with new graph
5. Click "Save Draft" again

**Verification:**
```sql
-- Check simulation_jsx updated
SELECT simulation_jsx
FROM courses
WHERE teacher_id = (SELECT id FROM profiles WHERE email = 'test-teacher-001@example.com')
ORDER BY updated_at DESC
LIMIT 1;

-- Should contain: chart/graph component code
```

**Expected Result:**
- ✅ Agent uses `update_file` tool (not `write_file`)
- ✅ Preview updates without full reload
- ✅ Graph appears in preview
- ✅ Draft saved with updated code

**Failure Modes:**
- ❌ Agent rewrites entire file → Should use `update_file` for incremental changes
- ❌ Preview breaks → Update introduced syntax errors
- ❌ Graph doesn't render → Missing chart library or incorrect implementation

---

### T2.4: Teacher Dashboard — Course List

**Objective:** Verify courses page displays saved courses

**Steps:**
1. Navigate back to `/teacher/courses`
2. Observe course list

**Verification:**
```sql
-- Verify courses exist
SELECT id, title, format, status, created_at
FROM courses
WHERE teacher_id = (SELECT id FROM profiles WHERE email = 'test-teacher-001@example.com')
ORDER BY created_at DESC;
```

**Expected Result:**
- ✅ Courses page shows course from T2.2/T2.3
- ✅ Course card displays:
  - Title (or "Untitled Course" if no title set)
  - Format badge ("Lab")
  - Status badge ("Draft")
  - Created date
- ✅ Click course card navigates to edit page

**Failure Modes:**
- ❌ Empty state shown → Dashboard fetch query broken or teacher_id mismatch
- ❌ Course missing → Database insert failed in T2.2

---

## Test Suite 3: Integration Tests

### T3.1: Student Uses Teacher-Created Course

**Objective:** Verify end-to-end flow from course creation to student usage

**Steps:**
1. As teacher (`test-teacher-001@example.com`), publish the photosynthesis course:
   - Edit course, change status to "published"
2. Logout, login as student (`test-student-001@example.com`)
3. Navigate to student home
4. Verify photosynthesis course appears in topic carousel
5. Click course, interact with simulation
6. Navigate away after 2+ minutes

**Verification:**
```sql
-- Check course published
SELECT status FROM courses WHERE title LIKE '%photosynthesis%';
-- Should return: status='published'

-- Check student session recorded
SELECT * FROM student_progress
WHERE user_id = (SELECT id FROM profiles WHERE email = 'test-student-001@example.com')
AND topic LIKE '%photosynthesis%';
```

**Expected Result:**
- ✅ Published course visible to students
- ✅ Simulation works identically to preview
- ✅ Session end updates memory with photosynthesis context
- ✅ Companion reacts to simulation events

**Failure Modes:**
- ❌ Course not visible → RLS policy blocking student reads
- ❌ Simulation broken → Code works in preview but not in production (env issue)
- ❌ Session not tracked → Topic page doesn't use `TopicPageLayout`

---

### T3.2: Memory Persistence Across Sessions

**Objective:** Verify Letta memory accumulates over multiple sessions

**Steps:**
1. As student (`test-student-001@example.com`), complete 3 sessions:
   - Session 1: Changing States (2 min)
   - Session 2: Electric Circuits (3 min)
   - Session 3: Photosynthesis (2 min)
2. After each session, check profile page memory

**Verification:**
```bash
# After each session, fetch memory
AGENT_ID="<from T1.1>"
curl http://localhost:8283/v1/agents/$AGENT_ID/memory | jq '.knowledge_state'

# Should see cumulative updates:
# After session 1: mentions "phase transitions"
# After session 2: mentions "circuits" + "phase transitions"
# After session 3: mentions "photosynthesis" + "circuits" + "phase transitions"
```

**Expected Result:**
- ✅ Memory grows with each session
- ✅ Letta identifies patterns (e.g., "student prefers hands-on simulations")
- ✅ No memory loss between sessions

**Failure Modes:**
- ❌ Memory resets → Letta agent recreated instead of updated
- ❌ Only latest session → Previous memory overwritten instead of appended

---

## Test Suite 4: Error Handling & Edge Cases

### T4.1: Signup Without Letta Service

**Objective:** Verify graceful degradation when Letta unavailable

**Steps:**
1. Stop Letta service: `pkill -f letta`
2. Signup new student: `test-student-002@example.com`
3. Observe behavior

**Verification:**
```sql
-- Check profile created despite Letta failure
SELECT id, email, letta_agent_id
FROM profiles
WHERE email = 'test-student-002@example.com';

-- Should return: letta_agent_id IS NULL (agent creation failed but signup succeeded)
```

**Expected Result:**
- ✅ Signup completes successfully
- ✅ Profile created with `letta_agent_id = NULL`
- ✅ No error shown to user (fire-and-forget design)
- ✅ Backend logs error but doesn't crash

**Failure Modes:**
- ❌ Signup fails → Should be fire-and-forget, not blocking
- ❌ Frontend shows error → Should be silent failure

---

### T4.2: Session End Without Memory Agent

**Objective:** Verify session tracking works even without Letta agent

**Steps:**
1. Login as `test-student-002@example.com` (no Letta agent from T4.1)
2. Complete a session on Changing States (2+ min)
3. Navigate away

**Verification:**
```bash
# Check backend logs
tail -f agent/logs/app.log | grep "session.*end"
# Should see: POST /api/sessions/{user_id}/end with success=True, memory_updated=False
```

**Expected Result:**
- ✅ Session end API called
- ✅ Response: `{"success": true, "memory_updated": false}`
- ✅ No error thrown
- ✅ Student can continue using app

**Failure Modes:**
- ❌ 500 error → Backend should handle missing agent gracefully
- ❌ Frontend shows error → Should be silent

---

### T4.3: Profile Page Without Memory Agent

**Objective:** Verify profile page handles missing Letta agent

**Steps:**
1. Still logged in as `test-student-002@example.com`
2. Navigate to `/student/profile`

**Verification:**
```bash
# Check API response
curl -H "Authorization: Bearer <token>" \
  http://localhost:8123/api/students/<user_id>/memory
# Should return: 404 with "No memory agent found"
```

**Expected Result:**
- ✅ Profile page loads without crashing
- ✅ Memory sections show empty state or "Memory not available"
- ✅ No console errors

**Failure Modes:**
- ❌ Page crashes → Frontend should handle 404 gracefully
- ❌ Infinite loading → Frontend doesn't handle error response

---

### T4.4: Course Builder Without Gemini API Key

**Objective:** Verify error handling when Gemini unavailable

**Steps:**
1. Temporarily unset Gemini API key: `unset GEMINI_API_KEY`
2. Restart backend
3. As teacher, try to create course
4. Type message in chat

**Verification:**
```bash
# Check backend logs
tail -f agent/logs/app.log | grep "gemini\|course_builder"
# Should see: API key error or authentication failure
```

**Expected Result:**
- ✅ Agent returns error message to chat
- ✅ Error is user-friendly (not raw stack trace)
- ✅ Backend doesn't crash

**Failure Modes:**
- ❌ Silent failure → User sees no response
- ❌ Backend crashes → Should catch exception

---

## Test Suite 5: Performance & Load

### T5.1: Concurrent Student Sessions

**Objective:** Verify backend handles multiple simultaneous sessions

**Steps:**
1. Create 5 test students: `test-student-003` through `test-student-007`
2. Simulate 5 concurrent sessions (use Playwright or similar):
   ```bash
   for i in {3..7}; do
     node test-session.js "test-student-00$i@example.com" &
   done
   ```

**Verification:**
```bash
# Monitor backend performance
htop  # Check CPU/memory usage
tail -f agent/logs/app.log | grep "session.*end"
# Should see 5 session end calls within ~2 minutes
```

**Expected Result:**
- ✅ All 5 sessions complete successfully
- ✅ No race conditions in memory updates
- ✅ Backend CPU < 80%, memory < 2GB

**Failure Modes:**
- ❌ Deadlocks → Database connection pool exhausted
- ❌ Memory leaks → Backend memory grows unbounded

---

### T5.2: Large Course (Complex Simulation)

**Objective:** Verify course builder handles large code generation

**Steps:**
1. As teacher, request complex simulation:
   ```
   Create a lab simulation of the entire Krebs cycle with 8 steps,
   each showing molecular structures, enzyme names, and energy production.
   Include animations for each step and a summary dashboard.
   ```
2. Wait for generation (may take 2-3 minutes)

**Verification:**
```sql
-- Check simulation_jsx size
SELECT LENGTH(simulation_jsx) as code_size
FROM courses
WHERE title LIKE '%Krebs%';
-- Should be > 5000 characters
```

**Expected Result:**
- ✅ Agent generates code without truncation
- ✅ Preview renders (may be slow but functional)
- ✅ Save succeeds despite large payload

**Failure Modes:**
- ❌ Code truncated → LLM context limit or response size limit
- ❌ Preview crashes → Too complex for browser
- ❌ Save fails → Database column size limit (TEXT should handle it)

---

## Acceptance Criteria

### Must Pass (Blocking Issues)
- ✅ T1.1: Student signup creates Letta agent
- ✅ T1.2: Session end updates memory
- ✅ T1.3: Profile displays memory
- ✅ T2.1: Teacher signup and dashboard access
- ✅ T2.2: Course builder generates working code
- ✅ T2.4: Dashboard shows course list
- ✅ T3.1: Student can use teacher-created course

### Should Pass (Important but not blocking)
- ✅ T2.3: Course builder iterates on code
- ✅ T3.2: Memory persists across sessions
- ✅ T4.1: Graceful degradation without Letta
- ✅ T4.2: Session tracking without memory agent

### Nice to Have (Polish)
- ✅ T4.3: Profile handles missing agent
- ✅ T4.4: Course builder error handling
- ✅ T5.1: Concurrent sessions
- ✅ T5.2: Large course generation

---

## Test Execution Checklist

```bash
# Before starting
[ ] Backend running on :8123
[ ] Frontend running on :3000
[ ] Letta running on :8283
[ ] Supabase accessible
[ ] Environment variables set

# Student Flow
[ ] T1.1: Signup + agent creation
[ ] T1.2: Session tracking
[ ] T1.3: Profile memory display

# Teacher Flow
[ ] T2.1: Teacher signup
[ ] T2.2: Create lab simulation
[ ] T2.3: Iterate on design
[ ] T2.4: Dashboard course list

# Integration
[ ] T3.1: Student uses teacher course
[ ] T3.2: Memory persistence

# Error Handling
[ ] T4.1: Signup without Letta
[ ] T4.2: Session without agent
[ ] T4.3: Profile without agent
[ ] T4.4: Course builder without Gemini

# Performance
[ ] T5.1: Concurrent sessions
[ ] T5.2: Large course generation

# After testing
[ ] Document failures in this file
[ ] Create GitHub issues for bugs
[ ] Update arch-v3.md with test results
```

---

## Bug Report Template

When a test fails, document it here:

```markdown
### Bug: [Short description]
**Test:** T1.2
**Severity:** High/Medium/Low
**Observed:** [What happened]
**Expected:** [What should happen]
**Reproduction:**
1. Step 1
2. Step 2
**Logs:**
```
[Paste relevant logs]
```
**Fix:** [Proposed solution or file to investigate]
```

---

## Next Steps After Testing

1. **All tests pass:** Update `arch-v3.md` status to "Production Ready", create PR for merge to main
2. **Critical failures (T1.x, T2.x, T3.1):** Fix immediately before proceeding
3. **Non-critical failures (T4.x, T5.x):** Create GitHub issues, prioritize for next sprint
4. **Performance issues:** Profile with Chrome DevTools, optimize hot paths
