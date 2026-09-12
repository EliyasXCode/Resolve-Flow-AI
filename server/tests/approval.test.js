import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Complaint from '../src/models/Complaint.js';
import Workflow from '../src/models/Workflow.js';
import Approval from '../src/models/Approval.js';
import AgentExecution from '../src/models/AgentExecution.js';
import { runCommunicationAgent } from '../src/agents/communicationAgent.js';
import { communicationOutputSchema } from '../src/validators/communicationValidator.js';

describe('Phase 4 — Human Review & Communication Agent', () => {
  let customerToken;
  let supportToken;
  let customerId;
  let supportId;
  let testOrder;
  let testComplaint;
  let testWorkflow;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }

    const getAuthCookie = (headers) => {
      const cookies = headers['set-cookie'] || [];
      const match = cookies.find((c) => c.startsWith('resolveflow_token='));
      return match ? match.split(';')[0] : '';
    };

    // 1. Create a customer
    const resCustomer = await request(app).post('/api/auth/register').send({
      name: 'Approval Test Customer',
      email: `approval-cust-${Date.now()}@example.com`,
      password: 'CustPassword123!',
    });
    customerToken = getAuthCookie(resCustomer.headers);
    customerId = resCustomer.body.user.id;

    // 2. Log in as seeded Support staff
    const resSupport = await request(app).post('/api/auth/login').send({
      email: 'support@resolveflow.ai',
      password: 'SupportPassword123!',
    });
    supportToken = getAuthCookie(resSupport.headers);
    supportId = resSupport.body.user.id;

    // 3. Create test order
    testOrder = await Order.create({
      customerId,
      orderNumber: `ORD-APP-${Date.now()}`,
      items: [
        {
          name: 'HyperDrive 4K Drone',
          quantity: 1,
          price: 499.0,
          sku: 'HD-DRONE-4K',
        },
      ],
      totalAmount: 499.0,
      status: 'DELIVERED',
    });

    // 4. Create test complaint with resolution output already set
    testComplaint = await Complaint.create({
      customerId,
      orderId: testOrder._id,
      title: 'Drone gimbal motor damaged upon opening package',
      description: 'The camera gimbal motor was locked and burned out on first power on.',
      category: 'DAMAGED_ITEM',
      status: 'PENDING_APPROVAL',
    });

    testWorkflow = await Workflow.create({
      complaintId: testComplaint._id,
      status: 'PENDING_APPROVAL',
      currentStage: 'APPROVAL',
      stageOutputs: {
        triage: {
          category: 'DAMAGED_ITEM',
          urgency: 'HIGH',
          sentiment: 'NEGATIVE',
          summary: 'Gimbal motor defective on arrival.',
        },
        knowledge: {
          citations: [
            {
              title: 'Damaged & Defective Item Replacement Guarantee',
              text: 'Free replacement for damaged electronics.',
              relevanceScore: 0.92,
            },
          ],
        },
        resolution: {
          action: 'REPLACEMENT',
          justification: 'Merchandise arrived with defective electronic components.',
          policyReferences: [
            {
              title: 'Damaged & Defective Item Replacement Guarantee',
              citationText: 'Free replacement for damaged electronics.',
            },
          ],
          proposedParameters: {
            refundAmount: null,
            currency: 'USD',
            replacementItemName: 'HyperDrive 4K Drone',
            replacementSku: 'HD-DRONE-4K',
            informationRequested: null,
          },
          requiresApproval: true,
          confidenceScore: 0.95,
        },
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /.*approval-cust-.*@example\.com/ });
    if (testOrder) await Order.deleteOne({ _id: testOrder._id });
    if (testComplaint) {
      await Complaint.deleteOne({ _id: testComplaint._id });
      await Workflow.deleteOne({ complaintId: testComplaint._id });
      await Approval.deleteMany({ complaintId: testComplaint._id });
    }
    await AgentExecution.deleteMany({ stage: 'DRAFT' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('SECURITY: Customer CANNOT approve or reject their own complaint (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/workflows/${testComplaint._id}/review`)
      .set('Cookie', customerToken)
      .send({
        decision: 'APPROVED',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Only support and admin/i);
  });

  it('Support staff can 1-click APPROVE AI-recommended resolution and auto-draft customer email', async () => {
    const res = await request(app)
      .post(`/api/workflows/${testComplaint._id}/review`)
      .set('Cookie', supportToken)
      .send({
        decision: 'APPROVED',
        notes: 'Verified photo evidence and validated order. Approved for replacement.',
        forceMock: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.approval).toBeDefined();
    expect(res.body.approval.decision).toBe('APPROVED');
    expect(res.body.approval.notes).toBe('Verified photo evidence and validated order. Approved for replacement.');
    expect(res.body.approval.finalResolution.action).toBe('REPLACEMENT');

    // Verify Workflow and Complaint statuses advanced to RESPONSE_DRAFTED
    const updatedWorkflow = await Workflow.findOne({ complaintId: testComplaint._id });
    expect(updatedWorkflow.status).toBe('RESPONSE_DRAFTED');
    expect(updatedWorkflow.currentStage).toBe('ACTION');
    expect(updatedWorkflow.stageOutputs.draft).toBeDefined();
    expect(updatedWorkflow.stageOutputs.draft.subject).toBeDefined();

    const updatedComplaint = await Complaint.findById(testComplaint._id);
    expect(updatedComplaint.status).toBe('RESPONSE_DRAFTED');
  });

  it('Support staff can EDIT & APPROVE resolution with customized parameters', async () => {
    const res = await request(app)
      .post(`/api/workflows/${testComplaint._id}/review`)
      .set('Cookie', supportToken)
      .send({
        decision: 'MODIFIED',
        modifiedResolution: {
          action: 'REFUND',
          proposedParameters: {
            refundAmount: 499.0,
            currency: 'USD',
          },
        },
        notes: 'Customer requested full refund instead of replacement. Authorized full refund.',
        forceMock: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.approval.decision).toBe('MODIFIED');
    expect(res.body.approval.finalResolution.action).toBe('REFUND');
    expect(res.body.approval.finalResolution.proposedParameters.refundAmount).toBe(499.0);
    expect(res.body.approval.notes).toContain('Customer requested full refund');
  });

  it('Communication Agent outputs schema-compliant customer email draft', async () => {
    const result = await runCommunicationAgent(testComplaint._id, null, { forceMock: true });

    expect(result.success).toBe(true);
    expect(result.draft).toBeDefined();

    // Verify against Zod Schema
    const validated = communicationOutputSchema.safeParse(result.draft);
    expect(validated.success).toBe(true);
    expect(result.draft.tone).toBe('EMPATHETIC');
    expect(result.draft.actionAnnounced).toBe('REFUND');
    expect(result.draft.simulatedDelivery.channel).toBe('EMAIL');
    expect(result.draft.simulatedDelivery.status).toBe('SIMULATED_DISPATCHED');
  });

  it('Customer can view approval status and drafted customer email via GET /api/workflows/:complaintId', async () => {
    const res = await request(app)
      .get(`/api/workflows/${testComplaint._id}`)
      .set('Cookie', customerToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.workflow).toBeDefined();
    expect(res.body.workflow.stageOutputs.draft).toBeDefined();
    expect(res.body.approval).toBeDefined();
    expect(res.body.approval.decision).toBe('MODIFIED');
  });
});
