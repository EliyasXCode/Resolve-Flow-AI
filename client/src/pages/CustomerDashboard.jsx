import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import complaintService from '../services/complaintService.js';
import orderService from '../services/orderService.js';
import { StatusBadge } from '../components/Badge.jsx';
import { formatDate, formatCurrency } from '../utils/formatters.js';
import {
  Plus,
  Package,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  ShoppingBag,
  ExternalLink,
  Loader2,
  X,
  Layers,
} from 'lucide-react';

export const CustomerDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');

  // New complaint form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('DAMAGED_ITEM');
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch complaints
      const complaintsRes = await complaintService.getComplaints();
      if (complaintsRes.success) {
        setComplaints(complaintsRes.complaints);
      }

      // Fetch or ensure sample orders
      const ordersRes = await orderService.ensureSampleOrders();
      if (ordersRes.success) {
        setOrders(ordersRes.orders);
        if (ordersRes.orders.length > 0) {
          setSelectedOrderId(ordersRes.orders[0]._id);
        }
      }
    } catch (err) {
      console.error('Error loading customer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await complaintService.createComplaint({
        title,
        description,
        category,
        orderId: selectedOrderId || null,
      });

      if (res.success) {
        setShowModal(false);
        setTitle('');
        setDescription('');
        // Refresh list
        fetchData();
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        setFormError(data.errors.map((e) => e.message).join('. '));
      } else {
        setFormError(data?.message || err.message || 'Failed to submit complaint');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const total = complaints.length;
  const inProgress = complaints.filter((c) => !['COMPLETED', 'FAILED'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="sm:flex sm:items-center sm:justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and resolve your complaints through our orchestrated multi-agent resolution pipeline.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>File New Complaint</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Complaints
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Processing
            </p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{inProgress}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Resolved Cases
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{resolved}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Complaints Table Section */}
      <div className="mt-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-slate-800 text-base">Your Active & Past Complaints</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Tenant Isolated: Showing your records only
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-sm mt-3 font-medium">Loading your complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No complaints filed yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              If you have any issues with your orders or deliveries, file a complaint to start the automated resolution flow.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Complaint</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Complaint Title</th>
                  <th className="px-6 py-3.5">Linked Order</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Submitted Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {complaints.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="line-clamp-1">{c.title}</div>
                      <div className="text-xs text-slate-400 font-normal mt-0.5">
                        Category: {c.category.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.orderId ? (
                        <div className="flex items-center space-x-1.5 font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
                          <Package className="w-3.5 h-3.5" />
                          <span>{c.orderId.orderNumber || 'Verified Order'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/complaints/${c._id}`}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-500"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Complaint Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">File a Complaint</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                  Complaint Subject / Title * <span className="text-slate-400 font-normal lowercase">(min 3 chars)</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Earbuds arrived with defective left speaker"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                  Verified Order Reference
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No order reference (General issue)</option>
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} - {formatCurrency(o.totalAmount, o.currency)} ({o.items[0]?.name || 'Items'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Only orders registered to your account can be linked (Order Ownership Verification).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DAMAGED_ITEM">Damaged / Defective Item</option>
                  <option value="LATE_DELIVERY">Late Delivery / Not Received</option>
                  <option value="WRONG_ITEM">Wrong Item Received</option>
                  <option value="REFUND_REQUEST">Refund / Return Request</option>
                  <option value="BILLING_ISSUE">Billing or Payment Issue</option>
                  <option value="GENERAL_INQUIRY">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                  Detailed Description * <span className="text-slate-400 font-normal lowercase">(min 5 chars)</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what happened, the condition of the package, and your expected resolution..."
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Complaint</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
