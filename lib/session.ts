/**
 * Session persistence utilities.
 *
 * CopilotKit uses `threadId` (a valid UUID) to persist
 * agent state across page reloads. This module generates
 * and caches session IDs per topic so returning to the
 * same topic resumes where the student left off.
 */

// Simple UUID v4 generator (no crypto dependency for broad compat)
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SESSION_KEY_PREFIX = "omniscience_session_";

/**
 * Get or create a session ID for a topic.
 *
 * On first visit, generates a new UUID and caches it.
 * On return visits, reuses the cached UUID so CopilotKit
 * restores agent state (progress, reaction history, chat).
 *
 * Returns `undefined` when running server-side.
 */
export function getTopicSessionId(topicId: string): string | undefined {
  if (typeof window === "undefined") return undefined;

  const key = `${SESSION_KEY_PREFIX}${topicId}`;

  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;

    const id = uuidv4();
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    // sessionStorage blocked (incognito, iframe restrictions)
    return uuidv4();
  }
}

/**
 * Clear the session for a topic (fresh start).
 */
export function clearTopicSession(topicId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${topicId}`);
  } catch {
    // ignore
  }
}
