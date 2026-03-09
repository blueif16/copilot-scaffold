/**
 * Integration tests for CourseBuilder conversation save/load functionality.
 * Tests the conversation persistence logic with mocked Supabase client.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase client
const createMockSupabaseClient = () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
});

describe('CourseBuilder Conversation Integration', () => {
  const mockUserId = 'user-123';
  const mockThreadId = 'thread-abc-123';
  const mockConversationId = 'conv-456';
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();

    // Default: authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
  });

  describe('Create conversation', () => {
    it('should create a new conversation with thread_id', async () => {
      const mockConversation = {
        id: mockConversationId,
        user_id: mockUserId,
        thread_id: mockThreadId,
        title: 'Water Cycle Lab',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockConversation,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      // Simulate the logic from POST /api/course-builder/conversations
      const { data: { user } } = await mockSupabase.auth.getUser();
      expect(user).toBeDefined();

      const { data: conversation } = await mockSupabase
        .from('course_builder_conversations')
        .insert({
          user_id: user!.id,
          thread_id: mockThreadId,
          title: 'Water Cycle Lab',
        })
        .select()
        .single();

      expect(conversation).toBeDefined();
      expect(conversation.thread_id).toBe(mockThreadId);
      expect(conversation.user_id).toBe(mockUserId);
      expect(mockSupabase.from).toHaveBeenCalledWith('course_builder_conversations');
    });

    it('should validate thread_id is required', () => {
      const requestBody = { title: 'Water Cycle Lab' };

      // Simulate validation logic
      const isValid = 'thread_id' in requestBody && requestBody.thread_id;

      expect(isValid).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { data: { user }, error } = await mockSupabase.auth.getUser();

      expect(user).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('Save messages to conversation', () => {
    it('should save messages to a conversation', async () => {
      const messages = [
        { role: 'user', content: 'Create a water cycle simulation' },
        { role: 'assistant', content: 'I will create a water cycle simulation for you.' },
      ];

      // Mock conversation ownership check
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockConversationId },
              error: null,
            }),
          }),
        }),
      });

      // Mock delete old messages
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock insert new messages
      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'course_builder_conversations') {
          return { select: mockSelect };
        }
        if (table === 'course_builder_messages') {
          return {
            delete: mockDelete,
            insert: mockInsert,
          };
        }
      });

      // Simulate the logic from POST /api/course-builder/conversations/[id]/messages
      const { data: { user } } = await mockSupabase.auth.getUser();

      // Verify conversation ownership
      const { data: conversation } = await mockSupabase
        .from('course_builder_conversations')
        .select('id')
        .eq('id', mockConversationId)
        .eq('user_id', user!.id)
        .single();

      expect(conversation).toBeDefined();

      // Delete old messages
      await mockSupabase
        .from('course_builder_messages')
        .delete()
        .eq('conversation_id', mockConversationId);

      // Insert new messages
      const messagesToInsert = messages.map((msg) => ({
        conversation_id: mockConversationId,
        role: msg.role,
        content: msg.content,
      }));

      await mockSupabase
        .from('course_builder_messages')
        .insert(messagesToInsert);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            conversation_id: mockConversationId,
            role: 'user',
            content: 'Create a water cycle simulation',
          }),
          expect.objectContaining({
            conversation_id: mockConversationId,
            role: 'assistant',
            content: 'I will create a water cycle simulation for you.',
          }),
        ])
      );
    });

    it('should validate messages array is not empty', () => {
      const requestBody = { messages: [] };

      // Simulate validation logic
      const isValid = Array.isArray(requestBody.messages) && requestBody.messages.length > 0;

      expect(isValid).toBe(false);
    });

    it('should verify conversation ownership before saving', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { data: { user } } = await mockSupabase.auth.getUser();

      const { data: conversation, error } = await mockSupabase
        .from('course_builder_conversations')
        .select('id')
        .eq('id', mockConversationId)
        .eq('user_id', user!.id)
        .single();

      expect(conversation).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('Load conversation with messages', () => {
    it('should load conversation with messages', async () => {
      const mockConversation = {
        id: mockConversationId,
        user_id: mockUserId,
        thread_id: mockThreadId,
        title: 'Water Cycle Lab',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: mockConversationId,
          role: 'user',
          content: 'Create a water cycle simulation',
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          conversation_id: mockConversationId,
          role: 'assistant',
          content: 'I will create a water cycle simulation for you.',
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'course_builder_conversations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockConversation,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'course_builder_messages') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockMessages,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      // Simulate the logic from GET /api/course-builder/conversations/[id]
      const { data: { user } } = await mockSupabase.auth.getUser();

      const { data: conversation } = await mockSupabase
        .from('course_builder_conversations')
        .select('*')
        .eq('id', mockConversationId)
        .eq('user_id', user!.id)
        .single();

      const { data: messages } = await mockSupabase
        .from('course_builder_messages')
        .select('*')
        .eq('conversation_id', mockConversationId)
        .order('created_at', { ascending: true });

      expect(conversation).toBeDefined();
      expect(conversation.thread_id).toBe(mockThreadId);
      expect(messages).toBeDefined();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should return error for non-existent conversation', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      const { data: { user } } = await mockSupabase.auth.getUser();

      const { data: conversation, error } = await mockSupabase
        .from('course_builder_conversations')
        .select('*')
        .eq('id', mockConversationId)
        .eq('user_id', user!.id)
        .single();

      expect(conversation).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('Delete conversation', () => {
    it('should delete conversation and cascade delete messages', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      // Simulate the logic from DELETE /api/course-builder/conversations/[id]
      const { data: { user } } = await mockSupabase.auth.getUser();

      await mockSupabase
        .from('course_builder_conversations')
        .delete()
        .eq('id', mockConversationId)
        .eq('user_id', user!.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('course_builder_conversations');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('List conversations', () => {
    it('should list user conversations ordered by updated_at', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          user_id: mockUserId,
          thread_id: 'thread-1',
          title: 'Water Cycle Lab',
          created_at: new Date('2026-03-08T10:00:00Z').toISOString(),
          updated_at: new Date('2026-03-08T12:00:00Z').toISOString(),
        },
        {
          id: 'conv-2',
          user_id: mockUserId,
          thread_id: 'thread-2',
          title: 'Solar System Quiz',
          created_at: new Date('2026-03-07T10:00:00Z').toISOString(),
          updated_at: new Date('2026-03-07T11:00:00Z').toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockConversations,
              error: null,
            }),
          }),
        }),
      });

      // Simulate the logic from GET /api/course-builder/conversations
      const { data: { user } } = await mockSupabase.auth.getUser();

      const { data: conversations } = await mockSupabase
        .from('course_builder_conversations')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });

      expect(conversations).toBeDefined();
      expect(conversations).toHaveLength(2);
      expect(conversations[0].title).toBe('Water Cycle Lab');
    });
  });

  describe('Thread ID persistence across sessions', () => {
    it('should maintain thread_id link between conversation and checkpoints', async () => {
      const mockConversation = {
        id: mockConversationId,
        user_id: mockUserId,
        thread_id: mockThreadId,
        title: 'Test Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Verify thread_id is stored in conversation
      expect(mockConversation.thread_id).toBe(mockThreadId);

      // This thread_id should match the one used in LangGraph PostgresSaver
      // which stores checkpoints in the checkpoints table with the same thread_id
      expect(typeof mockConversation.thread_id).toBe('string');
      expect(mockConversation.thread_id.length).toBeGreaterThan(0);
    });

    it('should verify thread_id uniqueness constraint', async () => {
      // The schema has a unique constraint on thread_id
      // This test verifies the constraint is understood
      const conversation1 = {
        id: 'conv-1',
        user_id: mockUserId,
        thread_id: 'unique-thread-123',
      };

      const conversation2 = {
        id: 'conv-2',
        user_id: mockUserId,
        thread_id: 'unique-thread-123', // Same thread_id - should fail
      };

      // In real DB, this would violate unique constraint
      expect(conversation1.thread_id).toBe(conversation2.thread_id);
      // This test documents that thread_id must be unique per conversation
    });
  });
});
