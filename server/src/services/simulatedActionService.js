import crypto from 'crypto';

/**
 * Simulated External Systems Service (Phase 5)
 * Explicitly simulates payment gateway refunds, warehouse shipping dispatches,
 * and external customer CRM ticket updates with realistic production-grade payloads.
 * No real money or emails are ever dispatched.
 */

export const executeSimulatedRefund = async (order, parameters = {}) => {
  const refundAmount =
    parameters.refundAmount != null ? parameters.refundAmount : order?.totalAmount || 100.0;
  const currency = parameters.currency || order?.currency || 'USD';
  const transactionId = `TXN_REFUND_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const settlementTimestamp = new Date().toISOString();

  return {
    actionType: 'REFUND',
    status: 'SETTLED_SIMULATED',
    transactionId,
    gateway: 'Stripe Payments (Simulated Sandbox)',
    amountRefunded: Number(Number(refundAmount).toFixed(2)),
    currency,
    destinationAccount: `Ending in •••• ${order ? '4242' : '9999'}`,
    settlementTimestamp,
    simulatedFeeDeducted: 0.3,
    notes: 'Refund settled to customer card within simulated 3-5 business days.',
  };
};

export const executeSimulatedReplacement = async (order, parameters = {}) => {
  const replacementItem =
    parameters.replacementItemName || order?.items?.[0]?.name || 'Standard Replacement Item';
  const replacementSku =
    parameters.replacementSku || order?.items?.[0]?.sku || 'SKU-REPLACE-001';
  const trackingNumber = `TRK_FEDEX_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const dispatchTimestamp = new Date().toISOString();

  // Estimate delivery date 3 business days from now
  const estDate = new Date();
  estDate.setDate(estDate.getDate() + 3);
  const estimatedDelivery = estDate.toISOString().split('T')[0];

  return {
    actionType: 'REPLACEMENT',
    status: 'DISPATCHED_SIMULATED',
    trackingNumber,
    carrier: 'FedEx Priority Ground (Simulated)',
    warehouseId: 'WH-EAST-DISTRIBUTION-04',
    dispatchedItem: replacementItem,
    dispatchedSku: replacementSku,
    dispatchTimestamp,
    estimatedDelivery,
    deliveryAddress: 'Customer Verified Shipping Address on File',
    notes: 'Replacement order packaged and transferred to carrier dispatch center.',
  };
};

export const executeSimulatedInfoRequest = async (parameters = {}) => {
  const ticketId = `TICKET_INFO_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 7);

  return {
    actionType: 'REQUEST_INFORMATION',
    status: 'AWAITING_CUSTOMER_EVIDENCE_SIMULATED',
    ticketId,
    informationRequested:
      parameters.informationRequested || 'Proof of purchase, packaging photos, or defect details.',
    submissionDeadline: deadlineDate.toISOString().split('T')[0],
    secureUploadPortalUrl: `https://portal.resolveflow.ai/upload/${ticketId}`,
    notes: 'Customer evidence collection ticket opened. Automatic follow-up scheduled.',
  };
};

export const executeSimulatedRejection = async (parameters = {}) => {
  const closureRef = `CASE_CLOSED_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

  return {
    actionType: 'REJECT',
    status: 'CASE_CLOSED_REJECTED_SIMULATED',
    closureReference: closureRef,
    closedAt: new Date().toISOString(),
    justification: parameters.justification || 'Claim rejected in accordance with policy guidelines.',
    appealWindowDays: 14,
    notes: 'Complaint record archived. Notification dispatched to customer.',
  };
};

export const executeSimulatedEscalation = async (parameters = {}) => {
  const escalationId = `ESC_MGMT_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

  return {
    actionType: 'ESCALATE',
    status: 'TIER_3_INVESTIGATION_SIMULATED',
    escalationId,
    assignedDepartment: 'Executive Customer Relations & Legal Compliance',
    escalatedAt: new Date().toISOString(),
    priority: 'HIGH_PRIORITY_REVIEW',
    notes: 'Case escalated for senior management policy exemption review.',
  };
};

export const dispatchSimulatedAction = async (actionType, order, parameters = {}) => {
  switch (actionType) {
    case 'REFUND':
      return executeSimulatedRefund(order, parameters);
    case 'REPLACEMENT':
      return executeSimulatedReplacement(order, parameters);
    case 'REQUEST_INFORMATION':
      return executeSimulatedInfoRequest(parameters);
    case 'REJECT':
      return executeSimulatedRejection(parameters);
    case 'ESCALATE':
      return executeSimulatedEscalation(parameters);
    default:
      return executeSimulatedRefund(order, parameters);
  }
};

export default dispatchSimulatedAction;
