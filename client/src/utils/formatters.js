export const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (typeof amount !== 'number') return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const getStatusMeta = (status) => {
  const map = {
    SUBMITTED: { label: 'Submitted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    QUEUED: { label: 'Queued', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    TRIAGING: { label: 'Triaging (AI)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    RETRIEVING_KNOWLEDGE: { label: 'Policy Retrieval', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    GENERATING_RESOLUTION: { label: 'Analyzing Resolution', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    DRAFTING_RESPONSE: { label: 'Drafting Response', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    PENDING_APPROVAL: { label: 'Pending Human Review', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
    APPROVED: { label: 'Approved by Staff', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
    REJECTED: { label: 'Rejected by Staff', color: 'bg-rose-50 text-rose-800 border-rose-300' },
    RESPONSE_DRAFTED: { label: 'Response Drafted', color: 'bg-indigo-50 text-indigo-800 border-indigo-300' },
    EXECUTING_ACTION: { label: 'Executing Action', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    COMPLETED: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    FAILED: { label: 'Workflow Failed', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    NEEDS_MANUAL_REVIEW: { label: 'Manual Review', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  };

  return map[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
};
