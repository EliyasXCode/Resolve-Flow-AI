import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import Complaint from '../models/Complaint.js';
import Order from '../models/Order.js';
import Workflow from '../models/Workflow.js';
import AgentExecution from '../models/AgentExecution.js';
import { retrievePolicyKnowledge } from '../services/knowledgeStage.js';
import { resolutionOutputSchema } from '../validators/resolutionValidator.js';
import {
  RESOLUTION_SYSTEM_INSTRUCTION,
  buildResolutionPrompt,
} from '../prompts/resolutionPrompt.js';

export const runResolutionAgent = async (complaintId, { forceMock = false } = {}) => {
  const complaint = await Complaint.findById(complaintId).populate('orderId');
  if (!complaint) {
    throw new Error(`Complaint not found: ${complaintId}`);
  }

  let workflow = await Workflow.findOne({ complaintId: complaint._id });
  if (!workflow) {
    workflow = await Workflow.create({
      complaintId: complaint._id,
      status: 'GENERATING_RESOLUTION',
      currentStage: 'RESOLUTION',
      stageOutputs: {},
    });
  }

  // 1. Execute deterministic Knowledge Stage (Vector Search Retrieval)
  const knowledgeOutput = await retrievePolicyKnowledge(complaintId, { forceMock });
  const citations = knowledgeOutput.citations || [];

  // Reload workflow from database to preserve knowledge stageOutputs
  workflow = await Workflow.findOne({ complaintId: complaint._id });
  if (!workflow.stageOutputs) workflow.stageOutputs = {};
  workflow.stageOutputs.knowledge = knowledgeOutput;

  const sanitizedInputSummary = `Complaint: "${complaint.title}" | Order: ${
    complaint.orderId ? complaint.orderId.orderNumber : 'None'
  } | Citations: ${citations.length}`;
  const modelToUse = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const startTime = Date.now();

  // If no policy citations found at all, mandate manual review as required
  if (citations.length === 0) {
    logger.warn(`No policy citations retrieved for complaint ${complaintId}. Triggering manual review.`);
    const fallbackDecision = {
      action: 'ESCALATE',
      justification:
        'No matching policy documents were retrieved from the vector knowledge base. Escalating for mandatory human staff review.',
      policyReferences: [],
      proposedParameters: {
        refundAmount: null,
        currency: 'USD',
        replacementItemName: null,
        replacementSku: null,
        informationRequested: 'Staff policy inspection required.',
      },
      requiresApproval: true,
      requiresHumanReview: true,
      confidenceScore: 0.2,
    };

    const validatedFallback = resolutionOutputSchema.parse(fallbackDecision);
    const durationMs = Date.now() - startTime;

    await AgentExecution.create({
      workflowId: workflow._id,
      stage: 'RESOLUTION',
      attempt: 1,
      sanitizedInputSummary,
      validatedOutput: validatedFallback,
      model: 'DETERMINISTIC_POLICY_GUARD',
      durationMs,
      tokenUsage: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
      status: 'SUCCESS',
    });

    workflow.stageOutputs.resolution = validatedFallback;
    workflow.status = 'NEEDS_MANUAL_REVIEW';
    workflow.currentStage = 'APPROVAL';
    workflow.markModified('stageOutputs');
    await workflow.save();

    complaint.status = 'NEEDS_MANUAL_REVIEW';
    await complaint.save();

    return {
      success: true,
      resolution: validatedFallback,
      citations: [],
      durationMs,
      model: 'DETERMINISTIC_POLICY_GUARD',
      isMock: true,
    };
  }

  // ForceMock mode for unit tests and CI
  if (forceMock || !env.GEMINI_API_KEY) {
    logger.info('Executing Resolution Agent in MOCK mode.');
    const mockAction = complaint.orderId ? 'REPLACEMENT' : 'REQUEST_INFORMATION';
    const mockDecision = {
      action: mockAction,
      justification: `[MOCK MODE] Recommendation based on policy "${citations[0]?.title}".`,
      policyReferences: [
        {
          title: citations[0]?.title || 'Store Policy',
          citationText: citations[0]?.text?.slice(0, 150) || 'Standard return terms.',
        },
      ],
      proposedParameters: {
        refundAmount: mockAction === 'REFUND' && complaint.orderId ? complaint.orderId.totalAmount : null,
        currency: complaint.orderId?.currency || 'USD',
        replacementItemName: complaint.orderId?.items?.[0]?.name || null,
        replacementSku: complaint.orderId?.items?.[0]?.sku || null,
        informationRequested: mockAction === 'REQUEST_INFORMATION' ? 'Proof of defect required' : null,
      },
      requiresApproval: true,
      requiresHumanReview: false,
      confidenceScore: 0.9,
    };

    const durationMs = Date.now() - startTime;
    const validated = resolutionOutputSchema.parse(mockDecision);

    const executionLog = await AgentExecution.create({
      workflowId: workflow._id,
      stage: 'RESOLUTION',
      attempt: 1,
      sanitizedInputSummary,
      validatedOutput: validated,
      model: 'MOCK_MODE_TEST_HARNESS',
      durationMs,
      tokenUsage: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
      status: 'SUCCESS',
    });

    workflow.stageOutputs.resolution = validated;
    workflow.status = 'PENDING_APPROVAL';
    workflow.currentStage = 'APPROVAL';
    workflow.markModified('stageOutputs');
    await workflow.save();

    complaint.status = 'PENDING_APPROVAL';
    await complaint.save();

    return {
      success: true,
      resolution: validated,
      citations,
      executionId: executionLog._id,
      durationMs,
      model: 'MOCK_MODE_TEST_HARNESS',
      isMock: true,
    };
  }

  // Live Gemini Resolution Agent
  const promptText = buildResolutionPrompt({
    complaint,
    order: complaint.orderId,
    policyCitations: citations,
  });

  const maxRetries = env.MAX_AI_RETRIES || 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    const attemptStartTime = Date.now();

    try {
      logger.info(`Invoking Resolution Agent via Gemini (${modelToUse}) - Attempt ${attempt}/${maxRetries}`);

      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Request Timeout exceeded')), env.AI_REQUEST_TIMEOUT_MS)
      );

      const generatePromise = ai.models.generateContent({
        model: modelToUse,
        contents: promptText,
        config: {
          systemInstruction: RESOLUTION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.1, // Very low temperature for grounded deterministic compliance
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const durationMs = Date.now() - attemptStartTime;

      const rawText = response.text?.trim() || '';
      if (!rawText) {
        throw new Error('Gemini returned an empty response');
      }

      const parsedJson = JSON.parse(rawText);
      const validated = resolutionOutputSchema.parse(parsedJson);

      const usage = response.usageMetadata || {};
      const tokenUsage = {
        promptTokens: usage.promptTokenCount || 0,
        candidatesTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      };

      const executionLog = await AgentExecution.create({
        workflowId: workflow._id,
        stage: 'RESOLUTION',
        attempt,
        sanitizedInputSummary,
        validatedOutput: validated,
        model: modelToUse,
        durationMs,
        tokenUsage,
        status: 'SUCCESS',
      });

      workflow.stageOutputs.resolution = validated;
      workflow.status = validated.requiresHumanReview ? 'NEEDS_MANUAL_REVIEW' : 'PENDING_APPROVAL';
      workflow.currentStage = 'APPROVAL';
      workflow.markModified('stageOutputs');
      await workflow.save();

      complaint.status = workflow.status;
      await complaint.save();

      logger.info(`✅ Resolution Agent completed successfully in ${durationMs}ms with action: ${validated.action}`);

      return {
        success: true,
        resolution: validated,
        citations,
        executionId: executionLog._id,
        durationMs,
        tokenUsage,
        model: modelToUse,
        isMock: false,
      };
    } catch (err) {
      lastError = err;
      const durationMs = Date.now() - attemptStartTime;
      logger.warn(`Resolution Agent attempt ${attempt} failed: ${err.message}`);

      if (attempt >= maxRetries) {
        await AgentExecution.create({
          workflowId: workflow._id,
          stage: 'RESOLUTION',
          attempt,
          sanitizedInputSummary,
          validatedOutput: null,
          model: modelToUse,
          durationMs,
          status: 'FAILED',
          error: err.message,
        });

        workflow.status = 'FAILED';
        workflow.lastError = `Resolution Agent failed: ${err.message}`;
        await workflow.save();

        complaint.status = 'FAILED';
        await complaint.save();

        throw err;
      }

      const backoffMs = Math.pow(2, attempt) * 500;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError || new Error('Resolution agent failed after maximum retries');
};

export default runResolutionAgent;
