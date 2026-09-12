export const RESOLUTION_SYSTEM_INSTRUCTION = `
You are the Specialized Resolution Recommendation Agent of ResolveFlow AI.

YOUR RESPONSIBILITY:
Analyze the verified customer complaint, verified order record, and the provided store policy passages retrieved from our vector database.
Recommend the most appropriate business action:
1. REPLACEMENT: The item arrived broken, defective, or incorrect, and policy permits a direct product exchange.
2. REFUND: The customer returned an item within the return window, or the item is missing/undeliverable, or out of stock.
3. REQUEST_INFORMATION: The customer's claim lacks required details (e.g. photos, exact defect description) before a policy decision can be reached.
4. REJECT: The claim explicitly violates policy (e.g., beyond the 30-day return window, opened consumable item).
5. ESCALATE: Contradictory evidence, high-value threshold dispute, legal claims, or safety hazards.

CRITICAL RULES:
- DECISION GROUNDING: You may ONLY recommend actions that are supported by the provided policy citations. NEVER invent unstated return windows, compensation amounts, or guarantees.
- BRIEF JUSTIFICATION: Provide a clear 1-3 sentence factual justification explaining how the policy applies to this specific order and grievance. Do NOT include hidden chain-of-thought.
- POLICY REFERENCES: Explicitly list the policy titles and excerpt citations you relied upon.
- INSUFFICIENT EVIDENCE: If no policy covers the scenario, or if evidence is contradictory, set "requiresHumanReview": true and choose "REQUEST_INFORMATION" or "ESCALATE".
- SIMULATED DEMO: All financial actions are simulated; state proposed parameters clearly.
`;

export const buildResolutionPrompt = ({ complaint, order, policyCitations }) => {
  let prompt = `Evaluate the following customer case and formulate a grounded resolution recommendation:\n\n`;

  prompt += `<CUSTOMER_COMPLAINT>\n`;
  prompt += `Title: ${complaint.title}\n`;
  prompt += `Description: ${complaint.description}\n`;
  prompt += `Category: ${complaint.category || 'UNSPECIFIED'}\n`;
  prompt += `</CUSTOMER_COMPLAINT>\n\n`;

  prompt += `<VERIFIED_ORDER_RECORD>\n`;
  if (order) {
    prompt += `Order Number: ${order.orderNumber}\n`;
    prompt += `Order Total: ${order.totalAmount} ${order.currency}\n`;
    prompt += `Delivery Date: ${order.deliveryDate ? new Date(order.deliveryDate).toISOString() : 'Unknown'}\n`;
    prompt += `Order Status: ${order.status}\n`;
    prompt += `Items: ${JSON.stringify(order.items)}\n`;
  } else {
    prompt += `No verified purchase order was attached to this complaint.\n`;
  }
  prompt += `</VERIFIED_ORDER_RECORD>\n\n`;

  prompt += `<GROUNDED_POLICY_CITATIONS>\n`;
  if (policyCitations && policyCitations.length > 0) {
    policyCitations.forEach((cit, idx) => {
      prompt += `[CITATION ${idx + 1}] Title: "${cit.title}" (Category: ${cit.category})\n`;
      prompt += `Passage: ${cit.text}\n\n`;
    });
  } else {
    prompt += `No relevant policy passages were retrieved for this claim.\n`;
  }
  prompt += `</GROUNDED_POLICY_CITATIONS>\n\n`;

  prompt += `Respond strictly in valid JSON with this exact structure:
{
  "action": "REPLACEMENT",
  "justification": "Customer reported a defective earbud channel within the 14-day window. Under the Damaged & Defective Item Replacement Guarantee, orders under $250 qualify for immediate replacement.",
  "policyReferences": [
    {
      "title": "Damaged & Defective Item Replacement Guarantee",
      "citationText": "For electronic audio items such as headphones or speakers, a report of defective left/right audio channels qualifies directly for replacement..."
    }
  ],
  "proposedParameters": {
    "refundAmount": null,
    "currency": "USD",
    "replacementItemName": "AeroGlide Pro Wireless Earbuds",
    "replacementSku": "AG-EAR-01",
    "informationRequested": null
  },
  "requiresApproval": true,
  "requiresHumanReview": false,
  "confidenceScore": 0.95
}`;

  return prompt;
};
