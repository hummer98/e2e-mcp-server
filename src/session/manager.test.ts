import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Session Manager', () => {
  beforeEach(async () => {
    jest.useFakeTimers();

    // Clear session store
    const { SessionStore } = await import('./store.js');
    const store = SessionStore.getInstance();
    store.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should execute server command and create session', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // This will fail because /usr/bin/test-server doesn't exist
      // But it tests the integration
      const result = await manager.startSession('/usr/bin/test-server', ['--start']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should fail at command execution stage
        expect(result.error.type).toBe('invalid_command');
      }
    });

    it('should create session with valid JSON response', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // Use /bin/echo with JSON output to simulate successful server start
      const result = await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionId).toBeDefined();
        expect(result.value.serverInfo.port).toBe(3001);
        expect(result.value.serverInfo.pid).toBe(12345);
      }
    });
  });

  describe('stopSession', () => {
    it('should execute shutdown command and delete session', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // First create a session
      const startResult = await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      // Stop the session
      const stopResult = await manager.stopSession(sessionId, '/bin/echo', [
        '{"status":"stopped","message":"Server stopped"}',
      ]);

      expect(stopResult.ok).toBe(true);
      if (stopResult.ok) {
        expect(stopResult.value.status).toBe('stopped');
      }

      // Verify session is deleted
      const getResult = manager.getSession(sessionId);
      expect(getResult.ok).toBe(false);
    });

    it('should return error for non-existent session', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      const result = await manager.stopSession('non-existent-id', '/bin/echo', ['{}']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('session_not_found');
      }
    });
  });

  describe('getSession', () => {
    it('should retrieve session by ID', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // Create a session
      const startResult = await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      const getResult = manager.getSession(sessionId);

      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value.sessionId).toBe(sessionId);
      }
    });
  });

  describe('timeout handling', () => {
    it('should auto-cleanup session after timeout', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 5000 }); // 5 second timeout

      // Create a session
      const startResult = await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      // Session should exist immediately
      let getResult = manager.getSession(sessionId);
      expect(getResult.ok).toBe(true);

      // Advance time by 6 seconds (past timeout)
      jest.advanceTimersByTime(6000);

      // Session should be cleaned up
      getResult = manager.getSession(sessionId);
      expect(getResult.ok).toBe(false);
    });

    it('should reset timeout on session update', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 5000 });

      // Create a session
      const startResult = await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      // Advance time by 3 seconds
      jest.advanceTimersByTime(3000);

      // Update session (simulating activity)
      manager.updateSessionActivity(sessionId);

      // Advance another 3 seconds (total 6, but timeout was reset)
      jest.advanceTimersByTime(3000);

      // Session should still exist (only 3 seconds since last activity)
      const getResult = manager.getSession(sessionId);
      expect(getResult.ok).toBe(true);
    });
  });

  describe('getSessionStatus', () => {
    it('should execute status command and return response', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // First create a session
      const startResult = await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      // Get session status
      const statusResult = await manager.getSessionStatus(sessionId, '/bin/echo', [
        '{"status":"running","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","uptime":120,"healthy":true,"message":"Server is running"}',
      ]);

      expect(statusResult.ok).toBe(true);
      if (statusResult.ok) {
        expect(statusResult.value.status).toBe('running');
        expect(statusResult.value.port).toBe(3001);
        expect(statusResult.value.healthy).toBe(true);
      }

      // Cleanup
      await manager.stopSession(sessionId, '/bin/echo', ['{"status":"stopped","message":"Server stopped"}']);
    });

    it('should return error for non-existent session', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      const result = await manager.getSessionStatus('non-existent-id', '/bin/echo', ['{}']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('session_not_found');
      }
    });

    it('should update session activity on status check', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 5000 });

      // Create a session
      const startResult = await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      // Advance time by 3 seconds
      jest.advanceTimersByTime(3000);

      // Check status (should reset timer)
      await manager.getSessionStatus(sessionId, '/bin/echo', [
        '{"status":"running","message":"OK"}',
      ]);

      // Advance another 3 seconds (total 6, but timer was reset)
      jest.advanceTimersByTime(3000);

      // Session should still exist (only 3 seconds since status check)
      const getResult = manager.getSession(sessionId);
      expect(getResult.ok).toBe(true);

      // Cleanup
      await manager.stopSession(sessionId, '/bin/echo', ['{"status":"stopped","message":"Server stopped"}']);
    });
  });

  describe('readSessionLogs', () => {
    it('should read logs from session log paths', async () => {
      const { SessionManager } = await import('./manager.js');
      const fs = await import('fs');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // Create temporary log files
      const tmpStdout = '/tmp/test-session-stdout.log';
      const tmpStderr = '/tmp/test-session-stderr.log';
      const tmpCombined = '/tmp/test-session-combined.log';

      fs.writeFileSync(tmpStdout, 'Line 1\nLine 2\nLine 3\n');
      fs.writeFileSync(tmpStderr, 'Error 1\nError 2\n');
      fs.writeFileSync(tmpCombined, 'Combined 1\nCombined 2\n');

      // Create a session with log paths
      const startResult = await manager.startSession('/bin/echo', [
        `{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"${tmpStdout}","stderr":"${tmpStderr}","combined":"${tmpCombined}"},"message":"Server started"}`,
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      // Read stdout logs
      const stdoutResult = await manager.readSessionLogs(sessionId, 'stdout');
      expect(stdoutResult.ok).toBe(true);
      if (stdoutResult.ok) {
        expect(stdoutResult.value).toContain('Line 1');
        expect(stdoutResult.value).toContain('Line 3');
      }

      // Read stderr logs
      const stderrResult = await manager.readSessionLogs(sessionId, 'stderr');
      expect(stderrResult.ok).toBe(true);
      if (stderrResult.ok) {
        expect(stderrResult.value).toContain('Error 1');
      }

      // Cleanup
      fs.unlinkSync(tmpStdout);
      fs.unlinkSync(tmpStderr);
      fs.unlinkSync(tmpCombined);
      await manager.stopSession(sessionId, '/bin/echo', ['{"status":"stopped","message":"Server stopped"}']);
    });

    it('should return error for non-existent session', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      const result = await manager.readSessionLogs('non-existent-id', 'stdout');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('session_not_found');
      }
    });

    it('should support limiting number of lines', async () => {
      const { SessionManager } = await import('./manager.js');
      const fs = await import('fs');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // Create temporary log file with multiple lines
      const tmpLog = '/tmp/test-session-limit.log';
      const lines = Array.from({ length: 200 }, (_, i) => `Line ${i + 1}`).join('\n');
      fs.writeFileSync(tmpLog, lines + '\n');

      // Create a session
      const startResult = await manager.startSession('/bin/echo', [
        `{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"${tmpLog}","stderr":"${tmpLog}","combined":"${tmpLog}"},"message":"Server started"}`,
      ]);

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sessionId = startResult.value.sessionId;

      // Read with lines limit
      const result = await manager.readSessionLogs(sessionId, 'stdout', { lines: 50 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const lineCount = result.value.split('\n').filter(l => l).length;
        expect(lineCount).toBeLessThanOrEqual(50);
      }

      // Cleanup
      fs.unlinkSync(tmpLog);
      await manager.stopSession(sessionId, '/bin/echo', ['{"status":"stopped","message":"Server stopped"}']);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all sessions', async () => {
      const { SessionManager } = await import('./manager.js');
      const manager = new SessionManager({ sessionTimeout: 60000 });

      // Create multiple sessions
      await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3001","port":3001,"pid":12345,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      await manager.startSession('/bin/echo', [
        '{"status":"ready","url":"http://localhost:3002","port":3002,"pid":12346,"startedAt":"2025-11-02T10:00:00Z","logs":{"stdout":"/tmp/stdout.log","stderr":"/tmp/stderr.log","combined":"/tmp/combined.log"},"message":"Server started"}',
      ]);

      expect(manager.getAllSessions()).toHaveLength(2);

      await manager.cleanup();

      expect(manager.getAllSessions()).toHaveLength(0);
    });
  });
});
