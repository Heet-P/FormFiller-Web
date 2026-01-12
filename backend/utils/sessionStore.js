/**
 * In-Memory Session Store
 * Manages form sessions, conversation history, and filled data
 * For production, consider using Redis or a database
 */

class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Create a new session
   * @param {string} sessionId - Unique session identifier
   * @param {object} formSchema - Extracted form schema
   */
  createSession(sessionId, formSchema) {
    this.sessions.set(sessionId, {
      sessionId,
      formSchema,
      filledFields: {},
      conversationHistory: [],
      currentFieldIndex: 0,
      isComplete: false,
      createdAt: new Date(),
      originalFilePath: null,
    });
  }

  /**
   * Get session data
   * @param {string} sessionId
   * @returns {object|null} Session data or null if not found
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Update filled field value
   * @param {string} sessionId
   * @param {string} fieldName
   * @param {any} value
   */
  updateField(sessionId, fieldName, value) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.filledFields[fieldName] = value;
    }
  }

  /**
   * Add message to conversation history
   * @param {string} sessionId
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  addMessage(sessionId, role, content) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push({
        role,
        content,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Update current field index
   * @param {string} sessionId
   * @param {number} index
   */
  setCurrentFieldIndex(sessionId, index) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentFieldIndex = index;
    }
  }

  /**
   * Mark session as complete
   * @param {string} sessionId
   */
  markComplete(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isComplete = true;
    }
  }

  /**
   * Set original file path
   * @param {string} sessionId
   * @param {string} filePath
   */
  setOriginalFilePath(sessionId, filePath) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.originalFilePath = filePath;
    }
  }

  /**
   * Delete session (cleanup)
   * @param {string} sessionId
   */
  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up old sessions (older than 1 hour)
   */
  cleanupOldSessions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.createdAt < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Singleton instance
const sessionStore = new SessionStore();

// Cleanup old sessions every 30 minutes
setInterval(() => {
  sessionStore.cleanupOldSessions();
}, 30 * 60 * 1000);

export default sessionStore;
