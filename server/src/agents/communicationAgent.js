import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Workflow from '../models/Workflow.js';
import Approval from '../models/Approval.js';
import AgentExecution from '../models/AgentExecution.js';
import { communicationOutputSchema } from '../validators/communicationValidator.js';
import {
  COMMUNICATION_SYSTEM_INSTRUCTION,
  buildCommunicationPrompt,
} from '../prompts/communicationPrompt.js';

export const runCommunicationAgent = async (
  complaintId,
  approvalId = null,
  { forceMock = false } = {}
) => {
  const complaint = await Complaint.findById(complaintId)
    .populate('customerId')
    .populate('orderId');

  if (!complaint) {
    throw new Error(`Complaint not found: ${complaintId}`);
  }

  let workflow = await Workflow.findOne({ complaintId: complaint._id });
  if (!workflow) {
    throw new Error(`Workflow not found for complaint: ${complaintId}`);
  }

  let approval = null;
  if (approvalId) {
    approval = await Approval.findById(approvalId);
  } else if (workflow.approvalId) {
    approval = await Approval.findById(workflow.approvalId);
  } else {
    approval = await Approval.findOne({ complaintId: complaint._id }).sort({ createdAt: -1 });
  }

  const approvedResolution = approval
    ? approval.finalResolution
    : workflow.stageOutputs?.resolution;

  if (!approvedResolution) {
    throw new Error('Cannot draft customer communication without an approved or recommended resolution.');
  }

  const customer = complaint.customerId;
  const order = complaint.orderId;
  const staffNotes = approval ? approval.notes : '';
  const customerEmail = customer?.email || 'customer@example.com';

  const sanitizedInputSummary = `Draft email for "${customer?.name || 'Customer'}" | Action: ${
    approvedResolution.action
  } | Order: ${order ? order.orderNumber : 'None'}`;
  const modelToUse = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const startTime = Date.now();

  // 1. Deterministic Mock Mode for CI and tests
  if (forceMock || !env.GEMINI_API_KEY) {
    logger.info('Executing Communication Agent in MOCK mode.');
    const action = approvedResolution.action || 'REPLACEMENT';

    let mockSubject = `Update regarding your ResolveFlow claim for ${complaint.title}`;
    let mockBody = `Dear ${customer?.name || 'Customer'},\n\nThank you for reaching out to us regarding "${complaint.title}".\n\n`;

    if (action === 'REPLACEMENT') {
      mockSubject = `Your replacement order has been approved - Order ${order ? order.orderNumber : ''}`;
      mockBody += `We sincerely apologize for the inconvenience you experienced with your item. We have approved an immediate free replacement for you.\n\nOur fulfillment team is currently processing your replacement. You will receive tracking details shortly.\n\nThank you for choosing ResolveFlow.`;
    } else if (action === 'REFUND') {
      const amt = approvedResolution.proposedParameters?.refundAmount || order?.totalAmount || '100.00';
      mockSubject = `Refund Confirmation for Order ${order ? order.orderNumber : ''}`;
      mockBody += `We have reviewed your request and approved a full refund of $${amt}. The credit will reflect on your original payment method in 3-5 business days.\n\nThank you for your patience with us.`;
    } else if (action === 'REQUEST_INFORMATION') {
      mockSubject = `Action Needed: Additional details required for claim ${complaint._id}`;
      mockBody += `To help us swiftly process your claim, could you please reply with the following required information:\n- ${
        approvedResolution.proposedParameters?.informationRequested || 'Proof of purchase or photo of item'
      }\n\nOnce received, we will finalize your resolution immediately.`;
    } else {
      mockSubject = `Update regarding your claim ${complaint._id}`;
      mockBody += `Our support team has reviewed your claim regarding "${complaint.title}". Based on our corporate policy guidelines, we have reviewed the incident details: ${approvedResolution.justification}\n\nPlease feel free to contact us if you have any questions.`;
    }

    const mockOutput = {
      subject: mockSubject,
      body: mockBody,
      tone: 'EMPATHETIC',
      actionAnnounced: action,
      keyPointsCovered: [
        `Acknowledgment of grievance: ${complaint.title}`,
        `Notification of approved action: ${action}`,
        'Next steps and customer support contact availability',
      ],
      simulatedDelivery: {
        channel: 'EMAIL',
        recipient: customerEmail,
        status: 'SIMULATED_DISPATCHED',
      },
    };

    const validated = communicationOutputSchema.parse(mockOutput);
    const durationMs = Date.now() - startTime;

    const executionLog = await AgentExecution.create({
      workflowId: workflow._id,
      stage: 'DRAFT',
      attempt: 1,
      sanitizedInputSummary,
      validatedOutput: validated,
      model: 'MOCK_MODE_TEST_HARNESS',
      durationMs,
      tokenUsage: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
      status: 'SUCCESS',
    });

    if (!workflow.stageOutputs) workflow.stageOutputs = {};
    workflow.stageOutputs.draft = validated;
    workflow.status = 'RESPONSE_DRAFTED';
    workflow.currentStage = 'ACTION';
    workflow.markModified('stageOutputs');
    await workflow.save();

    complaint.status = 'RESPONSE_DRAFTED';
    await complaint.save();

    return {
      success: true,
      draft: validated,
      executionId: executionLog._id,
      durationMs,
      model: 'MOCK_MODE_TEST_HARNESS',
      isMock: true,
    };
  }

  // 2. Live Gemini Execution
  const promptText = buildCommunicationPrompt({
    complaint,
    customer,
    order,
    approvedResolution,
    staffNotes,
  });

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const maxRetries = env.MAX_AI_RETRIES || 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    const attemptStartTime = Date.now();

    try {
      logger.info(`Invoking Communication Agent via Gemini (${modelToUse}) - Attempt ${attempt}/${maxRetries}`);

      const responsePromise = ai.models.generateContent({
        model: modelToUse,
        contents: promptText,
        config: {
          systemInstruction: COMMUNICATION_SYSTEM_INSTRUCTION,
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Communication Agent request timed out after ${env.AI_REQUEST_TIMEOUT_MS}ms`)),
          env.AI_REQUEST_TIMEOUT_MS
        )
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const rawText =
        (typeof response.text === 'string' ? response.text : null) ||
        (typeof response.text === 'function' ? response.text() : null) ||
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        '';

      if (!rawText) {
        throw new Error('Gemini returned an empty response for customer communication drafting.');
      }

      let parsedJson;
      try {
        parsedJson = JSON.parse(rawText.trim());
      } catch (parseErr) {
        throw new Error(`Failed to parse model JSON: ${parseErr.message}. Raw output was: ${rawText.slice(0, 150)}`);
      }

      // Ensure simulatedDelivery has recipient
      if (parsedJson && !parsedJson.simulatedDelivery) {
        parsedJson.simulatedDelivery = {
          channel: 'EMAIL',
          recipient: customerEmail,
          status: 'SIMULATED_DISPATCHED',
        };
      }

      const validated = communicationOutputSchema.parse(parsedJson);
      const durationMs = Date.now() - attemptStartTime;

      const usage = response.usageMetadata || {};
      const tokenUsage = {
        promptTokens: usage.promptTokenCount || 0,
        candidatesTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      };

      const executionLog = await AgentExecution.create({
        workflowId: workflow._id,
        stage: 'DRAFT',
        attempt,
        sanitizedInputSummary,
        validatedOutput: validated,
        model: modelToUse,
        durationMs,
        tokenUsage,
        status: 'SUCCESS',
      });

      if (!workflow.stageOutputs) workflow.stageOutputs = {};
      workflow.stageOutputs.draft = validated;
      workflow.status = 'RESPONSE_DRAFTED';
      workflow.currentStage = 'ACTION';
      workflow.markModified('stageOutputs');
      await workflow.save();

      complaint.status = 'RESPONSE_DRAFTED';
      await complaint.save();

      logger.info(`✅ Communication Agent drafted email in ${durationMs}ms`);

      return {
        success: true,
        draft: validated,
        executionId: executionLog._id,
        durationMs,
        tokenUsage,
        model: modelToUse,
        isMock: false,
      };
    } catch (err) {
      lastError = err;
      const durationMs = Date.now() - attemptStartTime;
      logger.warn(`Communication Agent attempt ${attempt} failed: ${err.message}`);

      if (attempt >= maxRetries) {
        await AgentExecution.create({
          workflowId: workflow._id,
          stage: 'DRAFT',
          attempt,
          sanitizedInputSummary,
          validatedOutput: null,
          model: modelToUse,
          durationMs,
          status: 'FAILED',
          error: err.message,
        });

        throw err;
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      logger.info(`Retrying Communication Agent in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('Communication Agent failed after maximum retry attempts.');
};

export default runCommunicationAgent;
