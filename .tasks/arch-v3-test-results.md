# Arch V3 E2E Test Results

**Date:** 2026-03-07 18:18:33

**Summary:** 6/6 tests passed

## Test Results

### ✅ T2.1a: Student signup
- User created: test-student-1772936311@example.com
- Timestamp: 2026-03-07T18:18:32.124210

### ✅ T2.1b: Get user profile
- User ID: 99cfa301-dee7-49bc-85e1-f4f3e9fa697f
- Timestamp: 2026-03-07T18:18:32.299812

### ✅ T2.1c: Create memory agent
- Agent ID: agent-be3810b4-2c46-4c78-9332-e4f2afa6bf5b
- Timestamp: 2026-03-07T18:18:32.580537

### ✅ T3.1: Teacher signup
- User created: test-teacher-1772936312@example.com
- Timestamp: 2026-03-07T18:18:32.783017

### ✅ T5.1: Reject unauthenticated requests
- Correctly returned 401
- Timestamp: 2026-03-07T18:18:32.929388

### ✅ T5.2: Health check without auth
- Backend healthy
- Timestamp: 2026-03-07T18:18:33.067008

## Test Data

```json
{
  "student_email": "test-student-1772936311@example.com",
  "student_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcyOTM5OTEyLCJpYXQiOjE3NzI5MzYzMTIsInN1YiI6Ijk5Y2ZhMzAxLWRlZTctNDliYy04NWUxLWY0ZjNlOWZhNjk3ZiIsImVtYWlsIjoidGVzdC1zdHVkZW50LTE3NzI5MzYzMTFAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3MjkzNjMxMn1dLCJzZXNzaW9uX2lkIjoiNDgyMTU5NWUtNmViNS00ZTAxLTlmNTAtZTg0ZmU4MzFlOWQzIn0.YeGCSybDp-nHrVycF5rFSjpz3-xkEg6aNG-kRAD20yc",
  "student_id": "99cfa301-dee7-49bc-85e1-f4f3e9fa697f",
  "student_agent_id": "agent-be3810b4-2c46-4c78-9332-e4f2afa6bf5b",
  "teacher_email": "test-teacher-1772936312@example.com",
  "teacher_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcyOTM5OTEyLCJpYXQiOjE3NzI5MzYzMTIsInN1YiI6ImIzZjFjMzBiLTA5NDAtNDIzMS05MjBkLWU3NWVlNzhhMTVkYiIsImVtYWlsIjoidGVzdC10ZWFjaGVyLTE3NzI5MzYzMTJAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3MjkzNjMxMn1dLCJzZXNzaW9uX2lkIjoiYzI3NGRkM2UtNjRlZi00NDAzLTk5YjMtMTU0Y2EwN2ZkYWIyIn0.Vy26pUO8tbNG67wRL3wRvPSxkiC-P58xmAngGNM-7B4"
}
```
