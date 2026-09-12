import { z } from 'zod';

export const communicationOutputSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(150, 'Subject cannot exceed 150 characters'),
  body: z
    .string()
    .min(20, 'Email body must be at least 20 characters')
    .max(5000, 'Email body cannot exceed 5000 characters'),
  tone: z.enum(['EMPATHETIC', 'PROFESSIONAL', 'CONCISE'], {
    errorMap: () => ({ message: 'Tone must be EMPATHETIC, PROFESSIONAL, or CONCISE' }),
  }),
  actionAnnounced: z.enum(
    ['REPLACEMENT', 'REFUND', 'REQUEST_INFORMATION', 'REJECT', 'ESCALATE'],
    {
      errorMap: () => ({ message: 'Action announced must match an authorized resolution action' }),
    }
  ),
  keyPointsCovered: z.array(z.string()).min(1, 'At least one key point must be covered'),
  simulatedDelivery: z.object({
    channel: z.literal('EMAIL'),
    recipient: z.string().email(),
    status: z.literal('SIMULATED_DISPATCHED'),
  }),
});

export default communicationOutputSchema;
