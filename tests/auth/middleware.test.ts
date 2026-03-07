import { middleware } from '@/middleware';

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn((config) => ({
      ...config,
      cookies: {
        set: jest.fn(),
        get: jest.fn(),
        getAll: jest.fn(),
      },
    })),
    redirect: jest.fn((url) => ({ redirected: true, url })),
  },
}));

describe('[slice-8-auth] Middleware', () => {
  let mockSupabase: any;
  let mockRequest: any;
  const { NextResponse } = require('next/server');

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };

    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue(mockSupabase);

    mockRequest = {
      nextUrl: {
        pathname: '/',
        toString: () => 'http://localhost:3000/',
      },
      url: 'http://localhost:3000/',
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
        get: jest.fn(),
      },
    };
  });

  describe('Unauthenticated Users', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    });

    it('should redirect unauthenticated users to login from protected routes', async () => {
      const { NextResponse } = require('next/server');
      mockRequest.nextUrl.pathname = '/';
      mockRequest.url = 'http://localhost:3000/';

      await middleware(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', 'http://localhost:3000/')
      );
    });

    it('should allow access to login page', async () => {
      const { NextResponse } = require('next/server');
      mockRequest.nextUrl.pathname = '/login';
      mockRequest.url = 'http://localhost:3000/login';

      await middleware(mockRequest);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should allow access to signup page', async () => {
      const { NextResponse } = require('next/server');
      mockRequest.nextUrl.pathname = '/signup';
      mockRequest.url = 'http://localhost:3000/signup';

      await middleware(mockRequest);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should redirect from topics page to login', async () => {
      const { NextResponse } = require('next/server');
      mockRequest.nextUrl.pathname = '/topics/changing-states';
      mockRequest.url = 'http://localhost:3000/topics/changing-states';

      await middleware(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', 'http://localhost:3000/topics/changing-states')
      );
    });
  });

  describe('Authenticated Users - Role-Based Routing', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@test.com',
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should allow students to access home page', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'student' },
              error: null,
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/';
      mockRequest.url = 'http://localhost:3000/';

      await middleware(mockRequest);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should allow students to access topics', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'student' },
              error: null,
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/topics/genetics-basics';
      mockRequest.url = 'http://localhost:3000/topics/genetics-basics';

      await middleware(mockRequest);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should redirect students from teacher dashboard to home', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'student' },
              error: null,
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/dashboard';
      mockRequest.url = 'http://localhost:3000/dashboard';

      await middleware(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', 'http://localhost:3000/dashboard')
      );
    });

    it('should redirect students from course creation to home', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'student' },
              error: null,
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/courses/new';
      mockRequest.url = 'http://localhost:3000/courses/new';

      await middleware(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', 'http://localhost:3000/courses/new')
      );
    });

    it('should allow teachers to access dashboard', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'teacher' },
              error: null,
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/dashboard';
      mockRequest.url = 'http://localhost:3000/dashboard';

      await middleware(mockRequest);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should allow teachers to access course creation', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'teacher' },
              error: null,
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/courses/new';
      mockRequest.url = 'http://localhost:3000/courses/new';

      await middleware(mockRequest);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should allow teachers to access student routes', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'teacher' },
              error: null,
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/';
      mockRequest.url = 'http://localhost:3000/';

      await middleware(mockRequest);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });
  });

  describe('Profile Fetch Errors', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@test.com',
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should handle missing profile gracefully', async () => {
      const { NextResponse } = require('next/server');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      });

      mockRequest.nextUrl.pathname = '/dashboard';
      mockRequest.url = 'http://localhost:3000/dashboard';

      await middleware(mockRequest);

      // Should redirect to home since profile.role is undefined (not 'teacher')
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', 'http://localhost:3000/dashboard')
      );
    });
  });

  describe('Cookie Management', () => {
    it('should configure cookie handlers correctly', async () => {
      const { createServerClient } = require('@supabase/ssr');
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      mockRequest.nextUrl.pathname = '/login';
      mockRequest.url = 'http://localhost:3000/login';

      await middleware(mockRequest);

      expect(createServerClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
    });
  });
});
