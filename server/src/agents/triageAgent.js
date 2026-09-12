import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { triageOutputSchema } from '../validators/triageValidator.js';
import { TRIAGE_SYSTEM_INSTRUCTION, buildTriagePrompt } from '../prompts/triagePrompt.js';
import AgentExecution from '../models/AgentExecution.js';
import Workflow from '../models/Workflow.js';
import Complaint from '../models/Complaint.js';

/**
 * Executes the Triage Agent on a given complaint.
 * Classifies category, urgency, sentiment, summary, and extracted entities.
 * Enforces Zod validation, capped retries, and comprehensive audit telemetry.
 */
export const runTriageAgent = async (complaintId, { forceMock = false } = {}) => {
  const complaint = await Complaint.findById(complaintId).populate('orderId');
  if (!complaint) {
    throw new Error(`Complaint not found with ID: ${complaintId}`);
  }

  // Find or create Workflow for this complaint
  let workflow = await Workflow.findOne({ complaintId: complaint._id });
  if (!workflow) {
    workflow = await Workflow.create({
      complaintId: complaint._id,
      status: 'SUBMITTED',
      currentStage: 'SUBMITTED',
      stageOutputs: {},
    });
  }

  // Update status to indicate triaging has commenced
  workflow.status = 'TRIAGING';
  workflow.currentStage = 'TRIAGE';
  await workflow.save();

  complaint.status = 'TRIAGING';
  await complaint.save();

  const promptText = buildTriagePrompt({
    title: complaint.title,
    description: complaint.description,
    orderContext: complaint.orderId
      ? {
          orderNumber: complaint.orderId.orderNumber,
          totalAmount: complaint.orderId.totalAmount,
          currency: complaint.orderId.currency,
          items: complaint.orderId.items,
        }
      : null,
  });

  const sanitizedInputSummary = `Title: ${complaint.title.slice(0, 80)} | Description length: ${complaint.description.length} chars`;
  const modelToUse = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const startTime = Date.now();

  // If forceMock or no API key present, provide clear mock fallback
  if (forceMock || !env.GEMINI_API_KEY) {
    logger.warn('Running Triage Agent in MOCK mode (explicitly labeled)');
    const mockOutput = {
      category: complaint.category !== 'UNSPECIFIED' ? complaint.category : 'DAMAGED_ITEM',
      urgency: 'MEDIUM',
      sentiment: 'NEGATIVE',
      summary: `[MOCK MODE] Customer grievances regarding ${complaint.title}.`,
      extractedEntities: {
        productNames: complaint.orderId?.items?.map((i) => i.name) || ['Product Item'],
        orderNumbers: complaint.orderId ? [complaint.orderId.orderNumber] : [],
        monetaryAmounts: complaint.orderId ? [`$${complaint.orderId.totalAmount}`] : [],
        deliveryDates: [],
        issuesDetected: ['Reported defect or delivery grievance'],
      },
      confidenceEstimate: 0.85,
      reasoning: 'Generated via deterministic mock test harness.',
    };

    const durationMs = Date.now() - startTime;
    const validated = triageOutputSchema.parse(mockOutput);

    const executionLog = await AgentExecution.create({
      workflowId: workflow._id,
      stage: 'TRIAGE',
      attempt: 1,
      sanitizedInputSummary,
      validatedOutput: validated,
      model: 'MOCK_MODE_TEST_HARNESS',
      durationMs,
      tokenUsage: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
      status: 'SUCCESS',
    });

    workflow.stageOutputs.triage = validated;
    workflow.currentStage = 'KNOWLEDGE';
    workflow.status = 'RETRIEVING_KNOWLEDGE';
    workflow.markModified('stageOutputs');
    await workflow.save();

    complaint.category = validated.category;
    complaint.priority = validated.urgency;
    complaint.status = 'RETRIEVING_KNOWLEDGE';
    await complaint.save();

    return {
      success: true,
      triage: validated,
      executionId: executionLog._id,
      durationMs,
      model: 'MOCK_MODE_TEST_HARNESS',
      isMock: true,
    };
  }

  // Live Gemini API Execution with capped exponential retries
  const maxRetries = env.MAX_AI_RETRIES || 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    const attemptStartTime = Date.now();

    try {
      logger.info(`Invoking Triage Agent via Gemini (${modelToUse}) - Attempt ${attempt}/${maxRetries}`);

      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

      // Run with timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Request Timeout exceeded')), env.AI_REQUEST_TIMEOUT_MS)
      );

      const generatePromise = ai.models.generateContent({
        model: modelToUse,
        contents: promptText,
        config: {
          systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.2, // Low temperature for deterministic classification
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const durationMs = Date.now() - attemptStartTime;

      const rawText = response.text?.trim() || '';
      if (!rawText) {
        throw new Error('Gemini returned an empty response');
      }

      // Parse JSON
      let parsedJson;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(`Model did not return valid JSON: ${rawText.slice(0, 100)}`);
      }

      // Validate against strict Zod schema
      const validatedOutput = triageOutputSchema.parse(parsedJson);

      // Extract token usage if returned by API
      const usage = response.usageMetadata || {};
      const tokenUsage = {
        promptTokens: usage.promptTokenCount || 0,
        candidatesTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      };

      // Record successful AgentExecution
      const executionLog = await AgentExecution.create({
        workflowId: workflow._id,
        stage: 'TRIAGE',
        attempt,
        sanitizedInputSummary,
        validatedOutput,
        model: modelToUse,
        durationMs,
        tokenUsage,
        status: 'SUCCESS',
      });

      // Advance Workflow stage atomically
      workflow.stageOutputs.triage = validatedOutput;
      workflow.markModified('stageOutputs');
      workflow.currentStage = 'KNOWLEDGE'; // Prepared for Phase 3
      workflow.status = 'RETRIEVING_KNOWLEDGE';
      await workflow.save();

      // Synchronize Complaint metadata
      complaint.category = validatedOutput.category;
      complaint.priority = validatedOutput.urgency;
      complaint.status = 'RETRIEVING_KNOWLEDGE';
      await complaint.save();

      logger.info(`✅ Triage Agent completed successfully in ${durationMs}ms`);

      return {
        success: true,
        triage: validatedOutput,
        executionId: executionLog._id,
        durationMs,
        tokenUsage,
        model: modelToUse,
        isMock: false,
      };
    } catch (err) {
      lastError = err;
      const durationMs = Date.now() - attemptStartTime;
      logger.warn(`Triage Agent attempt ${attempt} failed: ${err.message}`);

      // If permanent client error (e.g. invalid API key 401 or 400), don't retry in vain
      const isAuthOrClientError =
        err.message.includes('API_KEY_INVALID') ||
        err.message.includes('400') ||
        err.message.includes('401') ||
        err.message.includes('403');

      if (isAuthOrClientError || attempt >= maxRetries) {
        // Record failure execution
        await AgentExecution.create({
          workflowId: workflow._id,
          stage: 'TRIAGE',
          attempt,
          sanitizedInputSummary,
          validatedOutput: null,
          model: modelToUse,
          durationMs,
          status: 'FAILED',
          error: err.message,
        });

        workflow.status = 'FAILED';
        workflow.lastError = `Triage Agent failed: ${err.message}`;
        await workflow.save();

        complaint.status = 'FAILED';
        await complaint.save();

        throw err;
      }

      // Backoff before next attempt (1s, 2s...)
      const backoffMs = Math.pow(2, attempt) * 500;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError || new Error('Triage agent failed after maximum retries');
};

export default runTriageAgent;
