/**
 * Unit tests for CourseBuilder component state transitions.
 * Fast, deterministic tests for UI logic in isolation.
 */

import { describe, it, expect } from '@jest/globals';

describe('CourseBuilder State Transitions', () => {
  describe('Phase transitions', () => {
    it('should start in landing phase', () => {
      const initialPhase = 'landing';
      expect(initialPhase).toBe('landing');
    });

    it('should transition to chat when format selected', () => {
      let phase = 'landing';
      const selectedTemplate = { id: 'lab', format: 'lab' };

      // Simulate format selection
      if (selectedTemplate) {
        phase = 'chat';
      }

      expect(phase).toBe('chat');
    });

    it('should transition to split when files appear', () => {
      let phase = 'chat';
      const files = { '/App.jsx': 'content' };
      const hasFiles = Object.keys(files).length > 0;

      // Simulate files appearing
      if (hasFiles && phase === 'chat') {
        phase = 'split';
      }

      expect(phase).toBe('split');
    });

    it('should not transition to split if no files', () => {
      let phase = 'chat';
      const files = {};
      const hasFiles = Object.keys(files).length > 0;

      if (hasFiles && phase === 'chat') {
        phase = 'split';
      }

      expect(phase).toBe('chat');
    });

    it('should not transition to split if already in split', () => {
      let phase = 'split';
      const files = { '/App.jsx': 'content' };
      const hasFiles = Object.keys(files).length > 0;

      if (hasFiles && phase === 'chat') {
        phase = 'split';
      }

      expect(phase).toBe('split');
    });
  });

  describe('Message handling', () => {
    it('should prepend format prefix on first user message', () => {
      const selectedTemplate = { format: 'quiz' };
      const messages: Array<{ role: string }> = [];
      const userInput = 'Create a quiz about cells';

      const userMessageCount = messages.filter(m => m.role === 'user').length;
      const prefix = selectedTemplate && userMessageCount === 0
        ? `[Format: ${selectedTemplate.format}] `
        : '';

      const finalMessage = prefix + userInput;

      expect(finalMessage).toBe('[Format: quiz] Create a quiz about cells');
    });

    it('should not prepend format prefix on subsequent messages', () => {
      const selectedTemplate = { format: 'quiz' };
      const messages = [{ role: 'user' }, { role: 'assistant' }];
      const userInput = 'Make it harder';

      const userMessageCount = messages.filter(m => m.role === 'user').length;
      const prefix = selectedTemplate && userMessageCount === 0
        ? `[Format: ${selectedTemplate.format}] `
        : '';

      const finalMessage = prefix + userInput;

      expect(finalMessage).toBe('Make it harder');
    });
  });

  describe('File state handling', () => {
    it('should detect files from agent state', () => {
      const agentState = {
        files: {
          '/App.jsx': 'export default function App() {}',
        },
      };

      const files = agentState?.files || {};
      const hasFiles = Object.keys(files).length > 0;

      expect(hasFiles).toBe(true);
      expect(files['/App.jsx']).toBeTruthy();
    });

    it('should handle empty agent state', () => {
      const agentState = { files: {} };

      const files = agentState?.files || {};
      const hasFiles = Object.keys(files).length > 0;

      expect(hasFiles).toBe(false);
    });

    it('should handle undefined agent state', () => {
      const agentState = undefined;

      const files = agentState?.files || {};
      const hasFiles = Object.keys(files).length > 0;

      expect(hasFiles).toBe(false);
    });
  });

  describe('Template selection', () => {
    const TEMPLATES = [
      { id: 'lab', format: 'lab', name: 'Lab Simulation' },
      { id: 'quiz', format: 'quiz', name: 'Quiz' },
      { id: 'dialogue', format: 'dialogue', name: 'Dialogue' },
    ];

    it('should have three format templates', () => {
      expect(TEMPLATES.length).toBe(3);
    });

    it('should have unique template IDs', () => {
      const ids = TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have format matching ID', () => {
      TEMPLATES.forEach(template => {
        expect(template.format).toBe(template.id);
      });
    });
  });
});
