import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Session Store', () => {
  beforeEach(async () => {
    // Clear all sessions before each test
    const { SessionStore } = await import('./store.js');
    const store = SessionStore.getInstance();
    store.clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', async () => {
      const { SessionStore } = await import('./store.js');

      const instance1 = SessionStore.getInstance();
      const instance2 = SessionStore.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('createSession', () => {
    it('should create new session with generated ID', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/server-stdout.log',
          stderr: '/tmp/server-stderr.log',
          combined: '/tmp/server-combined.log',
        },
      };

      const result = store.createSession(mockServerInfo);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionId).toBeDefined();
        expect(result.value.sessionId.length).toBeGreaterThan(0);
        expect(result.value.serverInfo).toEqual(mockServerInfo);
        expect(result.value.browser).toBeNull();
        expect(result.value.page).toBeNull();
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.lastActivity).toBeInstanceOf(Date);
      }
    });

    it('should generate unique session IDs', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      };

      const result1 = store.createSession(mockServerInfo);
      const result2 = store.createSession(mockServerInfo);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok && result2.ok) {
        expect(result1.value.sessionId).not.toBe(result2.value.sessionId);
      }
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session by ID', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      };

      const createResult = store.createSession(mockServerInfo);
      expect(createResult.ok).toBe(true);

      if (createResult.ok) {
        const sessionId = createResult.value.sessionId;
        const getResult = store.getSession(sessionId);

        expect(getResult.ok).toBe(true);
        if (getResult.ok) {
          expect(getResult.value.sessionId).toBe(sessionId);
          expect(getResult.value.serverInfo).toEqual(mockServerInfo);
        }
      }
    });

    it('should return error for non-existent session', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const result = store.getSession('non-existent-session-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('session_not_found');
      }
    });
  });

  describe('updateSession', () => {
    it('should update session last activity time', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      };

      const createResult = store.createSession(mockServerInfo);
      expect(createResult.ok).toBe(true);

      if (createResult.ok) {
        const sessionId = createResult.value.sessionId;
        const originalLastActivity = createResult.value.lastActivity;

        // Wait a bit to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updateResult = store.updateSession(sessionId, {});

        expect(updateResult.ok).toBe(true);
        if (updateResult.ok) {
          expect(updateResult.value.lastActivity.getTime()).toBeGreaterThan(
            originalLastActivity.getTime()
          );
        }
      }
    });

    it('should update browser instance', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      };

      const createResult = store.createSession(mockServerInfo);
      expect(createResult.ok).toBe(true);

      if (createResult.ok) {
        const sessionId = createResult.value.sessionId;
        const mockBrowser = { isConnected: () => true } as any;

        const updateResult = store.updateSession(sessionId, { browser: mockBrowser });

        expect(updateResult.ok).toBe(true);
        if (updateResult.ok) {
          expect(updateResult.value.browser).toBe(mockBrowser);
        }
      }
    });

    it('should return error for non-existent session', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const result = store.updateSession('non-existent-session-id', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('session_not_found');
      }
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      };

      const createResult = store.createSession(mockServerInfo);
      expect(createResult.ok).toBe(true);

      if (createResult.ok) {
        const sessionId = createResult.value.sessionId;

        const deleteResult = store.deleteSession(sessionId);
        expect(deleteResult.ok).toBe(true);

        // Verify session is deleted
        const getResult = store.getSession(sessionId);
        expect(getResult.ok).toBe(false);
      }
    });

    it('should return error for non-existent session', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const result = store.deleteSession('non-existent-session-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('session_not_found');
      }
    });
  });

  describe('getAllSessions', () => {
    it('should return empty array when no sessions exist', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const sessions = store.getAllSessions();

      expect(sessions).toEqual([]);
    });

    it('should return all active sessions', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo1 = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout1.log',
          stderr: '/tmp/stderr1.log',
          combined: '/tmp/combined1.log',
        },
      };

      const mockServerInfo2 = {
        url: 'http://localhost:3002',
        port: 3002,
        pid: 12346,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout2.log',
          stderr: '/tmp/stderr2.log',
          combined: '/tmp/combined2.log',
        },
      };

      store.createSession(mockServerInfo1);
      store.createSession(mockServerInfo2);

      const sessions = store.getAllSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0].serverInfo.port).toBe(3001);
      expect(sessions[1].serverInfo.port).toBe(3002);
    });
  });

  describe('clear', () => {
    it('should remove all sessions', async () => {
      const { SessionStore } = await import('./store.js');
      const store = SessionStore.getInstance();

      const mockServerInfo = {
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      };

      store.createSession(mockServerInfo);
      store.createSession(mockServerInfo);

      expect(store.getAllSessions()).toHaveLength(2);

      store.clear();

      expect(store.getAllSessions()).toHaveLength(0);
    });
  });
});
