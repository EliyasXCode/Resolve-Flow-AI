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
import {
  executeSimulatedRefund,
  executeSimulatedReplacement,
  executeSimulatedInfoRequest,
  executeSimulatedRejection,
} from '../src/services/simulatedActionService.js';
import { runActionAgent } from '../src/agents/actionAgent.js';
import { runOrchestrator } from '../src/services/orchestratorService.js';

describe('Phase 5 — Action Execution & Full Orchestration', () => {
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
      name: 'Orchestration Test Customer',
      email: `orch-cust-${Date.now()}@example.com`,
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
      orderNumber: `ORD-ORCH-${Date.now()}`,
      items: [
        {
          name: 'Pro Wireless Headphones',
          quantity: 1,
          price: 299.0,
          sku: 'SKU-HEADPHONE-PRO',
        },
      ],
      totalAmount: 299.0,
      currency: 'USD',
      status: 'DELIVERED',
      shippingAddress: {
        street: '100 Innovation Way',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
      },
    });

    // 4. Create test complaint with approval and draft ready for action
    testComplaint = await Complaint.create({
      customerId,
      orderId: testOrder._id,
      title: 'Headphones cracked on arrival',
      description: 'The right earcup is broken and audio cuts out completely.',
      category: 'DAMAGED_ITEM',
      priority: 'HIGH',
      status: 'RESPONSE_DRAFTED',
    });

    testWorkflow = await Workflow.create({
      complaintId: testComplaint._id,
      status: 'RESPONSE_DRAFTED',
      currentStage: 'ACTION',
      stageOutputs: {
        triage: {
          category: 'DAMAGED_ITEM',
          priority: 'HIGH',
          sentiment: 'FRUSTRATED',
          urgencyScore: 8,
          suggestedRouting: 'SUPPORT_TIER_2',
          summary: 'Damaged headphone claim',
        },
        resolution: {
          action: 'REPLACEMENT',
          confidenceScore: 0.95,
          justification: 'Hardware defect covered by 30-day warranty.',
          policyReferences: ['RETURN_POLICY_SEC_3'],
          proposedParameters: {
            replacementItemName: 'Pro Wireless Headphones',
            replacementSku: 'SKU-HEADPHONE-PRO',
          },
        },
        draft: {
          subject: 'Replacement confirmed for your Pro Wireless Headphones',
          body: 'We have dispatched your replacement order.',
          tone: 'EMPATHETIC',
          actionAnnounced: 'REPLACEMENT',
          simulatedDelivery: {
            channel: 'EMAIL',
            recipient: 'orch-cust@example.com',
            status: 'SIMULATED_DISPATCHED',
          },
        },
      },
    });

    // Create approval
    const testApproval = await Approval.create({
      complaintId: testComplaint._id,
      workflowId: testWorkflow._id,
      reviewedBy: supportId,
      decision: 'APPROVED',
      originalResolution: testWorkflow.stageOutputs.resolution,
      finalResolution: testWorkflow.stageOutputs.resolution,
      notes: 'Approved standard replacement dispatch.',
    });

    testWorkflow.approvalId = testApproval._id;
    await testWorkflow.save();
  });

  afterAll(async () => {
    if (customerId) {
      await Complaint.deleteMany({ customerId });
      await Order.deleteMany({ customerId });
      await User.findByIdAndDelete(customerId);
    }
    if (testWorkflow) {
      await AgentExecution.deleteMany({ workflowId: testWorkflow._id });
      await Approval.deleteMany({ workflowId: testWorkflow._id });
      await Workflow.findByIdAndDelete(testWorkflow._id);
    }
  });

  it('Simulated Action Service generates realistic financial and shipping receipts', async () => {
    // Test Refund
    const refund = await executeSimulatedRefund(testOrder, { refundAmount: 299.0 });
    expect(refund.actionType).toBe('REFUND');
    expect(refund.status).toBe('SETTLED_SIMULATED');
    expect(refund.transactionId).toMatch(/^TXN_REFUND_/);
    expect(refund.amountRefunded).toBe(299.0);
    expect(refund.gateway).toContain('Stripe Payments');

    // Test Replacement
    const replacement = await executeSimulatedReplacement(testOrder, {
      replacementItemName: 'Pro Wireless Headphones',
      replacementSku: 'SKU-HEADPHONE-PRO',
    });
    expect(replacement.actionType).toBe('REPLACEMENT');
    expect(replacement.status).toBe('DISPATCHED_SIMULATED');
    expect(replacement.trackingNumber).toMatch(/^TRK_FEDEX_/);
    expect(replacement.carrier).toContain('FedEx');
    expect(replacement.estimatedDelivery).toBeDefined();

    // Test Info Request
    const info = await executeSimulatedInfoRequest({
      informationRequested: 'Photos of box damage',
    });
    expect(info.actionType).toBe('REQUEST_INFORMATION');
    expect(info.ticketId).toMatch(/^TICKET_INFO_/);

    // Test Rejection
    const reject = await executeSimulatedRejection({ justification: 'Policy exceeded' });
    expect(reject.actionType).toBe('REJECT');
    expect(reject.closureReference).toMatch(/^CASE_CLOSED_/);
  });

  it('Action Agent executes simulated action, updates workflow to COMPLETED, and records telemetry', async () => {
    const result = await runActionAgent(testComplaint._id);

    expect(result.success).toBe(true);
    expect(result.action).toBeDefined();
    expect(result.action.actionType).toBe('REPLACEMENT');
    expect(result.action.trackingNumber).toBeDefined();
    expect(result.finalStatus).toBe('COMPLETED');

    const updatedWorkflow = await Workflow.findOne({ complaintId: testComplaint._id });
    expect(updatedWorkflow.status).toBe('COMPLETED');
    expect(updatedWorkflow.currentStage).toBe('COMPLETED');
    expect(updatedWorkflow.stageOutputs.action).toBeDefined();
    expect(updatedWorkflow.stageOutputs.action.trackingNumber).toBe(result.action.trackingNumber);

    const updatedComplaint = await Complaint.findById(testComplaint._id);
    expect(updatedComplaint.status).toBe('COMPLETED');

    const executionLog = await AgentExecution.findById(result.executionId);
    expect(executionLog).toBeDefined();
    expect(executionLog.stage).toBe('ACTION');
    expect(executionLog.status).toBe('SUCCESS');
    expect(executionLog.model).toBe('SIMULATED_FINANCIAL_WAREHOUSE_ORCHESTRATOR');
  });

  it('Customer cannot trigger execute-action directly (403 forbidden)', async () => {
    const res = await request(app)
      .post(`/api/workflows/${testComplaint._id}/execute-action`)
      .set('Cookie', customerToken)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Support staff can call execute-action endpoint successfully', async () => {
    const res = await request(app)
      .post(`/api/workflows/${testComplaint._id}/execute-action`)
      .set('Cookie', supportToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.action).toBeDefined();
    expect(res.body.workflow.status).toBe('COMPLETED');
  });

  it('1-Click Orchestrator runs Stages 1-3 and strictly PAUSES at Human Review Gate', async () => {
    // Create a brand-new complaint for orchestration test
    const newComplaint = await Complaint.create({
      customerId,
      orderId: testOrder._id,
      title: 'Received wrong color item',
      description: 'Ordered silver headphones but received matte black instead.',
      category: 'UNSPECIFIED',
      priority: 'MEDIUM',
      status: 'SUBMITTED',
    });

    const orchResult = await runOrchestrator(newComplaint._id, { forceMock: true });

    expect(orchResult.success).toBe(true);
    expect(orchResult.pausedForHumanReview).toBe(true);
    expect(orchResult.pipelineStagesExecuted.length).toBeGreaterThanOrEqual(2);

    const orchWorkflow = await Workflow.findOne({ complaintId: newComplaint._id });
    expect(orchWorkflow).toBeDefined();
    // Stages 1-3 completed
    expect(orchWorkflow.stageOutputs.triage).toBeDefined();
    expect(orchWorkflow.stageOutputs.resolution).toBeDefined();

    // MUST be paused at review gate, NEVER auto-executed to COMPLETED
    expect(['PENDING_APPROVAL', 'NEEDS_MANUAL_REVIEW']).toContain(orchWorkflow.status);
    expect(orchWorkflow.stageOutputs.action).toBeNull();

    // Clean up
    await Complaint.findByIdAndDelete(newComplaint._id);
    await Workflow.findByIdAndDelete(orchWorkflow._id);
    await AgentExecution.deleteMany({ workflowId: orchWorkflow._id });
  });
});
