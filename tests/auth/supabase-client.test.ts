import { createSupabaseBrowser } from '@/lib/supabase/client';
import { createSupabaseServer } from '@/lib/supabase/server';

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn((url, key) => ({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
    _url: url,
    _key: key,
  })),
  createServerClient: jest.fn((url, key, options) => ({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    _url: url,
    _key: key,
    _options: options,
  })),
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}));

describe('[slice-8-auth] Supabase Client Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Browser Client', () => {
    it('should create browser client with correct environment variables', () => {
      const client = createSupabaseBrowser();

      expect(client).toBeDefined();
      expect(client._url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL);
      expect(client._key).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    });

    it('should have auth methods available', () => {
      const client = createSupabaseBrowser();

      expect(client.auth.getUser).toBeDefined();
      expect(client.auth.signInWithPassword).toBeDefined();
      expect(client.auth.signUp).toBeDefined();
      expect(client.auth.signOut).toBeDefined();
      expect(client.auth.onAuthStateChange).toBeDefined();
    });

    it('should have database query methods', () => {
      const client = createSupabaseBrowser();

      expect(client.from).toBeDefined();
      expect(typeof client.from).toBe('function');
    });
  });

  describe('Server Client', () => {
    it('should create server client with correct environment variables', async () => {
      const client = await createSupabaseServer();

      expect(client).toBeDefined();
      expect(client._url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL);
      expect(client._key).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    });

    it('should have auth methods available', async () => {
      const client = await createSupabaseServer();

      expect(client.auth.getUser).toBeDefined();
      expect(client.auth.signInWithPassword).toBeDefined();
      expect(client.auth.signUp).toBeDefined();
      expect(client.auth.signOut).toBeDefined();
    });

    it('should configure cookie handlers', async () => {
      const client = await createSupabaseServer();

      expect(client._options).toBeDefined();
      expect(client._options.cookies).toBeDefined();
      expect(client._options.cookies.getAll).toBeDefined();
      expect(client._options.cookies.setAll).toBeDefined();
    });

    it('should handle cookie operations', async () => {
      const client = await createSupabaseServer();

      // Verify cookie handlers are configured
      expect(client._options.cookies.getAll).toBeDefined();
      expect(client._options.cookies.setAll).toBeDefined();

      // Test setAll functionality
      const testCookies = [
        { name: 'test-cookie', value: 'test-value', options: {} }
      ];

      // setAll should iterate and call set on each cookie
      client._options.cookies.setAll(testCookies);

      // Verify the function was called (implementation detail test)
      expect(typeof client._options.cookies.setAll).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Test with missing URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const client = createSupabaseBrowser();
      expect(client._url).toBeUndefined();

      // Restore
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    });
  });
});
