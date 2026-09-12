import Complaint from '../models/Complaint.js';
import Workflow from '../models/Workflow.js';
import logger from '../utils/logger.js';
import { searchPoliciesVector } from './vectorSearchService.js';

/**
 * Knowledge Stage (Deterministic Policy Retrieval)
 * As required: Deterministic retrieval code without unnecessary LLM overhead.
 * Never invents missing policies; grounds solely on stored vector chunks.
 */
export const retrievePolicyKnowledge = async (complaintId, { forceMock = false } = {}) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new Error(`Complaint not found: ${complaintId}`);
  }

  let workflow = await Workflow.findOne({ complaintId: complaint._id });
  if (!workflow) {
    workflow = await Workflow.create({
      complaintId: complaint._id,
      status: 'RETRIEVING_KNOWLEDGE',
      currentStage: 'KNOWLEDGE',
      stageOutputs: {},
    });
  }

  workflow.currentStage = 'KNOWLEDGE';
  workflow.status = 'RETRIEVING_KNOWLEDGE';
  await workflow.save();

  // Construct query string based on Triage summary if available, or complaint title + description
  const triageSummary = workflow.stageOutputs?.triage?.summary;
  const queryText = triageSummary
    ? `${complaint.title}. ${triageSummary}`
    : `${complaint.title}. ${complaint.description.slice(0, 200)}`;

  logger.info(`Running Knowledge Retrieval for Complaint ${complaintId} with query: "${queryText.slice(0, 80)}..."`);

  // Query vector search on policy_chunks
  const retrievedChunks = await searchPoliciesVector(queryText, {
    limit: 3,
    forceMock,
  });

  const knowledgeOutput = {
    retrievedAt: new Date().toISOString(),
    queryText,
    chunkCount: retrievedChunks.length,
    citations: retrievedChunks.map((c) => ({
      chunkId: c._id.toString(),
      policyId: c.policyId.toString(),
      title: c.title,
      category: c.category,
      text: c.text,
      relevanceScore: typeof c.score === 'number' ? Number(c.score.toFixed(4)) : 0.85,
    })),
  };

  // Update Workflow stageOutputs
  workflow.stageOutputs.knowledge = knowledgeOutput;
  workflow.currentStage = 'RESOLUTION';
  workflow.status = 'GENERATING_RESOLUTION';
  workflow.markModified('stageOutputs');
  await workflow.save();

  complaint.status = 'GENERATING_RESOLUTION';
  await complaint.save();

  logger.info(`✅ Knowledge Stage completed. Retrieved ${retrievedChunks.length} policy citations.`);

  return knowledgeOutput;
};

export default retrievePolicyKnowledge;
