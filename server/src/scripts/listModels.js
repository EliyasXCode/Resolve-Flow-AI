import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';

const list = async () => {
  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const pager = await ai.models.list();
    console.log('Available Gemini models for this API key:');
    for await (const model of pager) {
      if (model.name.includes('flash') || model.name.includes('embedding')) {
        console.log(`- ${model.name}`);
      }
    }
    process.exit(0);
  } catch (e) {
    console.error('List error:', e.message);
    process.exit(1);
  }
};

list();
