import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { z } from 'zod';

const testResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  model: z.string(),
});

const testGemini = async () => {
  logger.info('--- Google Gemini Connection Test ---');
  logger.info(`Target Model: ${env.GEMINI_MODEL}`);

  if (!env.GEMINI_API_KEY) {
    logger.error('GEMINI_API_KEY is not configured in .env');
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    logger.info('Sending structured verification probe to Gemini API...');
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: 'Respond strictly in valid JSON with fields: {"status": "ok", "message": "Gemini API successfully connected", "model": "<model_name>"}',
      config: {
        responseMimeType: 'application/json',
      },
    });

    const latencyMs = Date.now() - startTime;
    const rawText = response.text?.trim() || '';

    logger.info(`Received response in ${latencyMs}ms:`);
    logger.info(rawText);

    // Validate with Zod
    const parsedJson = JSON.parse(rawText);
    const validated = testResponseSchema.parse(parsedJson);

    logger.info('✅ Gemini API connectivity and JSON schema parsing verified successfully!');
    logger.info(`Latency: ${latencyMs}ms`);
    process.exit(0);
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    logger.error(`❌ Gemini API test failed (${latencyMs}ms):`, err.message);
    if (err.status) {
      logger.error(`Status code: ${err.status}`);
    }
    process.exit(1);
  }
};

testGemini();
