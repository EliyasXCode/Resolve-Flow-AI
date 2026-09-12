import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';

describe('Authentication & Role Escalation Security', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
  });

  afterAll(async () => {
    // Clean up test user created in this suite
    await User.deleteMany({ email: /.*test-auth-.*@example\.com/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  const testEmail = `test-auth-${Date.now()}@example.com`;

  it('should register a new user as "customer" by default', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Customer',
        email: testEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('customer');

    // Confirm in DB that role is strictly customer
    const savedUser = await User.findOne({ email: testEmail });
    expect(savedUser).not.toBeNull();
    expect(savedUser.role).toBe('customer');
  });

  it('SECURITY: should REJECT registration attempting to inject "admin" role', async () => {
    const maliciousEmail = `test-auth-hacker-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker Attempt',
        email: maliciousEmail,
        password: 'Password123!',
        role: 'admin',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Verify user was NOT created in DB
    const hacker = await User.findOne({ email: maliciousEmail });
    expect(hacker).toBeNull();
  });

  it('SECURITY: should REJECT registration attempting to inject "support" role', async () => {
    const maliciousEmail = `test-auth-support-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Fake Support',
        email: maliciousEmail,
        password: 'Password123!',
        role: 'support',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should log in successfully with valid credentials and return http-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const hasAuthCookie = cookies.some((c) => c.includes('resolveflow_token'));
    expect(hasAuthCookie).toBe(true);
  });

  it('should reject login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
