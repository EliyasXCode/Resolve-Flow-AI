import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Complaint from '../src/models/Complaint.js';
import Workflow from '../src/models/Workflow.js';
import AgentExecution from '../src/models/AgentExecution.js';
import { triageOutputSchema } from '../src/validators/triageValidator.js';
import { runTriageAgent } from '../src/agents/triageAgent.js';

describe('Phase 2 — Triage Agent, Schema Validation & Workflow Telemetry', () => {
  let customerToken;
  let otherCustomerToken;
  let customerId;
  let testComplaint;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }

    const getAuthCookie = (headers) => {
      const cookies = headers['set-cookie'] || [];
      const match = cookies.find((c) => c.startsWith('resolveflow_token='));
      return match ? match.split(';')[0] : '';
    };

    // 1. Create Customer A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Triage Customer',
      email: `triage-${Date.now()}@example.com`,
      password: 'TriagePassword123!',
    });
    customerToken = getAuthCookie(resA.headers);
    customerId = resA.body.user.id;

    // 2. Create Customer B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Other Customer',
      email: `other-triage-${Date.now()}@example.com`,
      password: 'OtherPassword123!',
    });
    otherCustomerToken = getAuthCookie(resB.headers);

    // 3. Create a test complaint for Customer A
    testComplaint = await Complaint.create({
      customerId,
      title: 'AeroGlide wireless earbuds left speaker not working',
      description: 'The package arrived yesterday and the left earbud has zero sound output. I need an exchange or refund of my $149.98 immediately.',
      category: 'UNSPECIFIED',
      status: 'SUBMITTED',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /.*triage-.*@example\.com/ });
    if (testComplaint) {
      await Complaint.deleteOne({ _id: testComplaint._id });
      await Workflow.deleteOne({ complaintId: testComplaint._id });
      await AgentExecution.deleteMany({});
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('Zod Schema rejects invalid AI outputs missing required fields', () => {
    const invalidOutput = {
      category: 'INVALID_CATEGORY_XYZ',
      // Missing urgency, sentiment, summary
    };

    const parseResult = triageOutputSchema.safeParse(invalidOutput);
    expect(parseResult.success).toBe(false);
  });

  it('Zod Schema validates well-formed Triage outputs with confidence estimates', () => {
    const validOutput = {
      category: 'DAMAGED_ITEM',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      summary: 'Customer reports defective earbud speaker on delivery.',
      extractedEntities: {
        productNames: ['AeroGlide earbuds'],
        orderNumbers: [],
        monetaryAmounts: ['$149.98'],
        deliveryDates: [],
        issuesDetected: ['left speaker not working'],
      },
      confidenceEstimate: 0.92,
      reasoning: 'Clear complaint of hardware failure.',
    };

    const parseResult = triageOutputSchema.safeParse(validOutput);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.confidenceEstimate).toBe(0.92);
      expect(parseResult.data.category).toBe('DAMAGED_ITEM');
    }
  });

  it('SECURITY: Customer B cannot trigger triage on Customer A complaint', async () => {
    const res = await request(app)
      .post(`/api/workflows/${testComplaint._id}/triage`)
      .set('Cookie', otherCustomerToken);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Runs Triage Agent in deterministic mock mode and persists audit telemetry', async () => {
    const result = await runTriageAgent(testComplaint._id, { forceMock: true });

    expect(result.success).toBe(true);
    expect(result.isMock).toBe(true);
    expect(result.model).toBe('MOCK_MODE_TEST_HARNESS');
    expect(result.triage.category).toBeDefined();

    // Verify Workflow state was updated
    const workflow = await Workflow.findOne({ complaintId: testComplaint._id });
    expect(workflow).not.toBeNull();
    expect(workflow.status).toBe('RETRIEVING_KNOWLEDGE');
    expect(workflow.stageOutputs.triage).toBeDefined();

    // Verify AgentExecution was logged
    const execution = await AgentExecution.findById(result.executionId);
    expect(execution).not.toBeNull();
    expect(execution.stage).toBe('TRIAGE');
    expect(execution.status).toBe('SUCCESS');
  });

  it('GET /api/workflows/:complaintId returns workflow state and executions', async () => {
    const res = await request(app)
      .get(`/api/workflows/${testComplaint._id}`)
      .set('Cookie', customerToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.workflow).toBeDefined();
    expect(Array.isArray(res.body.executions)).toBe(true);
    expect(res.body.executions.length).toBeGreaterThanOrEqual(1);
  });
});
