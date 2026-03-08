#!/usr/bin/env python3
"""
E2E Test Runner for Omniscience Arch V3
Continues from T2 onwards with proper authentication
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Optional, Dict, Any

# Configuration
FRONTEND_URL = "http://66.42.117.148:3082"
BACKEND_URL = "http://66.42.117.148:8124"
SUPABASE_URL = "http://66.42.117.148:8000"  # Kong gateway
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

class TestRunner:
    def __init__(self):
        self.results = []
        self.test_data = {}

    def log(self, message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def test_result(self, test_id: str, name: str, passed: bool, details: str = ""):
        result = {
            "id": test_id,
            "name": name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        status = "✅" if passed else "❌"
        self.log(f"{status} {test_id}: {name}")
        if details:
            self.log(f"   {details}")

    def create_supabase_user(self, email: str, password: str) -> Optional[str]:
        """Create user via Supabase Auth API and return access token"""
        try:
            # Sign up
            response = requests.post(
                f"{SUPABASE_URL}/auth/v1/signup",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True  # Auto-confirm for testing
                }
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                self.log(f"Signup failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            self.log(f"Error creating user: {e}")
            return None

    def sign_in_user(self, email: str, password: str) -> Optional[str]:
        """Sign in existing user and return access token"""
        try:
            response = requests.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "email": email,
                    "password": password
                }
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                self.log(f"Sign in failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            self.log(f"Error signing in: {e}")
            return None

    def run_t2_student_flow(self):
        """T2: Student Flow Tests"""
        self.log("\n=== T2: Student Flow Tests ===")

        # T2.1: Student Signup + Agent Creation
        email = f"test-student-{int(time.time())}@example.com"
        password = "TestPassword123!"

        self.log(f"Creating student account: {email}")
        token = self.create_supabase_user(email, password)

        if not token:
            self.test_result("T2.1", "Student signup", False, "Failed to create user")
            return

        self.test_result("T2.1a", "Student signup", True, f"User created: {email}")
        self.test_data["student_email"] = email
        self.test_data["student_token"] = token

        # Get user ID from token
        try:
            response = requests.get(
                f"{BACKEND_URL}/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                user_data = response.json()
                user_id = user_data["id"]
                self.test_data["student_id"] = user_id
                self.test_result("T2.1b", "Get user profile", True, f"User ID: {user_id}")
            else:
                self.test_result("T2.1b", "Get user profile", False, f"Status: {response.status_code}")
                return
        except Exception as e:
            self.test_result("T2.1b", "Get user profile", False, str(e))
            return

        # Create memory agent
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/students/{user_id}/create-memory-agent",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "name": "Test Student",
                    "age": 10
                }
            )

            if response.status_code == 200:
                agent_data = response.json()
                agent_id = agent_data.get("agent_id")
                self.test_data["student_agent_id"] = agent_id
                self.test_result("T2.1c", "Create memory agent", True, f"Agent ID: {agent_id}")
            else:
                self.test_result("T2.1c", "Create memory agent", False,
                               f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.test_result("T2.1c", "Create memory agent", False, str(e))

    def run_t3_teacher_flow(self):
        """T3: Teacher Flow Tests"""
        self.log("\n=== T3: Teacher Flow Tests ===")

        # T3.1: Teacher Signup
        email = f"test-teacher-{int(time.time())}@example.com"
        password = "TestPassword123!"

        self.log(f"Creating teacher account: {email}")
        token = self.create_supabase_user(email, password)

        if not token:
            self.test_result("T3.1", "Teacher signup", False, "Failed to create user")
            return

        self.test_result("T3.1", "Teacher signup", True, f"User created: {email}")
        self.test_data["teacher_email"] = email
        self.test_data["teacher_token"] = token

    def run_t5_error_handling(self):
        """T5: Error Handling Tests"""
        self.log("\n=== T5: Error Handling Tests ===")

        # T5.1: Unauthenticated access
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/students/fake-id/create-memory-agent",
                json={"name": "Test", "age": 10}
            )

            if response.status_code == 401:
                self.test_result("T5.1", "Reject unauthenticated requests", True,
                               "Correctly returned 401")
            else:
                self.test_result("T5.1", "Reject unauthenticated requests", False,
                               f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.test_result("T5.1", "Reject unauthenticated requests", False, str(e))

        # T5.2: Health check always works
        try:
            response = requests.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                self.test_result("T5.2", "Health check without auth", True, "Backend healthy")
            else:
                self.test_result("T5.2", "Health check without auth", False,
                               f"Status: {response.status_code}")
        except Exception as e:
            self.test_result("T5.2", "Health check without auth", False, str(e))

    def generate_report(self):
        """Generate test results report"""
        self.log("\n=== Test Results Summary ===")

        passed = sum(1 for r in self.results if r["passed"])
        failed = sum(1 for r in self.results if not r["passed"])
        total = len(self.results)

        self.log(f"Total: {total} | Passed: {passed} | Failed: {failed}")

        # Write detailed report
        report_path = ".tasks/arch-v3-test-results.md"
        with open(report_path, "w") as f:
            f.write("# Arch V3 E2E Test Results\n\n")
            f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Summary:** {passed}/{total} tests passed\n\n")

            f.write("## Test Results\n\n")
            for result in self.results:
                status = "✅" if result["passed"] else "❌"
                f.write(f"### {status} {result['id']}: {result['name']}\n")
                if result["details"]:
                    f.write(f"- {result['details']}\n")
                f.write(f"- Timestamp: {result['timestamp']}\n\n")

            f.write("## Test Data\n\n")
            f.write("```json\n")
            f.write(json.dumps(self.test_data, indent=2))
            f.write("\n```\n")

        self.log(f"Report written to {report_path}")
        return passed == total

    def run(self):
        """Run all tests"""
        self.log("Starting E2E Test Suite")
        self.log(f"Frontend: {FRONTEND_URL}")
        self.log(f"Backend: {BACKEND_URL}")
        self.log(f"Supabase: {SUPABASE_URL}")

        # Run test suites
        self.run_t2_student_flow()
        self.run_t3_teacher_flow()
        self.run_t5_error_handling()

        # Generate report
        all_passed = self.generate_report()

        return 0 if all_passed else 1

if __name__ == "__main__":
    runner = TestRunner()
    sys.exit(runner.run())
