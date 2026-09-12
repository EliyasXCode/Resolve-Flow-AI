import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Generates embeddings using Gemini embedding model.
 * Explicitly requests EMBEDDING_DIMENSIONS (768) and validates actual vector length.
 */
export const generateEmbedding = async (text, { forceMock = false } = {}) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  // Deterministic mock embedding for unit tests and offline environments
  if (forceMock || !env.GEMINI_API_KEY) {
    logger.debug('Generating deterministic mock embedding vector (length 768)');
    const mockVector = new Array(env.EMBEDDING_DIMENSIONS).fill(0).map((_, i) => {
      // Deterministic pseudo-hash float
      const charCode = text.charCodeAt(i % text.length) || 1;
      return Math.sin(charCode * (i + 1)) * 0.05;
    });
    return mockVector;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const response = await ai.models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL,
      contents: text.trim(),
      config: {
        outputDimensionality: env.EMBEDDING_DIMENSIONS,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || !Array.isArray(values)) {
      throw new Error('Gemini API returned invalid embedding structure');
    }

    if (values.length !== env.EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch: expected ${env.EMBEDDING_DIMENSIONS}, received ${values.length}`
      );
    }

    return values;
  } catch (error) {
    logger.error('Error in generateEmbedding:', error.message);
    throw error;
  }
};

export default generateEmbedding;
