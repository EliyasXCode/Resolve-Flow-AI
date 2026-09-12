import mongoose from 'mongoose';

const policyChunkSchema = new mongoose.Schema(
  {
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyDocument',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length === 768;
        },
        message: (props) => `Embedding vector length must be exactly 768, got ${props.value?.length}`,
      },
    },
    embeddingModel: {
      type: String,
      default: 'gemini-embedding-001',
    },
    embeddingDimensions: {
      type: Number,
      default: 768,
    },
  },
  {
    timestamps: true,
    collection: 'policy_chunks', // Explicitly specified collection name as required
  }
);

// Standard compound index for filtering active policy chunks by category
policyChunkSchema.index({ active: 1, category: 1 });

export const PolicyChunk = mongoose.model('PolicyChunk', policyChunkSchema, 'policy_chunks');
export default PolicyChunk;
