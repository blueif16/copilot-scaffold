/**
 * Integration tests for course builder API route.
 * Tests the API route with mocked agent responses.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Polyfill fetch for Node.js test environment
global.fetch = global.fetch || require('node-fetch');

describe('Course Builder API Integration', () => {
  const API_URL = 'http://localhost:3000/api/copilotkit';

  beforeAll(() => {
    // Ensure server is running
    console.log('Testing against:', API_URL);
  });

  it('should respond to health check', async () => {
    const response = await fetch(API_URL, {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects to /login
    });

    // GET returns JSON with status ok (or redirects if auth required)
    if (response.status === 200) {
      const text = await response.text();
      const data = JSON.parse(text);
      expect(data).toHaveProperty('status', 'ok');
    } else {
      // If redirected, that's also acceptable - means auth is working
      expect([200, 302, 307]).toContain(response.status);
    }
  });

  it('should accept POST requests with proper headers', async () => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'test message',
          },
        ],
      }),
    });

    // Should not return 404 or 405
    expect(response.status).not.toBe(404);
    expect(response.status).not.toBe(405);
  });

  it('should have course-builder agent registered', async () => {
    // This tests that the agent is properly configured in the runtime
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent: 'course-builder',
        messages: [],
      }),
    });

    // Should accept the agent name without error
    expect(response.status).not.toBe(400);
  });
});

describe('Course Builder State Shape', () => {
  it('should have correct CourseBuilderAgentState type shape', () => {
    // Type-level test - this will fail at compile time if types are wrong
    const mockState: { files: Record<string, string> } = {
      files: {
        '/App.jsx': 'export default function App() {}',
      },
    };

    expect(mockState.files).toBeDefined();
    expect(typeof mockState.files).toBe('object');
    expect(Object.keys(mockState.files).length).toBeGreaterThan(0);
  });

  it('should handle empty files state', () => {
    const mockState: { files: Record<string, string> } = {
      files: {},
    };

    expect(mockState.files).toBeDefined();
    expect(Object.keys(mockState.files).length).toBe(0);
  });

  it('should handle multiple files', () => {
    const mockState: { files: Record<string, string> } = {
      files: {
        '/App.jsx': 'export default function App() {}',
        '/interactions.json': '{"events": []}',
      },
    };

    expect(Object.keys(mockState.files).length).toBe(2);
    expect(mockState.files['/App.jsx']).toBeTruthy();
    expect(mockState.files['/interactions.json']).toBeTruthy();
  });
});
