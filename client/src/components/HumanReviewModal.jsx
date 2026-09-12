import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Edit3,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

export const HumanReviewModal = ({
  isOpen,
  onClose,
  onSubmit,
  currentResolution,
  submitting = false,
}) => {
  if (!isOpen) return null;

  const [decision, setDecision] = useState('APPROVED');
  const [action, setAction] = useState(currentResolution?.action || 'REPLACEMENT');
  const [refundAmount, setRefundAmount] = useState(
    currentResolution?.proposedParameters?.refundAmount || ''
  );
  const [currency, setCurrency] = useState(
    currentResolution?.proposedParameters?.currency || 'USD'
  );
  const [replacementItemName, setReplacementItemName] = useState(
    currentResolution?.proposedParameters?.replacementItemName || ''
  );
  const [replacementSku, setReplacementSku] = useState(
    currentResolution?.proposedParameters?.replacementSku || ''
  );
  const [informationRequested, setInformationRequested] = useState(
    currentResolution?.proposedParameters?.informationRequested || ''
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentResolution) {
      setAction(currentResolution.action || 'REPLACEMENT');
      setRefundAmount(currentResolution.proposedParameters?.refundAmount || '');
      setCurrency(currentResolution.proposedParameters?.currency || 'USD');
      setReplacementItemName(currentResolution.proposedParameters?.replacementItemName || '');
      setReplacementSku(currentResolution.proposedParameters?.replacementSku || '');
      setInformationRequested(
        currentResolution.proposedParameters?.informationRequested || ''
      );
    }
  }, [currentResolution]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (decision === 'REJECTED' && !notes.trim()) {
      setError('Please provide a note explaining the reason for rejection.');
      return;
    }

    const payload = {
      decision,
      notes: notes.trim(),
    };

    if (decision === 'MODIFIED') {
      payload.modifiedResolution = {
        action,
        proposedParameters: {
          refundAmount: action === 'REFUND' ? Number(refundAmount) || null : null,
          currency,
          replacementItemName: action === 'REPLACEMENT' ? replacementItemName : null,
          replacementSku: action === 'REPLACEMENT' ? replacementSku : null,
          informationRequested: action === 'REQUEST_INFORMATION' ? informationRequested : null,
        },
      };
    }

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Human Review & Approval</h2>
              <p className="text-xs text-slate-500">
                Support oversight on AI-proposed resolution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Decision Selection */}
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-2">
              Review Decision
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3 rounded-xl border text-center font-semibold transition-all flex flex-col items-center space-y-1.5 ${
                  decision === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Approve As-Is</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('MODIFIED')}
                className={`p-3 rounded-xl border text-center font-semibold transition-all flex flex-col items-center space-y-1.5 ${
                  decision === 'MODIFIED'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-800 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Parameters</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`p-3 rounded-xl border text-center font-semibold transition-all flex flex-col items-center space-y-1.5 ${
                  decision === 'REJECTED'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-800 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject Claim</span>
              </button>
            </div>
          </div>

          {/* Original AI Resolution Summary */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 text-[11px] block">
              AI Proposed Action: <span className="font-bold text-blue-700">{currentResolution?.action}</span>
            </span>
            <p className="text-[11px] italic line-clamp-2">
              "{currentResolution?.justification}"
            </p>
          </div>

          {/* Parameter Modification Fields */}
          {decision === 'MODIFIED' && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Override Action
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="REPLACEMENT">REPLACEMENT (Ship replacement item)</option>
                  <option value="REFUND">REFUND (Return payment)</option>
                  <option value="REQUEST_INFORMATION">REQUEST_INFORMATION (Ask customer for proof)</option>
                  <option value="ESCALATE">ESCALATE (Escalate to management)</option>
                </select>
              </div>

              {action === 'REFUND' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Refund Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="e.g. 149.99"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Currency</label>
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {action === 'REPLACEMENT' && (
                <div className="space-y-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Replacement Item Name</label>
                    <input
                      type="text"
                      value={replacementItemName}
                      onChange={(e) => setReplacementItemName(e.target.value)}
                      placeholder="e.g. AeroGlide Pro Wireless Earbuds"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Replacement SKU</label>
                    <input
                      type="text"
                      value={replacementSku}
                      onChange={(e) => setReplacementSku(e.target.value)}
                      placeholder="e.g. AG-EAR-01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {action === 'REQUEST_INFORMATION' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Information Needed</label>
                  <textarea
                    rows={2}
                    value={informationRequested}
                    onChange={(e) => setInformationRequested(e.target.value)}
                    placeholder="e.g. Please provide photos of package barcode and damaged packaging."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Review Notes */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Staff Review Notes & Audit Justification
              {decision === 'REJECTED' && <span className="text-rose-600 font-bold ml-1">*</span>}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                decision === 'REJECTED'
                  ? 'State why this complaint is being rejected under policy guidelines...'
                  : 'Add any optional review comments or instructions for the customer response...'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all flex items-center space-x-1.5 ${
                decision === 'REJECTED'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : decision === 'MODIFIED'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Review & Drafting Email...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {decision === 'REJECTED'
                      ? 'Confirm Rejection'
                      : decision === 'MODIFIED'
                      ? 'Save Edits & Draft Email'
                      : 'Approve & Draft Email'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HumanReviewModal;
