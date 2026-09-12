import mongoose from 'mongoose';

export const POLICY_CATEGORIES = [
  'REFUND',
  'REPLACEMENT',
  'DELIVERY',
  'CANCELLATION',
  'GENERAL',
];

const policyDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Policy title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    text: {
      type: String,
      required: [true, 'Policy document text is required'],
    },
    category: {
      type: String,
      enum: POLICY_CATEGORIES,
      default: 'GENERAL',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PolicyDocument = mongoose.model('PolicyDocument', policyDocumentSchema);
export default PolicyDocument;
