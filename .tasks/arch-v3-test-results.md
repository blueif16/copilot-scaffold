# Arch V3 E2E Test Results

**Date:** 2026-03-07 17:48:12

**Summary:** 5/6 tests passed

## Test Results

### ✅ T2.1a: Student signup
- User created: test-student-1772934491@example.com
- Timestamp: 2026-03-07T17:48:11.659208

### ✅ T2.1b: Get user profile
- User ID: 6da32298-f1e3-4e89-9556-9cd813582dac
- Timestamp: 2026-03-07T17:48:11.804688

### ❌ T2.1c: Create memory agent
- Status: 500 - Internal Server Error
- Timestamp: 2026-03-07T17:48:11.975068

### ✅ T3.1: Teacher signup
- User created: test-teacher-1772934491@example.com
- Timestamp: 2026-03-07T17:48:12.177071

### ✅ T5.1: Reject unauthenticated requests
- Correctly returned 401
- Timestamp: 2026-03-07T17:48:12.309058

### ✅ T5.2: Health check without auth
- Backend healthy
- Timestamp: 2026-03-07T17:48:12.447704

## Test Data

```json
{
  "student_email": "test-student-1772934491@example.com",
  "student_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcyOTM4MDkxLCJpYXQiOjE3NzI5MzQ0OTEsInN1YiI6IjZkYTMyMjk4LWYxZTMtNGU4OS05NTU2LTljZDgxMzU4MmRhYyIsImVtYWlsIjoidGVzdC1zdHVkZW50LTE3NzI5MzQ0OTFAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3MjkzNDQ5MX1dLCJzZXNzaW9uX2lkIjoiNzQwNTNjNmEtZmUyMC00MjIwLTg0Y2UtMDQxYjY2N2M5ODAwIn0.m7E6qKjwDQ1bOsnwblvvEQiNQYMgrVZfr4NjaG3mEvM",
  "student_id": "6da32298-f1e3-4e89-9556-9cd813582dac",
  "teacher_email": "test-teacher-1772934491@example.com",
  "teacher_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcyOTM4MDkyLCJpYXQiOjE3NzI5MzQ0OTIsInN1YiI6IjQ2MjkzZmFjLWZlMzMtNDMzNS1hNWVlLWY1NzVmZWRmZDcxZiIsImVtYWlsIjoidGVzdC10ZWFjaGVyLTE3NzI5MzQ0OTFAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3MjkzNDQ5Mn1dLCJzZXNzaW9uX2lkIjoiNGZkMjQyMGItNmU0My00ZDdiLWFiMjktMmY1YzVlOGU5N2NkIn0.ypL3DgnW7UolUIadqff3B-NgIWmPZIH-HWRRCCjYMw0"
}
```
