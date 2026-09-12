import mongoose from 'mongoose';
import { COMPLAINT_STATUSES } from './Complaint.js';

export const WORKFLOW_STAGES = [
  'SUBMITTED',
  'TRIAGE',
  'KNOWLEDGE',
  'RESOLUTION',
  'DRAFT',
  'APPROVAL',
  'ACTION',
  'COMPLETED',
];

const workflowSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: 'SUBMITTED',
      index: true,
    },
    currentStage: {
      type: String,
      enum: WORKFLOW_STAGES,
      default: 'SUBMITTED',
      index: true,
    },
    stageOutputs: {
      triage: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      knowledge: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      resolution: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      draft: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      action: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    approvalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Approval',
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    version: {
      type: Number,
      default: 0, // For optimistic concurrency control
    },
  },
  {
    timestamps: true,
  }
);

// Method to atomically advance stage
workflowSchema.methods.advanceStage = async function (nextStage, nextStatus, stageData = {}) {
  this.currentStage = nextStage;
  this.status = nextStatus;
  this.version += 1;
  this.lastError = null;

  if (stageData.stageName && stageData.output) {
    this.stageOutputs[stageData.stageName] = stageData.output;
    this.markModified('stageOutputs');
  }

  return this.save();
};

export const Workflow = mongoose.model('Workflow', workflowSchema);
export default Workflow;
