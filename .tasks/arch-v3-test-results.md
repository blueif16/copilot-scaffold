# Arch V3 E2E Test Results

**Date:** 2026-03-07 18:37:03

**Summary:** 8/8 tests passed

## Test Results

### ✅ T2.1a: Student signup
- User created: test-student-1772937421@example.com
- Timestamp: 2026-03-07T18:37:01.898167

### ✅ T2.1b: Get user profile
- User ID: 8d0214d7-19d8-42d1-a279-4a4fd58489a9
- Timestamp: 2026-03-07T18:37:02.040997

### ✅ T2.1c: Create memory agent
- Agent ID: agent-1a1b0500-e686-4192-9bbc-2cca9f887299
- Timestamp: 2026-03-07T18:37:02.328644

### ✅ T2.2a: End session and update memory
- Memory updated: False
- Timestamp: 2026-03-07T18:37:02.587875

### ✅ T2.3a: Get student memory
- Memory blocks retrieved: True
- Timestamp: 2026-03-07T18:37:02.789827

### ✅ T3.1: Teacher signup
- User created: test-teacher-1772937422@example.com
- Timestamp: 2026-03-07T18:37:03.009108

### ✅ T5.1: Reject unauthenticated requests
- Correctly returned 401
- Timestamp: 2026-03-07T18:37:03.145805

### ✅ T5.2: Health check without auth
- Backend healthy
- Timestamp: 2026-03-07T18:37:03.291377

## Test Data

```json
{
  "student_email": "test-student-1772937421@example.com",
  "student_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcyOTQxMDIxLCJpYXQiOjE3NzI5Mzc0MjEsInN1YiI6IjhkMDIxNGQ3LTE5ZDgtNDJkMS1hMjc5LTRhNGZkNTg0ODlhOSIsImVtYWlsIjoidGVzdC1zdHVkZW50LTE3NzI5Mzc0MjFAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3MjkzNzQyMX1dLCJzZXNzaW9uX2lkIjoiOGYwYzM1M2YtODAzMS00Zjk0LWE4Y2MtOTdlZGU3MDJkMzE3In0.ZmzzzMPoa2dCQ3E5ql8MQZefI-6wN5hqH4LrcioIgk8",
  "student_id": "8d0214d7-19d8-42d1-a279-4a4fd58489a9",
  "student_agent_id": "agent-1a1b0500-e686-4192-9bbc-2cca9f887299",
  "teacher_email": "test-teacher-1772937422@example.com",
  "teacher_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcyOTQxMDIzLCJpYXQiOjE3NzI5Mzc0MjMsInN1YiI6Ijk0ZGViMTdiLThkYTQtNDE0Yi04NDlkLWIxZTRkZjAyMzlmZiIsImVtYWlsIjoidGVzdC10ZWFjaGVyLTE3NzI5Mzc0MjJAZXhhbXBsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3MjkzNzQyM31dLCJzZXNzaW9uX2lkIjoiMjM3NTQxOTgtYTc3MC00YWI4LTk2OGQtNDhiMTI2NmViZTQ5In0.D5quzQuhQyz1s0ubVRe91eYAcmis1kM3K4du0VEihSc"
}
```
