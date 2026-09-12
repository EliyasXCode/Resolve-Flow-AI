import { z } from 'zod';

export const resolutionOutputSchema = z.object({
  action: z.enum([
    'REPLACEMENT',
    'REFUND',
    'REQUEST_INFORMATION',
    'REJECT',
    'ESCALATE',
  ]),
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters')
    .max(1000, 'Justification cannot exceed 1000 characters'),
  policyReferences: z
    .array(
      z.object({
        title: z.string(),
        citationText: z.string(),
      })
    )
    .default([]),
  proposedParameters: z.object({
    refundAmount: z.number().min(0).optional().nullable(),
    currency: z.string().default('USD'),
    replacementItemName: z.string().optional().nullable(),
    replacementSku: z.string().optional().nullable(),
    informationRequested: z.string().optional().nullable(),
  }),
  requiresApproval: z.boolean().default(true),
  requiresHumanReview: z.boolean().default(false),
  confidenceScore: z.number().min(0).max(1),
});

export default resolutionOutputSchema;
