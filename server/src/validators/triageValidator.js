import { z } from 'zod';

export const triageOutputSchema = z.object({
  category: z.enum([
    'DAMAGED_ITEM',
    'LATE_DELIVERY',
    'WRONG_ITEM',
    'REFUND_REQUEST',
    'BILLING_ISSUE',
    'GENERAL_INQUIRY',
    'UNSPECIFIED',
  ]),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED']),
  summary: z
    .string()
    .min(5, 'Summary must be at least 5 characters')
    .max(500, 'Summary cannot exceed 500 characters'),
  extractedEntities: z.object({
    productNames: z.array(z.string()).default([]),
    orderNumbers: z.array(z.string()).default([]),
    monetaryAmounts: z.array(z.string()).default([]),
    deliveryDates: z.array(z.string()).default([]),
    issuesDetected: z.array(z.string()).default([]),
  }),
  confidenceEstimate: z
    .number()
    .min(0)
    .max(1)
    .describe('Uncalibrated model confidence heuristic, not a measured statistical accuracy.'),
  reasoning: z
    .string()
    .max(500, 'Reasoning cannot exceed 500 characters')
    .default(''),
});

export default triageOutputSchema;
