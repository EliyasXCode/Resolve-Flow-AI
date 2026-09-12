import mongoose from 'mongoose';

export const COMPLAINT_STATUSES = [
  'SUBMITTED',
  'QUEUED',
  'TRIAGING',
  'RETRIEVING_KNOWLEDGE',
  'GENERATING_RESOLUTION',
  'PENDING_APPROVAL',
  'NEEDS_MANUAL_REVIEW',
  'APPROVED',
  'REJECTED',
  'DRAFTING_RESPONSE',
  'RESPONSE_DRAFTED',
  'EXECUTING_ACTION',
  'COMPLETED',
  'FAILED',
];

const attachmentSchema = new mongoose.Schema(
  {
    publicId: { type: String },
    url: { type: String },
    secureUrl: { type: String },
    originalFilename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a complaint title'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please describe your complaint in detail'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: 'SUBMITTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    category: {
      type: String,
      enum: [
        'DAMAGED_ITEM',
        'LATE_DELIVERY',
        'WRONG_ITEM',
        'REFUND_REQUEST',
        'BILLING_ISSUE',
        'GENERAL_INQUIRY',
        'UNSPECIFIED',
      ],
      default: 'UNSPECIFIED',
    },
    attachments: [attachmentSchema],
    resolution: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
