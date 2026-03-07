import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowser: jest.fn(),
}));

const mockCreateSupabaseBrowser = createSupabaseBrowser as jest.MockedFunction<typeof createSupabaseBrowser>;

// Test component to access auth context
function TestComponent() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-id">{user?.id || 'no-user'}</div>
      <div data-testid="user-email">{user?.email || 'no-email'}</div>
      <div data-testid="profile-role">{profile?.role || 'no-role'}</div>
      <div data-testid="profile-name">{profile?.display_name || 'no-name'}</div>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

describe('[slice-8-auth] AuthContext', () => {
  let mockSupabase: any;
  let authStateChangeCallback: any;

  beforeEach(() => {
    authStateChangeCallback = null;

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChange: jest.fn((callback) => {
          authStateChangeCallback = callback;
          return {
            data: {
              subscription: {
                unsubscribe: jest.fn(),
              },
            },
          };
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };

    mockCreateSupabaseBrowser.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should start with loading state', () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load authenticated user and profile', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'student@test.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-123',
        role: 'student' as const,
        display_name: 'Test Student',
        avatar_url: null,
        letta_agent_id: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
        expect(screen.getByTestId('user-email')).toHaveTextContent('student@test.com');
        expect(screen.getByTestId('profile-role')).toHaveTextContent('student');
        expect(screen.getByTestId('profile-name')).toHaveTextContent('Test Student');
      });
    });

    it('should handle unauthenticated state', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
        expect(screen.getByTestId('profile-role')).toHaveTextContent('no-role');
      });
    });

    it('should handle profile fetch error gracefully', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'student@test.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Profile not found' } }),
          }),
        }),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
        expect(screen.getByTestId('profile-role')).toHaveTextContent('no-role');
        expect(consoleSpy).toHaveBeenCalledWith(
          '[slice-8-auth] Error fetching profile:',
          expect.any(Object)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Auth State Changes', () => {
    it('should update state on sign in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
      });

      const mockUser: Partial<User> = {
        id: 'user-456',
        email: 'teacher@test.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-456',
        role: 'teacher' as const,
        display_name: 'Test Teacher',
        avatar_url: null,
        letta_agent_id: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      await act(async () => {
        authStateChangeCallback('SIGNED_IN', { user: mockUser });
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-456');
        expect(screen.getByTestId('user-email')).toHaveTextContent('teacher@test.com');
        expect(screen.getByTestId('profile-role')).toHaveTextContent('teacher');
      });
    });

    it('should clear state on sign out', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'student@test.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-123',
        role: 'student' as const,
        display_name: 'Test Student',
        avatar_url: null,
        letta_agent_id: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
      });

      await act(async () => {
        authStateChangeCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
        expect(screen.getByTestId('profile-role')).toHaveTextContent('no-role');
      });
    });
  });

  describe('signOut method', () => {
    it('should call supabase signOut and clear state', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'student@test.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
      });

      const signOutButton = screen.getByText('Sign Out');
      await act(async () => {
        signOutButton.click();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
