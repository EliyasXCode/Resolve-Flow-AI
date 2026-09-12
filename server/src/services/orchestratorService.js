import logger from '../utils/logger.js';
import Complaint from '../models/Complaint.js';
import Workflow from '../models/Workflow.js';
import runTriageAgent from '../agents/triageAgent.js';
import runResolutionAgent from '../agents/resolutionAgent.js';
import runCommunicationAgent from '../agents/communicationAgent.js';
import runActionAgent from '../agents/actionAgent.js';

/**
 * End-to-End Multi-Agent Orchestration Service (Phase 5)
 * Coordinates autonomous agent transitions through the finite state machine.
 *
 * Core Guarantee:
 * The orchestrator runs Stages 1 -> 2 -> 3 (Triage -> Knowledge Retrieval -> Resolution Recommendation)
 * and ALWAYS PAUSES at the Human Review Gate (PENDING_APPROVAL or NEEDS_MANUAL_REVIEW).
 * An autonomous agent is NEVER permitted to execute financial refunds or warehouse dispatches
 * without explicit human staff authorization.
 */
export const runOrchestrator = async (complaintId, { forceMock = false } = {}) => {
  const startTime = Date.now();
  logger.info(`🚀 Starting Orchestration Pipeline for Complaint ${complaintId}`);

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new Error(`Complaint not found: ${complaintId}`);
  }

  let workflow = await Workflow.findOne({ complaintId });
  if (!workflow) {
    workflow = await Workflow.create({
      complaintId,
      status: 'SUBMITTED',
      currentStage: 'SUBMITTED',
      stageOutputs: {},
    });
  }

  const pipelineStagesExecuted = [];

  // Stage 1: Triage Agent (if not yet executed)
  if (!workflow.stageOutputs?.triage) {
    logger.info(`[Orchestrator] Running Stage 1: Triage Agent for ${complaintId}`);
    const triageResult = await runTriageAgent(complaintId, { forceMock });
    pipelineStagesExecuted.push({
      stage: 'TRIAGE',
      category: triageResult.triage.category,
      priority: triageResult.triage.priority,
    });
    workflow = await Workflow.findOne({ complaintId });
  } else {
    pipelineStagesExecuted.push({
      stage: 'TRIAGE',
      note: 'Already executed (cached)',
    });
  }

  // Stage 2 & 3: Knowledge Retrieval & Resolution Agent (if not yet executed)
  if (!workflow.stageOutputs?.resolution) {
    logger.info(`[Orchestrator] Running Stages 2 & 3: Knowledge & Resolution Agent for ${complaintId}`);
    const resolutionResult = await runResolutionAgent(complaintId, { forceMock });
    pipelineStagesExecuted.push({
      stage: 'KNOWLEDGE_RETRIEVAL',
      citationsCount: resolutionResult.citations?.length || 0,
    });
    pipelineStagesExecuted.push({
      stage: 'RESOLUTION',
      action: resolutionResult.resolution.action,
      confidenceScore: resolutionResult.resolution.confidenceScore,
    });
    workflow = await Workflow.findOne({ complaintId });
  } else {
    pipelineStagesExecuted.push({
      stage: 'RESOLUTION',
      note: 'Already executed (cached)',
    });
  }

  const durationMs = Date.now() - startTime;

  logger.info(
    `⏸️ [Orchestrator] Pipeline paused at Human Review Gate (${workflow.status}) after ${durationMs}ms.`
  );

  return {
    success: true,
    complaintId,
    workflowId: workflow._id,
    currentStage: workflow.currentStage,
    status: workflow.status,
    pipelineStagesExecuted,
    pausedForHumanReview: true,
    message:
      'Autonomous pipeline completed through Resolution Recommendation. Paused at Human Review Gate for staff authorization.',
    durationMs,
  };
};

/**
 * Post-Approval Orchestration
 * Automatically runs Communication Agent & Action Agent sequentially once human staff has approved.
 */
export const runPostApprovalPipeline = async (
  complaintId,
  approvalId,
  { forceMock = false } = {}
) => {
  logger.info(`⚡ Executing Post-Approval Pipeline for Complaint ${complaintId}`);

  // 1. Run Communication Agent (drafts customer email)
  const draftResult = await runCommunicationAgent(complaintId, approvalId, { forceMock });

  // 2. Run Action Agent (executes simulated financial refund / warehouse dispatch)
  const actionResult = await runActionAgent(complaintId, { forceMock });

  const updatedWorkflow = await Workflow.findOne({ complaintId });

  return {
    success: true,
    draft: draftResult.draft,
    action: actionResult.action,
    finalStatus: actionResult.finalStatus,
    workflow: updatedWorkflow,
  };
};

export default {
  runOrchestrator,
  runPostApprovalPipeline,
};
