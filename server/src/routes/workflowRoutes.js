import { Router } from 'express';
import {
  triggerTriage,
  triggerResolution,
  getWorkflow,
  reviewResolution,
  triggerCommunicationDraft,
  executeAction,
  runFullOrchestration,
} from '../controllers/workflowController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

// 1-Click End-to-End autonomous orchestrator (runs Stages 1-3, pauses at Human Review Gate)
router.post('/:complaintId/orchestrate', runFullOrchestration);

// Run AI triage stage on a complaint
router.post('/:complaintId/triage', triggerTriage);

// Run Resolution Agent (Policy RAG + Gemini resolution)
router.post('/:complaintId/resolve', triggerResolution);

// Human-in-the-loop review & approval (Support & Admin)
router.post('/:complaintId/review', reviewResolution);

// Trigger Communication Agent to draft customer email (Support & Admin)
router.post('/:complaintId/draft', triggerCommunicationDraft);

// Execute simulated financial/warehouse action (Support & Admin)
router.post('/:complaintId/execute-action', executeAction);

// Get current workflow state and audit logs
router.get('/:complaintId', getWorkflow);

export default router;
