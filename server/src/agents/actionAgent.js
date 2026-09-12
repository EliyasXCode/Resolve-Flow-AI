import logger from '../utils/logger.js';
import Complaint from '../models/Complaint.js';
import Workflow from '../models/Workflow.js';
import Approval from '../models/Approval.js';
import AgentExecution from '../models/AgentExecution.js';
import { dispatchSimulatedAction } from '../services/simulatedActionService.js';

/**
 * Action Agent (Phase 5)
 * Final autonomous stage in the ResolveFlow AI pipeline.
 * Safely executes simulated financial settlements, warehouse shipping orders,
 * customer information collection requests, or case closures.
 *
 * All operations generate production-realistic simulated telemetry and immutable
 * audit records without touching actual live banking or courier networks.
 */
export const runActionAgent = async (complaintId, { forceMock = true } = {}) => {
  const startTime = Date.now();

  const complaint = await Complaint.findById(complaintId)
    .populate('customerId')
    .populate('orderId');

  if (!complaint) {
    throw new Error(`Complaint not found: ${complaintId}`);
  }

  const workflow = await Workflow.findOne({ complaintId: complaint._id });
  if (!workflow) {
    throw new Error(`Workflow not found for complaint: ${complaintId}`);
  }

  // 1. Locate corresponding approval record if present
  let approval = null;
  if (workflow.approvalId) {
    approval = await Approval.findById(workflow.approvalId);
  } else {
    approval = await Approval.findOne({ complaintId: complaint._id }).sort({ createdAt: -1 });
  }

  // Determine resolution definition
  const resolution =
    approval?.finalResolution || workflow.stageOutputs?.resolution;

  if (!resolution) {
    throw new Error('Cannot execute action without an approved or recommended resolution.');
  }

  const actionType = resolution.action || 'REFUND';
  const parameters = resolution.proposedParameters || {};
  const order = complaint.orderId;

  const sanitizedInputSummary = `Execute simulated ${actionType} for Complaint "${complaint.title}" | Order: ${
    order ? order.orderNumber : 'N/A'
  }`;

  // Advance to executing state
  complaint.status = 'EXECUTING_ACTION';
  await complaint.save();
  workflow.status = 'EXECUTING_ACTION';
  workflow.currentStage = 'ACTION';
  await workflow.save();

  logger.info(`⚡ Action Agent executing simulated ${actionType} for Complaint ${complaint._id}`);

  // 2. Dispatch simulated action
  const actionResult = await dispatchSimulatedAction(actionType, order, parameters);
  const durationMs = Date.now() - startTime;

  // 3. Record AgentExecution telemetry
  const executionLog = await AgentExecution.create({
    workflowId: workflow._id,
    stage: 'ACTION',
    attempt: 1,
    sanitizedInputSummary,
    validatedOutput: actionResult,
    model: 'SIMULATED_FINANCIAL_WAREHOUSE_ORCHESTRATOR',
    durationMs,
    tokenUsage: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
    status: 'SUCCESS',
  });

  // 4. Update workflow state & complete pipeline
  if (!workflow.stageOutputs) workflow.stageOutputs = {};
  workflow.stageOutputs.action = actionResult;

  const finalStatus =
    actionType === 'REJECT' && approval?.decision === 'REJECTED'
      ? 'REJECTED'
      : 'COMPLETED';

  workflow.status = finalStatus;
  workflow.currentStage = 'COMPLETED';
  workflow.markModified('stageOutputs');
  await workflow.save();

  // 5. Update complaint resolution note and final status
  complaint.status = finalStatus;
  complaint.resolution =
    actionResult.notes || actionResult.justification || `Action ${actionType} executed successfully.`;
  await complaint.save();

  logger.info(
    `✅ Action Agent completed ${actionType} in ${durationMs}ms with status ${finalStatus}`
  );

  return {
    success: true,
    action: actionResult,
    executionId: executionLog._id,
    durationMs,
    finalStatus,
  };
};

export default runActionAgent;
