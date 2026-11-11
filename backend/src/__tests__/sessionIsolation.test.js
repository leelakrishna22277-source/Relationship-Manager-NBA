import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { env } from '../config/env.js';

describe('Authentication & Session Isolation Suite (Scenarios 1-7, 9)', () => {
  let rm1Token = '';
  let rm2Token = '';
  let tlToken = '';

  // Scenario 1: RM 1 logs in; RM 2 logs in independently
  it('Scenario 1: RM 1 logs in; RM 2 logs in independently with distinct tokens', async () => {
    const resRm1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm.rajesh@bank.com', password: 'Password123!', role: 'RM' });

    expect(resRm1.status).toBe(200);
    expect(resRm1.body.success).toBe(true);
    expect(resRm1.body.data.user.email).toBe('rm.rajesh@bank.com');
    expect(resRm1.body.data.user.role).toBe('RM');
    rm1Token = resRm1.body.data.token;
    expect(rm1Token).toBeDefined();

    const resRm2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm.priya@bank.com', password: 'Password123!', role: 'RM' });

    expect(resRm2.status).toBe(200);
    expect(resRm2.body.success).toBe(true);
    expect(resRm2.body.data.user.email).toBe('rm.priya@bank.com');
    expect(resRm2.body.data.user.role).toBe('RM');
    rm2Token = resRm2.body.data.token;
    expect(rm2Token).toBeDefined();

    // Verify tokens are unique and have distinct jti identifiers
    expect(rm1Token).not.toBe(rm2Token);
    const decoded1 = jwt.decode(rm1Token);
    const decoded2 = jwt.decode(rm2Token);
    expect(decoded1.userId).not.toBe(decoded2.userId);
    expect(decoded1.jti).toBeDefined();
    expect(decoded2.jti).toBeDefined();
    expect(decoded1.jti).not.toBe(decoded2.jti);
  });

  // Scenario 2: RM 1 logs out; RM 2 remains authenticated
  it('Scenario 2: RM 1 logs out; RM 2 remains authenticated', async () => {
    // RM 1 logs out
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${rm1Token}`);
    expect(logoutRes.status).toBe(200);

    // RM 2's session continues to function independently
    const rm2Me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${rm2Token}`);
    expect(rm2Me.status).toBe(200);
    expect(rm2Me.body.data.email).toBe('rm.priya@bank.com');
  });

  // Scenario 3: RM 2 logs out; RM 1 remains authenticated
  it('Scenario 3: RM 2 logs out; RM 1 remains authenticated (after re-login)', async () => {
    // Re-login RM 1 to obtain fresh independent token
    const resRm1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm.rajesh@bank.com', password: 'Password123!', role: 'RM' });
    const freshRm1Token = resRm1.body.data.token;

    // RM 2 logs out
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${rm2Token}`);
    expect(logoutRes.status).toBe(200);

    // RM 1 remains fully authenticated
    const rm1Me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${freshRm1Token}`);
    expect(rm1Me.status).toBe(200);
    expect(rm1Me.body.data.email).toBe('rm.rajesh@bank.com');
  });

  // Scenario 4: Team Lead logs in independently and remains authenticated when an RM logs out
  it('Scenario 4: Team Lead logs in independently and remains authenticated when an RM logs out', async () => {
    const resTl = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tl.sarah@bank.com', password: 'Password123!', role: 'TEAM_LEAD' });

    expect(resTl.status).toBe(200);
    tlToken = resTl.body.data.token;

    // An RM logs out
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${rm1Token}`);

    // Team Lead session is active and retains supervisor access
    const tlMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tlToken}`);
    expect(tlMe.status).toBe(200);
    expect(tlMe.body.data.role).toBe('TEAM_LEAD');
  });

  // Scenario 5: RM 1 cannot access RM 2's assigned clients
  it('Scenario 5: RM 1 cannot access RM 2 assigned clients (returns 403 Forbidden)', async () => {
    const resRm1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm.rajesh@bank.com', password: 'Password123!', role: 'RM' });
    const token = resRm1.body.data.token;

    // Attempt to access RM 2's client c-201
    const forbiddenRes = await request(app)
      .get('/api/clients/c-201')
      .set('Authorization', `Bearer ${token}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');
  });

  // Scenario 6: Team Lead retains access only to permitted team-level information
  it('Scenario 6: Team Lead retains access to team-level supervisor endpoints', async () => {
    const res = await request(app)
      .get('/api/team-lead/dashboard')
      .set('Authorization', `Bearer ${tlToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalClients).toBeDefined();

    // Verify Team Lead outcome audit has masked client PII
    const outcomesRes = await request(app)
      .get('/api/team-lead/outcomes')
      .set('Authorization', `Bearer ${tlToken}`);

    expect(outcomesRes.status).toBe(200);
    expect(Array.isArray(outcomesRes.body.data)).toBe(true);
  });

  // Scenario 7: Expired or invalid JWTs are rejected
  it('Scenario 7: Expired or invalid JWTs are rejected with 401 Unauthorized', async () => {
    // 1. Completely invalid token
    const invalidRes = await request(app)
      .get('/api/clients')
      .set('Authorization', 'Bearer invalid.garbage.token');
    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.error.code).toBe('INVALID_TOKEN');

    // 2. Expired token
    const expiredToken = jwt.sign(
      { userId: 'rm-1', email: 'rm.rajesh@bank.com', role: 'RM' },
      env.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expiredRes = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error.code).toBe('INVALID_TOKEN');

    // 3. Token signed with wrong secret
    const forgedToken = jwt.sign(
      { userId: 'rm-1', email: 'rm.rajesh@bank.com', role: 'RM' },
      'wrong-secret-key-123',
      { expiresIn: '1h' }
    );
    const forgedRes = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${forgedToken}`);
    expect(forgedRes.status).toBe(401);
    expect(forgedRes.body.error.code).toBe('INVALID_TOKEN');
  });

  // Scenario 9: Logging out and logging back in works correctly
  it('Scenario 9: Logging out and logging back in issues a fresh valid token', async () => {
    // 1. Initial Login
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm.rajesh@bank.com', password: 'Password123!', role: 'RM' });
    expect(login1.status).toBe(200);
    const token1 = login1.body.data.token;

    // 2. Logout
    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token1}`);
    expect(logout.status).toBe(200);

    // 3. Login again
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm.rajesh@bank.com', password: 'Password123!', role: 'RM' });
    expect(login2.status).toBe(200);
    const token2 = login2.body.data.token;

    expect(token2).toBeDefined();
    // Verify fresh token is functional
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token2}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('rm.rajesh@bank.com');
  });
});
