export const COMMUNICATION_SYSTEM_INSTRUCTION = `
You are ResolveFlow AI's Customer Communication Agent.
Your responsibility is to compose a courteous, empathetic, and unambiguous customer-facing email informing the customer of the human-approved resolution for their complaint.

Operational Directives:
1. Tone must be empathetic and professional, acknowledging their specific issue and apologizing for any inconvenience caused.
2. Accurately state the human-approved resolution:
   - For REPLACEMENT: State that an immediate identical replacement is approved and being processed. Mention the replacement item name and SKU.
   - For REFUND: State the exact refund amount and currency approved.
   - For REQUEST_INFORMATION: Explain clearly what specific documentation or details are needed from the customer.
   - For REJECT: Explain the decision calmly, referencing the policy terms with utmost respect.
   - For ESCALATE: Inform the customer that a specialist team is personally reviewing their case.
3. If staff notes are provided, incorporate relevant guidance respectfully.
4. Conclude with clear next steps and an invitation to reach out if they have any further questions.
5. All deliveries are simulated in this environment, but write the message as a real, production-grade corporate email.
6. Return output strictly formatted as valid JSON matching the schema provided.
`.trim();

export const buildCommunicationPrompt = ({
  complaint,
  customer,
  order,
  approvedResolution,
  staffNotes = '',
}) => {
  const customerName = customer?.name || 'Valued Customer';
  const customerEmail = customer?.email || 'customer@example.com';
  const action = approvedResolution?.action || 'ESCALATE';
  const parameters = approvedResolution?.proposedParameters || {};

  return `
Compose a customer-facing resolution email based on the following verified incident and approval record.

<CUSTOMER_INFORMATION>
Name: ${customerName}
Email: ${customerEmail}
</CUSTOMER_INFORMATION>

<ORDER_RECORD>
Order Number: ${order ? order.orderNumber : 'No direct order attached'}
Items: ${
    order && order.items
      ? order.items.map((it) => `${it.name} (Qty: ${it.quantity})`).join(', ')
      : 'N/A'
  }
</ORDER_RECORD>

<COMPLAINT_RECORD>
Title: ${complaint.title}
<UNTRUSTED_COMPLAINT_DATA>
${complaint.description}
</UNTRUSTED_COMPLAINT_DATA>
</COMPLAINT_RECORD>

<APPROVED_RESOLUTION>
Approved Action: ${action}
Policy Justification: ${approvedResolution?.justification || 'Standard corporate procedure'}
Refund Amount: ${parameters.refundAmount != null ? `${parameters.refundAmount} ${parameters.currency || 'USD'}` : 'N/A'}
Replacement Item: ${parameters.replacementItemName || 'N/A'} (SKU: ${parameters.replacementSku || 'N/A'})
Information Requested: ${parameters.informationRequested || 'N/A'}
Staff Review Notes: ${staffNotes || 'None provided'}
</APPROVED_RESOLUTION>

Required JSON Output Structure:
{
  "subject": "Clear, concise email subject referencing order or claim",
  "body": "Full body text formatted cleanly in readable markdown/paragraphs with greeting, empathy, approved resolution details, next steps, and professional sign-off",
  "tone": "EMPATHETIC" | "PROFESSIONAL" | "CONCISE",
  "actionAnnounced": "${action}",
  "keyPointsCovered": [
    "Summary of key point 1",
    "Summary of key point 2"
  ],
  "simulatedDelivery": {
    "channel": "EMAIL",
    "recipient": "${customerEmail}",
    "status": "SIMULATED_DISPATCHED"
  }
}
`.trim();
};
