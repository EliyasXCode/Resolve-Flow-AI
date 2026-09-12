import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import complaintService from '../services/complaintService.js';
import workflowService from '../services/workflowService.js';
import { StatusBadge } from '../components/Badge.jsx';
import { formatDate } from '../utils/formatters.js';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Loader2,
  User,
  Package,
  Bot,
  Sparkles,
} from 'lucide-react';

const STATUS_LIST = [
  'ALL',
  'SUBMITTED',
  'QUEUED',
  'TRIAGING',
  'RETRIEVING_KNOWLEDGE',
  'GENERATING_RESOLUTION',
  'PENDING_APPROVAL',
  'NEEDS_MANUAL_REVIEW',
  'APPROVED',
  'REJECTED',
  'DRAFTING_RESPONSE',
  'RESPONSE_DRAFTED',
  'EXECUTING_ACTION',
  'COMPLETED',
  'FAILED',
];

export const SupportQueuePage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [triagingId, setTriagingId] = useState(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const res = await complaintService.getComplaints(params);
      if (res.success) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.error('Error fetching support queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQueue();
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      setUpdatingId(complaintId);
      const res = await complaintService.updateStatus(complaintId, newStatus);
      if (res.success) {
        setComplaints((prev) =>
          prev.map((c) => (c._id === complaintId ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRunTriage = async (complaintId) => {
    try {
      setTriagingId(complaintId);
      const res = await workflowService.triggerTriage(complaintId);
      if (res.success) {
        // Refresh queue
        fetchQueue();
      }
    } catch (err) {
      alert('Triage execution failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setTriagingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Support Complaint Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Staff Access
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Review incoming claims, oversee multi-agent status transitions, and manage customer resolutions.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search complaints by keyword..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        {/* Status Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full pb-2 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {['ALL', 'SUBMITTED', 'TRIAGING', 'RETRIEVING_KNOWLEDGE', 'PENDING_APPROVAL', 'COMPLETED'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-sm mt-3 font-medium">Fetching complaint queue...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm">No complaints match your active filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Customer & Title</th>
                  <th className="px-6 py-3.5">Order Ref</th>
                  <th className="px-6 py-3.5">Current Status</th>
                  <th className="px-6 py-3.5">AI Triage</th>
                  <th className="px-6 py-3.5">Advance Status</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {complaints.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 line-clamp-1">{c.title}</div>
                      <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>
                          {c.customerId?.name} ({c.customerId?.email})
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {c.orderId ? (
                        <div className="flex items-center space-x-1 text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
                          <Package className="w-3 h-3" />
                          <span>{c.orderId.orderNumber || 'Order'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>

                    <td className="px-6 py-4">
                      {c.status === 'SUBMITTED' ? (
                        <button
                          onClick={() => handleRunTriage(c._id)}
                          disabled={triagingId === c._id}
                          className="inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                        >
                          {triagingId === c._id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Triaging...</span>
                            </>
                          ) : (
                            <>
                              <Bot className="w-3 h-3" />
                              <span>Run Triage</span>
                            </>
                          )}
                        </button>
                      ) : c.status === 'PENDING_APPROVAL' || c.status === 'NEEDS_MANUAL_REVIEW' ? (
                        <Link
                          to={`/complaints/${c._id}`}
                          className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors"
                        >
                          <span>Review & Decide</span>
                        </Link>
                      ) : c.status === 'RESPONSE_DRAFTED' ? (
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Draft Ready
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">
                          {c.category !== 'UNSPECIFIED' ? c.category : 'Analyzed'}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <select
                        disabled={updatingId === c._id}
                        value={c.status}
                        onChange={(e) => handleStatusChange(c._id, e.target.value)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                      >
                        {STATUS_LIST.filter((s) => s !== 'ALL').map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDate(c.createdAt)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/complaints/${c._id}`}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-500"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportQueuePage;
