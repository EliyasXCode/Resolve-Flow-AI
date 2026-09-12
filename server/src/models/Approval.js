import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    decision: {
      type: String,
      enum: ['APPROVED', 'MODIFIED', 'REJECTED'],
      required: true,
      index: true,
    },
    originalResolution: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    finalResolution: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'approvals',
  }
);

export const Approval = mongoose.model('Approval', approvalSchema);
export default Approval;
