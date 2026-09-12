import mongoose from 'mongoose';

const agentExecutionSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      index: true,
    },
    attempt: {
      type: Number,
      default: 1,
      min: 1,
    },
    sanitizedInputSummary: {
      type: String,
      required: true,
    },
    validatedOutput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    model: {
      type: String,
      required: true,
    },
    durationMs: {
      type: Number,
      required: true,
      min: 0,
    },
    tokenUsage: {
      promptTokens: { type: Number, default: 0 },
      candidatesTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'RETRYING'],
      required: true,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AgentExecution = mongoose.model('AgentExecution', agentExecutionSchema);
export default AgentExecution;
