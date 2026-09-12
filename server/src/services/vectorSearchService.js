import PolicyChunk from '../models/PolicyChunk.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * Calculates in-memory cosine similarity between two vectors.
 * Used for deterministic evaluation and test environments.
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Executes Vector Search across policy chunks using MongoDB Atlas Vector Search ($vectorSearch).
 * Filters out inactive policies.
 * Never silently replaces vector search with keyword search.
 */
export const searchPoliciesVector = async (
  queryText,
  { limit = 4, category = null, forceMock = false } = {}
) => {
  if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
    return [];
  }

  // 1. Generate query embedding vector (768 dimensions)
  const queryVector = await generateEmbedding(queryText, { forceMock });

  // 2. Build MongoDB Atlas $vectorSearch aggregation pipeline
  const filterClause = {
    active: { $eq: true },
  };
  if (category && category !== 'UNSPECIFIED') {
    filterClause.category = { $eq: category };
  }

  // In unit test environment or forceMock, compute deterministic in-memory similarity on current DB state
  // to ensure instantaneous consistency when tests mutate chunk documents (e.g. active: false)
  if (env.NODE_ENV === 'test' || forceMock) {
    logger.info('[TEST MODE] Computing in-memory cosine similarity across active policy chunks.');
    const allChunks = await PolicyChunk.find(filterClause);
    const scored = allChunks
      .map((chunk) => ({
        _id: chunk._id,
        policyId: chunk.policyId,
        title: chunk.title,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        category: chunk.category,
        score: cosineSimilarity(queryVector, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: env.ATLAS_VECTOR_INDEX,
        path: 'embedding',
        queryVector,
        numCandidates: 50,
        limit,
        filter: filterClause,
      },
    },
    {
      $project: {
        _id: 1,
        policyId: 1,
        title: 1,
        text: 1,
        chunkIndex: 1,
        category: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  try {
    const results = await PolicyChunk.aggregate(pipeline);
    if (results.length > 0) {
      logger.info(`Atlas Vector Search returned ${results.length} relevant policy chunks.`);
      return results;
    }

    // If Atlas returns 0 (e.g. index is building/pending or test environment), compute cosine similarity across active chunks
    logger.info('Computing in-memory cosine similarity across active policy chunks.');
    const allChunks = await PolicyChunk.find(filterClause);
    if (allChunks.length > 0) {
      const scored = allChunks
        .map((chunk) => ({
          _id: chunk._id,
          policyId: chunk.policyId,
          title: chunk.title,
          text: chunk.text,
          chunkIndex: chunk.chunkIndex,
          category: chunk.category,
          score: cosineSimilarity(queryVector, chunk.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scored;
    }

    return results;
  } catch (error) {
    // Check if error is due to missing vector index in Atlas
    const isIndexMissingError =
      error.message.includes('policy_vector_index') ||
      error.message.includes('mongot') ||
      error.message.includes('$vectorSearch') ||
      error.codeName === 'CommandNotSupportedOnMongoDBServer';

    if (isIndexMissingError) {
      logger.warn(
        `Atlas Vector Search index '${env.ATLAS_VECTOR_INDEX}' is not yet created or ready on MongoDB Atlas.`
      );

      // If in test environment or forceMock, compute exact in-memory cosine similarity
      if (env.NODE_ENV === 'test' || forceMock) {
        logger.info('[TEST MODE] Computing in-memory cosine similarity across active policy chunks.');
        const allChunks = await PolicyChunk.find({ active: true });
        const scored = allChunks
          .map((chunk) => ({
            _id: chunk._id,
            policyId: chunk.policyId,
            title: chunk.title,
            text: chunk.text,
            chunkIndex: chunk.chunkIndex,
            category: chunk.category,
            score: cosineSimilarity(queryVector, chunk.embedding),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        return scored;
      }

      // In development or production, provide an honest, actionable setup error
      const setupInstructions = `
[ATLAS VECTOR SEARCH SETUP REQUIRED]
The MongoDB Atlas Vector Search index "${env.ATLAS_VECTOR_INDEX}" is not detected on your Atlas cluster.
To enable live vector search:
1. Log in to your MongoDB Atlas dashboard at https://cloud.mongodb.com
2. Navigate to your Database -> "Atlas Search" tab -> click "Create Search Index"
3. Select "Atlas Vector Search" (JSON Editor)
4. Select database "resolveflowai" and collection "policy_chunks"
5. Set Index Name to: "${env.ATLAS_VECTOR_INDEX}"
6. Paste this exact configuration:
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "active"
    },
    {
      "type": "filter",
      "path": "category"
    }
  ]
}
      `.trim();

      const customErr = new Error(setupInstructions);
      customErr.isAtlasVectorIndexMissing = true;
      throw customErr;
    }

    throw error;
  }
};

export default searchPoliciesVector;
