import mongoose from 'mongoose';
import env from '../config/env.js';
import PolicyDocument from '../models/PolicyDocument.js';
import PolicyChunk from '../models/PolicyChunk.js';
import { chunkText } from '../services/chunkingService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import logger from '../utils/logger.js';

const SEED_POLICIES = [
  {
    title: '30-Day Money-Back & Refund Policy',
    category: 'REFUND',
    text: `
ResolveFlow Retail operates a standard 30-day money-back guarantee. Customers may request a full refund or return within thirty (30) days of confirmed delivery.
To be eligible for a full refund, items must be in original condition with packaging and all accessories included.
For items that arrive damaged, defective, or non-functional, the 30-day requirement still applies, but return shipping fees will be fully waived and covered by ResolveFlow.
Refunds are processed to the original payment method within 3 to 5 business days after inspection or authorized support approval.
Consumable products such as opened coffee beans, software licenses, or customized items are non-refundable unless verified defective upon delivery.
If a customer claims a refund on an order that has not yet been delivered, the complaint must be handled under the Order Cancellation or Late Delivery rules.
    `.trim(),
  },
  {
    title: 'Damaged & Defective Item Replacement Guarantee',
    category: 'REPLACEMENT',
    text: `
We guarantee that all merchandise delivered to customers will arrive in full working order and free from physical defects.
If an item arrives damaged in transit, cracked, with non-functional electronic components, or missing essential parts:
1. The customer is entitled to an immediate free replacement of the identical SKU or an equivalent model.
2. The customer must report the damage within fourteen (14) days of receiving the package.
3. If replacement inventory is temporarily out of stock, the customer will be offered a choice between waiting for restock or receiving an immediate 100% refund.
4. For electronic audio items such as headphones or speakers, a report of defective left/right audio channels qualifies directly for replacement without requiring initial return of the defective unit if the order value is under $250.
    `.trim(),
  },
  {
    title: 'Late Delivery Compensation & Tracking Guarantee',
    category: 'DELIVERY',
    text: `
ResolveFlow tracks all shipments in real time. We guarantee on-time delivery according to the carrier commitment date provided at checkout.
If an order is delayed by more than five (5) business days beyond the estimated delivery date:
1. The customer is eligible for a $15 inconvenience credit or a 20% partial refund on the shipping charges.
2. If tracking indicates the package has been stationary for seven (7) or more days without a carrier scan update, the package is officially declared 'Lost in Transit'.
3. Once declared lost in transit, the customer may select either an expedited replacement reshipment at no additional charge or an immediate full refund to their original payment method.
    `.trim(),
  },
  {
    title: 'Order Cancellation & Modification Policy',
    category: 'CANCELLATION',
    text: `
Customers may cancel an order free of charge at any time while the order status remains 'PROCESSING' or 'ON_HOLD'.
Once an order has transitioned to 'SHIPPED', the physical parcel cannot be intercepted in transit. In such cases:
1. The customer must allow the delivery to complete and then initiate a return under our 30-day return policy.
2. If an unauthorized charge or billing discrepancy is reported, customer support will freeze the order and investigate billing logs within 24 business hours.
3. Pre-orders may be cancelled up to 48 hours prior to the scheduled release date for a complete refund.
    `.trim(),
  },
];

const seedPolicies = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info('Connected to MongoDB Atlas for policy seeding.');

    // Clear existing policy chunks and documents to avoid duplicates
    await PolicyChunk.deleteMany({});
    await PolicyDocument.deleteMany({});
    logger.info('Cleared existing policies and chunks in collection policy_chunks.');

    let totalChunksCreated = 0;

    for (const policyData of SEED_POLICIES) {
      logger.info(`Processing policy: "${policyData.title}" (${policyData.category})`);

      const doc = await PolicyDocument.create({
        title: policyData.title,
        text: policyData.text,
        category: policyData.category,
        version: 1,
        active: true,
      });

      // Split policy into chunks
      const textChunks = chunkText(policyData.text, { chunkSizeWords: 120, overlapWords: 25 });
      logger.info(`Generated ${textChunks.length} chunks for "${policyData.title}"`);

      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];

        logger.info(`Embedding chunk ${i + 1}/${textChunks.length} via Gemini (${env.GEMINI_EMBEDDING_MODEL})...`);
        const vector = await generateEmbedding(chunkContent);

        if (vector.length !== env.EMBEDDING_DIMENSIONS) {
          throw new Error(`Vector dimension mismatch: expected ${env.EMBEDDING_DIMENSIONS}, got ${vector.length}`);
        }

        await PolicyChunk.create({
          policyId: doc._id,
          title: policyData.title,
          text: chunkContent,
          chunkIndex: i,
          category: policyData.category,
          active: true,
          embedding: vector,
          embeddingModel: env.GEMINI_EMBEDDING_MODEL,
          embeddingDimensions: env.EMBEDDING_DIMENSIONS,
        });

        totalChunksCreated++;
      }
    }

    logger.info(`✅ Successfully seeded ${SEED_POLICIES.length} policies into collection "policy_chunks" (${totalChunksCreated} embedded chunks).`);
    logger.info(`👉 Atlas Vector Search Index Name: ${env.ATLAS_VECTOR_INDEX}`);

    await mongoose.disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding policies:', error.message);
    process.exit(1);
  }
};

seedPolicies();
