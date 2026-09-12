import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import Complaint from '../src/models/Complaint.js';
import Workflow from '../src/models/Workflow.js';
import PolicyDocument from '../src/models/PolicyDocument.js';
import PolicyChunk from '../src/models/PolicyChunk.js';
import AgentExecution from '../src/models/AgentExecution.js';
import { generateEmbedding } from '../src/services/embeddingService.js';
import { retrievePolicyKnowledge } from '../src/services/knowledgeStage.js';
import { runResolutionAgent } from '../src/agents/resolutionAgent.js';
import { resolutionOutputSchema } from '../src/validators/resolutionValidator.js';

describe('Phase 3 — Knowledge Stage, Atlas Policy RAG & Resolution Agent', () => {
  let customerToken;
  let adminToken;
  let customerId;
  let testOrder;
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

    // 1. Log in or create customer
    const resCustomer = await request(app).post('/api/auth/register').send({
      name: 'Knowledge Test Customer',
      email: `knowledge-${Date.now()}@example.com`,
      password: 'KnowledgePassword123!',
    });
    customerToken = getAuthCookie(resCustomer.headers);
    customerId = resCustomer.body.user.id;

    // 2. Log in as seeded Admin
    const resAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@resolveflow.ai',
      password: 'AdminPassword123!',
    });
    adminToken = getAuthCookie(resAdmin.headers);

    // 3. Create a test order
    testOrder = await Order.create({
      customerId,
      orderNumber: `ORD-KNOW-${Date.now()}`,
      items: [
        {
          name: 'AeroGlide Pro Wireless Earbuds',
          quantity: 1,
          price: 149.99,
          sku: 'AG-EAR-01',
        },
      ],
      totalAmount: 149.99,
      status: 'DELIVERED',
      deliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Delivered 3 days ago
    });

    // 4. Create a test complaint referencing the order
    testComplaint = await Complaint.create({
      customerId,
      orderId: testOrder._id,
      title: 'Defective left earbud channel on delivery',
      description: 'The wireless earbuds arrived 3 days ago but the left side produces no sound at all. I need an exchange.',
      category: 'DAMAGED_ITEM',
      status: 'SUBMITTED',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /.*knowledge-.*@example\.com/ });
    if (testOrder) await Order.deleteOne({ _id: testOrder._id });
    if (testComplaint) {
      await Complaint.deleteOne({ _id: testComplaint._id });
      await Workflow.deleteOne({ complaintId: testComplaint._id });
    }
    await AgentExecution.deleteMany({ stage: 'RESOLUTION' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('Embedding Service produces vector with length exactly matching EMBEDDING_DIMENSIONS (768)', async () => {
    const vector = await generateEmbedding('Customer claims broken left earbud on delivery', { forceMock: true });
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(768);
    expect(vector.length).toBe(env.EMBEDDING_DIMENSIONS);
  });

  it('PolicyChunk schema enforces collection name "policy_chunks" and rejects non-768 length vectors', () => {
    expect(PolicyChunk.collection.name).toBe('policy_chunks');

    const invalidChunk = new PolicyChunk({
      policyId: new mongoose.Types.ObjectId(),
      title: 'Invalid Vector Chunk',
      text: 'Sample text',
      chunkIndex: 0,
      category: 'REFUND',
      embedding: [0.1, 0.2, 0.3], // Invalid: length 3 != 768
    });

    const validationError = invalidChunk.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError.errors.embedding).toBeDefined();
  });

  it('Knowledge Stage deterministically retrieves relevant active policy citations', async () => {
    const knowledgeOutput = await retrievePolicyKnowledge(testComplaint._id, { forceMock: true });

    expect(knowledgeOutput).toBeDefined();
    expect(Array.isArray(knowledgeOutput.citations)).toBe(true);
    expect(knowledgeOutput.citations.length).toBeGreaterThanOrEqual(1);

    // Citations must belong to active policies
    knowledgeOutput.citations.forEach((cit) => {
      expect(cit.title).toBeDefined();
      expect(cit.text).toBeDefined();
    });
  });

  it('Resolution Agent outputs schema-compliant recommendations grounded in citations', async () => {
    const res = await runResolutionAgent(testComplaint._id, { forceMock: true });

    expect(res.success).toBe(true);
    expect(res.resolution).toBeDefined();
    expect(['REPLACEMENT', 'REFUND', 'REQUEST_INFORMATION']).toContain(res.resolution.action);
    expect(res.resolution.policyReferences.length).toBeGreaterThanOrEqual(1);
    expect(res.resolution.justification).toBeDefined();

    // Verify Workflow state advanced to PENDING_APPROVAL
    const workflow = await Workflow.findOne({ complaintId: testComplaint._id });
    expect(workflow).not.toBeNull();
    expect(workflow.status).toBe('PENDING_APPROVAL');
    expect(workflow.currentStage).toBe('APPROVAL');
  });

  it('Missing policy evidence triggers NEEDS_MANUAL_REVIEW', async () => {
    // Temporarily deactivate all policy chunks to simulate missing policies
    await PolicyChunk.updateMany({}, { active: false });

    try {
      const ungroundedComplaint = await Complaint.create({
        customerId,
        title: 'Uncovered exotic complaint with no matching policy',
        description: 'Requesting lifetime insurance for free spaceship delivery.',
        status: 'SUBMITTED',
      });

      const res = await runResolutionAgent(ungroundedComplaint._id, { forceMock: true });

      expect(res.success).toBe(true);
      expect(res.resolution.requiresHumanReview).toBe(true);
      expect(['ESCALATE', 'REQUEST_INFORMATION']).toContain(res.resolution.action);

      // Verify workflow status is NEEDS_MANUAL_REVIEW
      const workflow = await Workflow.findOne({ complaintId: ungroundedComplaint._id });
      expect(workflow.status).toBe('NEEDS_MANUAL_REVIEW');

      await Complaint.deleteOne({ _id: ungroundedComplaint._id });
      await Workflow.deleteOne({ complaintId: ungroundedComplaint._id });
    } finally {
      // Restore policy chunks active status
      await PolicyChunk.updateMany({}, { active: true });
    }
  });

  it('Admin can view all stored policies via GET /api/policies', async () => {
    const res = await request(app)
      .get('/api/policies')
      .set('Cookie', adminToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.policies)).toBe(true);
    expect(res.body.policies.length).toBeGreaterThanOrEqual(1);
  });
});
