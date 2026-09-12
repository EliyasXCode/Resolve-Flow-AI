import { z } from 'zod';
import { COMPLAINT_STATUSES } from '../models/Complaint.js';

export const createComplaintSchema = z.object({
  title: z
    .string({ required_error: 'Complaint title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string({ required_error: 'Complaint description is required' })
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  orderId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Order ID format')
    .optional()
    .nullable(),
  category: z
    .enum([
      'DAMAGED_ITEM',
      'LATE_DELIVERY',
      'WRONG_ITEM',
      'REFUND_REQUEST',
      'BILLING_ISSUE',
      'GENERAL_INQUIRY',
      'UNSPECIFIED',
    ])
    .optional()
    .default('UNSPECIFIED'),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES, {
    errorMap: () => ({ message: 'Invalid complaint status' }),
  }),
});
