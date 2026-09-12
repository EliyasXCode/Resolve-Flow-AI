import PolicyDocument from '../models/PolicyDocument.js';
import PolicyChunk from '../models/PolicyChunk.js';
import { chunkText } from '../services/chunkingService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import env from '../config/env.js';

export const getPolicies = async (req, res, next) => {
  try {
    const policies = await PolicyDocument.find().sort({ createdAt: -1 });
    const chunkCounts = await PolicyChunk.aggregate([
      { $group: { _id: '$policyId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    chunkCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const enriched = policies.map((p) => ({
      ...p.toObject(),
      chunkCount: countMap[p._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: enriched.length,
      policies: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const createPolicy = async (req, res, next) => {
  try {
    const { title, text, category } = req.body;
    if (!title || !text) {
      return res.status(400).json({
        success: false,
        message: 'Title and policy text are required.',
      });
    }

    const doc = await PolicyDocument.create({
      title,
      text,
      category: category || 'GENERAL',
      version: 1,
      active: true,
      uploadedBy: req.user._id,
    });

    // Chunk and embed into policy_chunks
    const textChunks = chunkText(text, { chunkSizeWords: 120, overlapWords: 25 });
    for (let i = 0; i < textChunks.length; i++) {
      const vector = await generateEmbedding(textChunks[i]);
      await PolicyChunk.create({
        policyId: doc._id,
        title: doc.title,
        text: textChunks[i],
        chunkIndex: i,
        category: doc.category,
        active: true,
        embedding: vector,
        embeddingModel: env.GEMINI_EMBEDDING_MODEL,
        embeddingDimensions: env.EMBEDDING_DIMENSIONS,
      });
    }

    res.status(201).json({
      success: true,
      message: `Policy created and ${textChunks.length} chunks embedded successfully into policy_chunks.`,
      policy: doc,
      chunksCreated: textChunks.length,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = await PolicyDocument.findById(id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found.',
      });
    }

    await PolicyChunk.deleteMany({ policyId: id });
    await PolicyDocument.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: 'Policy and all associated vector chunks deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
