import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001').transform((val) => parseInt(val, 10)),
  CLIENT_URL: z.string().default('http://localhost:5175'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Configurable for future phases (Phase 2, 3, 4, 5)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  EMBEDDING_DIMENSIONS: z.string().default('768').transform((val) => parseInt(val, 10)),
  ATLAS_VECTOR_INDEX: z.string().default('policy_vector_index'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  MAX_AI_RETRIES: z.string().default('3').transform((val) => parseInt(val, 10)),
  AI_REQUEST_TIMEOUT_MS: z.string().default('30000').transform((val) => parseInt(val, 10)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export default env;
