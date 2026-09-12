import Workflow from '../models/Workflow.js';
import Complaint from '../models/Complaint.js';
import AgentExecution from '../models/AgentExecution.js';
import Approval from '../models/Approval.js';
import runTriageAgent from '../agents/triageAgent.js';
import runResolutionAgent from '../agents/resolutionAgent.js';
import runCommunicationAgent from '../agents/communicationAgent.js';
import runActionAgent from '../agents/actionAgent.js';
import { runOrchestrator } from '../services/orchestratorService.js';

export const triggerTriage = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    // Permission check: Customer can only trigger on their own complaints
    if (req.user.role === 'customer' && complaint.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only triage your own complaints.',
      });
    }

    const { forceMock = false } = req.body || {};
    const result = await runTriageAgent(complaintId, { forceMock });

    // Fetch updated workflow and telemetry executions
    const updatedWorkflow = await Workflow.findOne({ complaintId });
    const executions = await AgentExecution.find({ workflowId: updatedWorkflow._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Triage stage completed successfully.',
      triage: result.triage,
      isMock: result.isMock,
      durationMs: result.durationMs,
      workflow: updatedWorkflow,
      executions,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkflow = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    // Permission check: Customers can only view workflows for their own complaints
    if (req.user.role === 'customer' && complaint.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to inspect this workflow.',
      });
    }

    let workflow = await Workflow.findOne({ complaintId });
    if (!workflow) {
      workflow = await Workflow.create({
        complaintId,
        status: complaint.status || 'SUBMITTED',
        currentStage: 'SUBMITTED',
        stageOutputs: {},
      });
    }

    const executions = await AgentExecution.find({ workflowId: workflow._id }).sort({ createdAt: -1 });

    // Fetch approval record if present
    const approval = workflow.approvalId
      ? await Approval.findById(workflow.approvalId).populate('reviewedBy', 'name email role')
      : await Approval.findOne({ complaintId }).sort({ createdAt: -1 }).populate('reviewedBy', 'name email role');

    res.status(200).json({
      success: true,
      workflow,
      approval,
      executions,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerResolution = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    // Customer can only trigger for their own complaint; staff can trigger for any
    if (req.user.role === 'customer' && complaint.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only run resolution on your own complaints.',
      });
    }

    const { forceMock = false } = req.body || {};
    const result = await runResolutionAgent(complaintId, { forceMock });

    const updatedWorkflow = await Workflow.findOne({ complaintId });
    const executions = await AgentExecution.find({ workflowId: updatedWorkflow._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Resolution recommendation generated successfully.',
      resolution: result.resolution,
      citations: result.citations,
      isMock: result.isMock,
      durationMs: result.durationMs,
      model: result.model,
      workflow: updatedWorkflow,
      executions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Human-in-the-Loop Review & Decision (Phase 4)
 * Allows support and admin staff to approve, modify, or reject AI-proposed resolutions.
 * Creates an Approval audit record and triggers the Communication Agent.
 */
export const reviewResolution = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { decision, modifiedResolution, notes, forceMock = false } = req.body;

    if (!['APPROVED', 'MODIFIED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision. Must be APPROVED, MODIFIED, or REJECTED.',
      });
    }

    // Role check: Only Support and Admin can approve or modify resolutions
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only support and admin staff can review resolutions.',
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    const workflow = await Workflow.findOne({ complaintId });
    if (!workflow || !workflow.stageOutputs?.resolution) {
      return res.status(400).json({
        success: false,
        message: 'Cannot review complaint before an AI resolution recommendation has been generated.',
      });
    }

    const originalResolution = workflow.stageOutputs.resolution;
    let finalResolution = originalResolution;

    if (decision === 'MODIFIED') {
      if (!modifiedResolution || !modifiedResolution.action) {
        return res.status(400).json({
          success: false,
          message: 'Modified resolution must specify an action.',
        });
      }
      finalResolution = {
        ...originalResolution,
        ...modifiedResolution,
        action: modifiedResolution.action,
        proposedParameters: {
          ...originalResolution.proposedParameters,
          ...(modifiedResolution.proposedParameters || {}),
        },
      };
    } else if (decision === 'REJECTED') {
      finalResolution = {
        ...originalResolution,
        action: 'REJECT',
        justification: notes || 'Resolution proposal rejected by support staff review.',
      };
    }

    // 1. Create Approval Record
    const approval = await Approval.create({
      complaintId: complaint._id,
      workflowId: workflow._id,
      reviewedBy: req.user._id,
      decision,
      originalResolution,
      finalResolution,
      notes: notes || '',
    });

    // 2. Advance Workflow & Complaint Status
    workflow.approvalId = approval._id;
    workflow.status = decision === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    workflow.currentStage = 'DRAFT';
    await workflow.save();

    complaint.status = workflow.status;
    await complaint.save();

    // 3. Automatically trigger Communication Agent to compose customer email
    let draftResult = null;
    try {
      draftResult = await runCommunicationAgent(complaint._id, approval._id, { forceMock });
    } catch (draftErr) {
      console.warn('Communication Agent auto-draft warning:', draftErr.message);
    }

    const updatedWorkflow = await Workflow.findOne({ complaintId });
    const executions = await AgentExecution.find({ workflowId: updatedWorkflow._id }).sort({ createdAt: -1 });
    const populatedApproval = await Approval.findById(approval._id).populate('reviewedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: `Resolution ${decision.toLowerCase()} successfully and customer response drafted.`,
      approval: populatedApproval,
      draft: draftResult?.draft || null,
      workflow: updatedWorkflow,
      executions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger Communication Agent Manually (Phase 4)
 */
export const triggerCommunicationDraft = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { forceMock = false } = req.body || {};

    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only support and admin staff can trigger customer drafts.',
      });
    }

    const draftResult = await runCommunicationAgent(complaintId, null, { forceMock });

    const updatedWorkflow = await Workflow.findOne({ complaintId });
    const executions = await AgentExecution.find({ workflowId: updatedWorkflow._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Customer communication drafted successfully.',
      draft: draftResult.draft,
      workflow: updatedWorkflow,
      executions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute Simulated Action (Phase 5)
 * Staff-authorized execution of refund, replacement, info request, or closure.
 */
export const executeAction = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { forceMock = true } = req.body || {};

    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only support and admin staff can execute actions.',
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    const result = await runActionAgent(complaintId, { forceMock });

    const updatedWorkflow = await Workflow.findOne({ complaintId });
    const executions = await AgentExecution.find({ workflowId: updatedWorkflow._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Action executed successfully.',
      action: result.action,
      finalStatus: result.finalStatus,
      workflow: updatedWorkflow,
      executions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 1-Click End-to-End Orchestrator (Phase 5)
 * Runs Stages 1-3 sequentially and pauses at the Human Review Gate.
 */
export const runFullOrchestration = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { forceMock = false } = req.body || {};

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    // Permission check: Customer can only orchestrate their own complaints, staff can orchestrate any
    if (req.user.role === 'customer' && complaint.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only orchestrate your own complaints.',
      });
    }

    const result = await runOrchestrator(complaintId, { forceMock });

    const updatedWorkflow = await Workflow.findOne({ complaintId });
    const executions = await AgentExecution.find({ workflowId: updatedWorkflow._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: result.message,
      pausedForHumanReview: result.pausedForHumanReview,
      pipelineStagesExecuted: result.pipelineStagesExecuted,
      durationMs: result.durationMs,
      workflow: updatedWorkflow,
      executions,
    });
  } catch (error) {
    next(error);
  }
};
