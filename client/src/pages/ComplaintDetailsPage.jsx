import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import complaintService from '../services/complaintService.js';
import workflowService from '../services/workflowService.js';
import { StatusBadge } from '../components/Badge.jsx';
import HumanReviewModal from '../components/HumanReviewModal.jsx';
import { formatDate, formatCurrency } from '../utils/formatters.js';
import {
  ArrowLeft,
  Package,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Cpu,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Tag,
  Activity,
  Bot,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Scale,
  FileText,
  Check,
  ExternalLink,
  HelpCircle,
  RotateCcw,
  Mail,
  Send,
  UserCheck,
  Edit3,
  XCircle,
  ThumbsUp,
  MessageSquare,
  Sparkle,
  CreditCard,
  Truck,
  FileCheck,
  CheckCheck,
  Play,
  PartyPopper,
} from 'lucide-react';

export const ComplaintDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [approval, setApproval] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triaging, setTriaging] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTriageAudit, setShowTriageAudit] = useState(false);
  const [showResolutionAudit, setShowResolutionAudit] = useState(false);
  const [showDraftAudit, setShowDraftAudit] = useState(false);
  const [showActionAudit, setShowActionAudit] = useState(false);

  const isStaff = user && (user.role === 'support' || user.role === 'admin');

  const fetchComplaintAndWorkflow = async () => {
    try {
      setLoading(true);
      const res = await complaintService.getComplaintById(id);
      if (res.success) {
        setComplaint(res.complaint);
      }

      // Fetch workflow, approval record & telemetry logs
      try {
        const wfRes = await workflowService.getWorkflow(id);
        if (wfRes.success) {
          setWorkflow(wfRes.workflow);
          setApproval(wfRes.approval || null);
          setExecutions(wfRes.executions || []);
        }
      } catch (wfErr) {
        console.warn('Workflow fetch warning:', wfErr.message);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Unable to load complaint details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintAndWorkflow();
  }, [id]);

  const handleRunTriage = async () => {
    try {
      setTriaging(true);
      const res = await workflowService.triggerTriage(id);
      if (res.success) {
        setWorkflow(res.workflow);
        setExecutions(res.executions || []);
        const updatedComplaint = await complaintService.getComplaintById(id);
        if (updatedComplaint.success) {
          setComplaint(updatedComplaint.complaint);
        }
      }
    } catch (err) {
      alert('Triage execution failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setTriaging(false);
    }
  };

  const handleRunResolution = async () => {
    try {
      setResolving(true);
      const res = await workflowService.triggerResolution(id);
      if (res.success) {
        setWorkflow(res.workflow);
        setExecutions(res.executions || []);
        const updatedComplaint = await complaintService.getComplaintById(id);
        if (updatedComplaint.success) {
          setComplaint(updatedComplaint.complaint);
        }
      }
    } catch (err) {
      alert('Resolution Agent execution failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setResolving(false);
    }
  };

  const handleRunOrchestration = async () => {
    try {
      setOrchestrating(true);
      const res = await workflowService.runOrchestration(id);
      if (res.success) {
        setWorkflow(res.workflow);
        setExecutions(res.executions || []);
        const updatedComplaint = await complaintService.getComplaintById(id);
        if (updatedComplaint.success) setComplaint(updatedComplaint.complaint);
      }
    } catch (err) {
      alert('Orchestration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setOrchestrating(false);
    }
  };

  const handleExecuteAction = async () => {
    try {
      setExecutingAction(true);
      const res = await workflowService.executeAction(id);
      if (res.success) {
        setWorkflow(res.workflow);
        setExecutions(res.executions || []);
        const updatedComplaint = await complaintService.getComplaintById(id);
        if (updatedComplaint.success) setComplaint(updatedComplaint.complaint);
      }
    } catch (err) {
      alert('Action execution failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExecutingAction(false);
    }
  };

  const handleQuickApprove = async () => {
    try {
      setSubmittingReview(true);
      const res = await workflowService.reviewResolution(id, {
        decision: 'APPROVED',
        notes: 'Approved as recommended by automated policy engine.',
      });
      if (res.success) {
        setWorkflow(res.workflow);
        setApproval(res.approval);
        setExecutions(res.executions || []);
        const updatedComplaint = await complaintService.getComplaintById(id);
        if (updatedComplaint.success) setComplaint(updatedComplaint.complaint);

        // Seamlessly auto-execute simulated external action (Stripe refund / FedEx dispatch)
        try {
          const actRes = await workflowService.executeAction(id);
          if (actRes.success) {
            setWorkflow(actRes.workflow);
            setExecutions(actRes.executions || []);
            const finalComplaint = await complaintService.getComplaintById(id);
            if (finalComplaint.success) setComplaint(finalComplaint.complaint);
          }
        } catch (actErr) {
          console.warn('Simulated action execution warning:', actErr.message);
        }
      }
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewSubmit = async (payload) => {
    try {
      setSubmittingReview(true);
      const res = await workflowService.reviewResolution(id, payload);
      if (res.success) {
        setIsReviewModalOpen(false);
        setWorkflow(res.workflow);
        setApproval(res.approval);
        setExecutions(res.executions || []);
        const updatedComplaint = await complaintService.getComplaintById(id);
        if (updatedComplaint.success) setComplaint(updatedComplaint.complaint);

        // Seamlessly auto-execute simulated external action
        try {
          const actRes = await workflowService.executeAction(id);
          if (actRes.success) {
            setWorkflow(actRes.workflow);
            setExecutions(actRes.executions || []);
            const finalComplaint = await complaintService.getComplaintById(id);
            if (finalComplaint.success) setComplaint(finalComplaint.complaint);
          }
        } catch (actErr) {
          console.warn('Simulated action execution warning:', actErr.message);
        }
      }
    } catch (err) {
      alert('Review submission failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRegenerateDraft = async () => {
    try {
      setDraftingEmail(true);
      const res = await workflowService.triggerDraft(id);
      if (res.success) {
        setWorkflow(res.workflow);
        setExecutions(res.executions || []);
        const updatedComplaint = await complaintService.getComplaintById(id);
        if (updatedComplaint.success) setComplaint(updatedComplaint.complaint);
      }
    } catch (err) {
      alert('Draft regeneration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDraftingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading complaint record...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          {errorMsg || 'You do not have permission to access this complaint, or it does not exist.'}
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const order = complaint.orderId;
  const triageData = workflow?.stageOutputs?.triage;
  const knowledgeData = workflow?.stageOutputs?.knowledge;
  const resolutionData = workflow?.stageOutputs?.resolution;
  const draftData = workflow?.stageOutputs?.draft;
  const actionData = workflow?.stageOutputs?.action;

  const latestTriageExecution = executions.find((e) => e.stage === 'TRIAGE');
  const latestResolutionExecution = executions.find((e) => e.stage === 'RESOLUTION');
  const latestDraftExecution = executions.find((e) => e.stage === 'DRAFT');
  const latestActionExecution = executions.find((e) => e.stage === 'ACTION');

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'REPLACEMENT':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'REFUND':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REQUEST_INFORMATION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'REJECT':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'ESCALATE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Approved by Staff
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Modified by Staff
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            Rejected by Staff
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Action Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Complaints</span>
        </Link>

        <div className="flex items-center space-x-2">
          {/* Action Button: 1-Click End-to-End Pipeline */}
          {complaint.status === 'SUBMITTED' && (
            <button
              onClick={handleRunOrchestration}
              disabled={orchestrating}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-indigo-600 to-blue-600 hover:from-amber-400 hover:to-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-indigo-500/25 disabled:opacity-50 transition-all"
            >
              {orchestrating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running Orchestration Pipeline...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>⚡ 1-Click End-to-End Pipeline</span>
                </>
              )}
            </button>
          )}

          {/* Action Button: Run Triage if still submitted */}
          {complaint.status === 'SUBMITTED' && (
            <button
              onClick={handleRunTriage}
              disabled={triaging || orchestrating}
              className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 disabled:opacity-50 transition-all"
            >
              {triaging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running Triage Agent...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-blue-600" />
                  <span>Run Triage Only</span>
                </>
              )}
            </button>
          )}

          {/* Action Button: Run Resolution if triaged and resolution not yet run */}
          {triageData && !resolutionData && (
            <button
              onClick={handleRunResolution}
              disabled={resolving}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
            >
              {resolving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running Policy RAG & Resolution...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Run Resolution Agent (RAG)</span>
                </>
              )}
            </button>
          )}

          {/* Action Button: Execute Simulated Action if approved and not yet executed */}
          {approval && !actionData && isStaff && (
            <button
              onClick={handleExecuteAction}
              disabled={executingAction}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-emerald-500/25 disabled:opacity-50 transition-all animate-pulse"
            >
              {executingAction ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing External Action...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>⚡ Execute Simulated Action</span>
                </>
              )}
            </button>
          )}

          {/* Re-run Resolution if already completed */}
          {resolutionData && complaint.status !== 'COMPLETED' && (
            <button
              onClick={handleRunResolution}
              disabled={resolving}
              className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resolving ? 'Re-resolving...' : 'Re-run Resolution Agent'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Resolution Celebration Banner when Completed */}
      {complaint.status === 'COMPLETED' && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-xl p-5 mb-6 shadow-md border border-emerald-500/40 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <PartyPopper className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Complaint Successfully Resolved & Executed</span>
                <span className="text-[11px] font-mono font-normal bg-white/20 px-2 py-0.5 rounded">
                  Status: COMPLETED
                </span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                The full multi-agent lifecycle completed: Ingestion → AI Triage → Policy Vector RAG → Human Staff Approval → Customer Communication → External Action Execution.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-1 bg-white/15 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-semibold text-emerald-50">
            <CheckCheck className="w-4 h-4 text-emerald-200" />
            <span>Full SLA Met</span>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="font-mono text-xs text-slate-400">ID: {complaint._id}</span>
              <StatusBadge status={complaint.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{complaint.title}</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-4">
              <span>Submitted by {complaint.customerId?.name || 'Customer'}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(complaint.createdAt)}</span>
              </span>
            </p>
          </div>

          {complaint.status !== 'SUBMITTED' && (
            <div className="mt-3 sm:mt-0 flex items-center space-x-2">
              <button
                onClick={handleRunTriage}
                disabled={triaging}
                className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md border border-indigo-200 transition-colors"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{triaging ? 'Re-analyzing...' : 'Re-run Triage'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Demo Mode Notice */}
        <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="font-medium">
              Demo Environment: Grounded AI with human oversight. Simulated actions & email dispatches.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-blue-700 uppercase">Simulated</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Pipeline Cards, Human Review & Customer Draft */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phase 2: AI Triage Agent Analysis Card */}
          {triageData ? (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-xl p-6 shadow-md border border-indigo-800/50">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                      Stage 1: Triage Agent Analysis
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Validated structured classification powered by Google Gemini
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {triageData.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      triageData.urgency === 'URGENT' || triageData.urgency === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {triageData.urgency} Urgency
                  </span>
                </div>
              </div>

              {/* Summary & Reasoning */}
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Objective Grievance Summary:
                  </span>
                  <p className="mt-1 text-slate-200 text-sm leading-relaxed bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                    {triageData.summary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/40">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">
                      Customer Sentiment:
                    </span>
                    <p className="font-bold text-slate-100 mt-0.5 capitalize">
                      {triageData.sentiment.toLowerCase()}
                    </p>
                  </div>

                  <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/40">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center space-x-1">
                      <span>Model Confidence:</span>
                      <Info
                        className="w-3 h-3 text-slate-500"
                        title="Uncalibrated model heuristic estimate, not measured statistical accuracy."
                      />
                    </span>
                    <p className="font-bold text-indigo-300 mt-0.5">
                      {(triageData.confidenceEstimate * 100).toFixed(0)}%{' '}
                      <span className="text-[10px] font-normal text-slate-400">(Uncalibrated)</span>
                    </p>
                  </div>
                </div>

                {/* Extracted Entities */}
                {triageData.extractedEntities && (
                  <div className="pt-2">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Extracted Entities:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {triageData.extractedEntities.productNames?.map((p, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-200 border border-blue-700/50 text-[11px]"
                        >
                          📦 {p}
                        </span>
                      ))}
                      {triageData.extractedEntities.orderNumbers?.map((o, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-200 border border-purple-700/50 text-[11px] font-mono"
                        >
                          🏷️ {o}
                        </span>
                      ))}
                      {triageData.extractedEntities.monetaryAmounts?.map((m, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-200 border border-emerald-700/50 text-[11px]"
                        >
                          💵 {m}
                        </span>
                      ))}
                      {triageData.extractedEntities.issuesDetected?.map((issue, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-200 border border-amber-700/50 text-[11px]"
                        >
                          ⚠️ {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Telemetry Drawer */}
                {latestTriageExecution && (
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setShowTriageAudit(!showTriageAudit)}
                      className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Stage 1 Audit Telemetry</span>
                      {showTriageAudit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showTriageAudit && (
                      <div className="mt-2 p-3 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                        <div>Model: {latestTriageExecution.model}</div>
                        <div>Duration: {latestTriageExecution.durationMs}ms</div>
                        <div>
                          Tokens: {latestTriageExecution.tokenUsage?.totalTokens || 0} total (
                          {latestTriageExecution.tokenUsage?.promptTokens || 0} prompt /{' '}
                          {latestTriageExecution.tokenUsage?.candidatesTokens || 0} completion)
                        </div>
                        <div>Attempt: {latestTriageExecution.attempt}</div>
                        <div>Status: {latestTriageExecution.status}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-indigo-50/70 border border-dashed border-indigo-300 rounded-xl p-6 text-center">
              <Bot className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Triage Agent Ready</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Execute the first AI module to classify sentiment, assess urgency, extract entities, and summarize claims.
              </p>
              <button
                onClick={handleRunTriage}
                disabled={triaging}
                className="mt-3 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                {triaging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Trigger Triage Agent</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Phase 3: Retrieved Policy Citations Card (Atlas Vector Search) */}
          {knowledgeData?.citations && knowledgeData.citations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Stage 2: Retrieved Policy Citations
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      MongoDB Atlas Vector Search on collection <code className="text-teal-700 font-mono">policy_chunks</code>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {knowledgeData.citations.length} Chunks Retrieved
                </span>
              </div>

              {/* Retrieval Query Text */}
              {knowledgeData.queryText && (
                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                  <span className="font-semibold text-slate-700">Embedding Query:</span>{' '}
                  <span className="text-slate-600 italic font-mono text-[11px]">
                    "{knowledgeData.queryText}"
                  </span>
                </div>
              )}

              {/* Citations List */}
              <div className="mt-4 space-y-3">
                {knowledgeData.citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{c.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                          {c.category}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Similarity: {(c.relevanceScore * 100).toFixed(1)}%
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed italic border-l-2 border-teal-500 pl-3">
                      "{c.text}"
                    </p>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
                      <span>Chunk ID: {c.chunkId}</span>
                      <span>Policy Ref: {c.policyId}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3: Grounded Resolution Recommendation Card */}
          {resolutionData && (
            <div className="bg-white border-2 border-emerald-500/40 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Stage 3: Grounded Resolution Recommendation
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Grounded policy reasoning with human-in-the-loop requirement
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getActionBadgeColor(
                      resolutionData.action
                    )}`}
                  >
                    Action: {resolutionData.action}
                  </span>
                </div>
              </div>

              {/* Justification */}
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                    Policy Grounded Justification:
                  </span>
                  <p className="mt-1 text-slate-800 text-sm leading-relaxed bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200">
                    {resolutionData.justification}
                  </p>
                </div>

                {/* Proposed Parameters */}
                {resolutionData.proposedParameters && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 text-[11px] block mb-1.5">
                      Proposed Resolution Parameters:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {resolutionData.proposedParameters.refundAmount != null && (
                        <div>
                          <span className="text-slate-500">Refund Amount:</span>{' '}
                          <span className="font-bold text-slate-900">
                            {formatCurrency(
                              resolutionData.proposedParameters.refundAmount,
                              resolutionData.proposedParameters.currency || 'USD'
                            )}
                          </span>
                        </div>
                      )}
                      {resolutionData.proposedParameters.replacementItemName && (
                        <div>
                          <span className="text-slate-500">Replacement Item:</span>{' '}
                          <span className="font-bold text-slate-900">
                            {resolutionData.proposedParameters.replacementItemName}
                          </span>
                        </div>
                      )}
                      {resolutionData.proposedParameters.replacementSku && (
                        <div>
                          <span className="text-slate-500">Replacement SKU:</span>{' '}
                          <span className="font-mono font-bold text-slate-900">
                            {resolutionData.proposedParameters.replacementSku}
                          </span>
                        </div>
                      )}
                      {resolutionData.proposedParameters.informationRequested && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Information Requested:</span>{' '}
                          <span className="font-semibold text-slate-800">
                            {resolutionData.proposedParameters.informationRequested}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Policy References Cited */}
                {resolutionData.policyReferences && resolutionData.policyReferences.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Policy References Cited:
                    </span>
                    <div className="space-y-1.5">
                      {resolutionData.policyReferences.map((ref, i) => (
                        <div
                          key={i}
                          className="text-xs p-2 rounded bg-slate-50 border border-slate-200 flex items-start space-x-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800">{ref.title}:</span>{' '}
                            <span className="text-slate-600 italic text-[11px]">
                              "{ref.citationText}"
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guardrails and Confidence */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-900">
                      Human Review Status:
                    </span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {resolutionData.requiresApproval ? 'Mandatory Approval Required' : 'Auto-approved'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                      <span>Model Confidence:</span>
                      <Info
                        className="w-3 h-3 text-slate-400"
                        title="Uncalibrated model heuristic estimate, not measured statistical accuracy."
                      />
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {(resolutionData.confidenceScore * 100).toFixed(0)}%{' '}
                      <span className="text-[10px] font-normal text-slate-500">(Heuristic)</span>
                    </span>
                  </div>
                </div>

                {/* Audit Telemetry Drawer */}
                {latestResolutionExecution && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowResolutionAudit(!showResolutionAudit)}
                      className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Stage 3 Audit Telemetry</span>
                      {showResolutionAudit ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {showResolutionAudit && (
                      <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                        <div>Model: {latestResolutionExecution.model}</div>
                        <div>Duration: {latestResolutionExecution.durationMs}ms</div>
                        <div>
                          Tokens: {latestResolutionExecution.tokenUsage?.totalTokens || 0} total (
                          {latestResolutionExecution.tokenUsage?.promptTokens || 0} prompt /{' '}
                          {latestResolutionExecution.tokenUsage?.candidatesTokens || 0} completion)
                        </div>
                        <div>Attempt: {latestResolutionExecution.attempt}</div>
                        <div>Status: {latestResolutionExecution.status}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 4: Human Review & Decision Panel */}
          {resolutionData && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Stage 4: Human Review & Staff Oversight
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Mandatory human-in-the-loop authorization before actions are executed
                    </p>
                  </div>
                </div>

                {approval && getDecisionBadge(approval.decision)}
              </div>

              {/* If already reviewed, display the Approval Record */}
              {approval ? (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <div>
                      <span className="text-slate-500 font-semibold">Reviewed By:</span>{' '}
                      <span className="font-bold text-slate-900">
                        {approval.reviewedBy?.name || 'Support Staff'}
                      </span>{' '}
                      <span className="text-slate-400 capitalize">({approval.reviewedBy?.role || 'Staff'})</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {formatDate(approval.createdAt)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block mb-0.5">Staff Review Notes:</span>
                    <p className="text-slate-800 italic bg-white p-2.5 rounded border border-slate-200/80">
                      "{approval.notes || 'No custom review notes attached.'}"
                    </p>
                  </div>

                  {approval.decision === 'MODIFIED' && (
                    <div className="p-2.5 bg-blue-50 rounded border border-blue-200">
                      <span className="font-bold text-blue-900 block mb-1">Human Modified Action & Parameters:</span>
                      <div className="text-slate-700 space-y-0.5 text-[11px]">
                        <div>Action: <strong className="text-blue-800">{approval.finalResolution.action}</strong></div>
                        {approval.finalResolution.proposedParameters?.refundAmount != null && (
                          <div>
                            Refund Amount: <strong>${approval.finalResolution.proposedParameters.refundAmount}</strong>
                          </div>
                        )}
                        {approval.finalResolution.proposedParameters?.replacementItemName && (
                          <div>
                            Replacement Item: <strong>{approval.finalResolution.proposedParameters.replacementItemName}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isStaff && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => setIsReviewModalOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Review / Change Decision</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Awaiting Review Action Buttons */
                <div className="mt-4">
                  {isStaff ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                      <div className="flex items-center space-x-2 text-slate-800 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>Support Staff Action Required: Please review the AI resolution proposal.</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={handleQuickApprove}
                          disabled={submittingReview}
                          className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                        >
                          {submittingReview ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ThumbsUp className="w-3.5 h-3.5" />
                          )}
                          <span>1-Click Approve AI Proposal</span>
                        </button>

                        <button
                          onClick={() => setIsReviewModalOpen(true)}
                          disabled={submittingReview}
                          className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Parameters & Approve</span>
                        </button>

                        <button
                          onClick={() => setIsReviewModalOpen(true)}
                          disabled={submittingReview}
                          className="inline-flex items-center space-x-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject Claim</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2.5">
                      <div className="flex items-start space-x-2">
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-sm text-amber-950">Awaiting Human Support Approval</span>
                          <p className="text-amber-800 mt-0.5">
                            Your case has been analyzed by our automated policy engine. A support representative will review and authorize the final resolution shortly.
                          </p>
                        </div>
                      </div>

                      {/* Demo Guidance Notice */}
                      <div className="mt-2 p-3 bg-white/90 rounded-lg border border-amber-300 text-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-bold text-slate-900">🛡️ Role Security in Action:</span> You are logged in as a <strong>Customer ({user?.name || 'Customer'})</strong>. Customers cannot approve their own claims.
                          <div className="text-slate-500 mt-0.5">
                            To test approving, editing, or rejecting this resolution, log in as <strong>Support Staff</strong> (<code className="text-blue-700 font-mono">support@resolveflow.ai</code> / <code className="text-blue-700 font-mono">SupportPassword123!</code>).
                          </div>
                        </div>
                        <Link
                          to="/login"
                          className="inline-flex items-center space-x-1 whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Login as Support</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Phase 4: Stage 5 — Customer Communication Draft Card */}
          {draftData && (
            <div className="bg-white border-2 border-indigo-500/30 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Stage 5: Customer Communication Draft
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Drafted by Communication Agent powered by Google Gemini
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Tone: {draftData.tone}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    SIMULATED DISPATCH
                  </span>
                </div>
              </div>

              {/* Email Container */}
              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-800 font-sans">To:</span>{' '}
                    <span>{draftData.simulatedDelivery?.recipient || complaint.customerId?.email}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 font-sans">Subject:</span>{' '}
                    <span className="font-bold text-slate-900 font-sans">{draftData.subject}</span>
                  </div>
                </div>

                {/* Body Preview */}
                <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line text-xs font-sans">
                  {draftData.body}
                </div>

                {/* Key Points Covered */}
                {draftData.keyPointsCovered && draftData.keyPointsCovered.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Key Communication Points Covered:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {draftData.keyPointsCovered.map((pt, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px]"
                        >
                          ✓ {pt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Telemetry & Re-draft Option */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {latestDraftExecution ? (
                    <button
                      onClick={() => setShowDraftAudit(!showDraftAudit)}
                      className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Stage 5 Audit Telemetry</span>
                      {showDraftAudit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div />
                  )}

                  {isStaff && (
                    <button
                      onClick={handleRegenerateDraft}
                      disabled={draftingEmail}
                      className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{draftingEmail ? 'Re-drafting...' : 'Re-generate Customer Draft'}</span>
                    </button>
                  )}
                </div>

                {showDraftAudit && latestDraftExecution && (
                  <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                    <div>Model: {latestDraftExecution.model}</div>
                    <div>Duration: {latestDraftExecution.durationMs}ms</div>
                    <div>
                      Tokens: {latestDraftExecution.tokenUsage?.totalTokens || 0} total (
                      {latestDraftExecution.tokenUsage?.promptTokens || 0} prompt /{' '}
                      {latestDraftExecution.tokenUsage?.candidatesTokens || 0} completion)
                    </div>
                    <div>Attempt: {latestDraftExecution.attempt}</div>
                    <div>Status: {latestDraftExecution.status}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage 6: Simulated External Action Execution */}
          {actionData ? (
            <div className="bg-white border-2 border-emerald-500/40 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Stage 6: Simulated Action Execution
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Settled via Simulated Financial Gateway & Fulfillment Logistics
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {actionData.status}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                    SIMULATED EXTERNAL SYSTEM
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* 1. Refund Settlement Receipt */}
                {actionData.actionType === 'REFUND' && (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-emerald-900">{actionData.gateway}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                        SETTLED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Amount Refunded
                        </span>
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(actionData.amountRefunded, actionData.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Destination Account
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {actionData.destinationAccount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Simulated Transaction ID
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          {actionData.transactionId}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Settlement Timestamp
                        </span>
                        <span className="text-xs text-slate-700">
                          {formatDate(actionData.settlementTimestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-emerald-200/60 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>{actionData.notes}</span>
                      <span className="text-[10px] text-slate-400">Sandbox Fee: ${actionData.simulatedFeeDeducted}</span>
                    </div>
                  </div>
                )}

                {/* 2. Replacement Shipping Dispatch Receipt */}
                {actionData.actionType === 'REPLACEMENT' && (
                  <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/60">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-blue-900">{actionData.carrier}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                        DISPATCHED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Tracking Number
                        </span>
                        <span className="font-mono text-sm font-bold text-blue-700">
                          {actionData.trackingNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Estimated Delivery
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {actionData.estimatedDelivery}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Dispatched Item & SKU
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {actionData.dispatchedItem} ({actionData.dispatchedSku})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Warehouse Facility
                        </span>
                        <span className="text-xs font-mono text-slate-700">
                          {actionData.warehouseId}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-blue-200/60 text-[11px] text-slate-600">
                      <span>{actionData.notes}</span>
                    </div>
                  </div>
                )}

                {/* 3. Information Request Ticket */}
                {actionData.actionType === 'REQUEST_INFORMATION' && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                      <div className="flex items-center space-x-2">
                        <FileCheck className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-amber-900">Evidence Upload Ticket</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white">
                        AWAITING EVIDENCE
                      </span>
                    </div>

                    <div className="space-y-2 mt-3 text-xs">
                      <div>
                        <span className="text-slate-500">Ticket Reference:</span>{' '}
                        <span className="font-mono font-bold text-amber-800">{actionData.ticketId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Requested Evidence:</span>{' '}
                        <span className="font-medium text-slate-800">{actionData.informationRequested}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Submission Deadline:</span>{' '}
                        <span className="font-semibold text-slate-900">{actionData.submissionDeadline}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Secure Upload URL:</span>{' '}
                        <span className="font-mono text-blue-600 underline">{actionData.secureUploadPortalUrl}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Rejection Case Closure */}
                {actionData.actionType === 'REJECT' && (
                  <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-rose-200/60">
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span className="font-bold text-rose-900">Case Closure Certificate</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                        CLOSED
                      </span>
                    </div>

                    <div className="space-y-2 mt-3 text-xs">
                      <div>
                        <span className="text-slate-500">Closure Reference:</span>{' '}
                        <span className="font-mono font-bold text-rose-800">{actionData.closureReference}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Justification:</span>{' '}
                        <span className="font-medium text-slate-800">{actionData.justification}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Formal appeal window: {actionData.appealWindowDays} calendar days.
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 6 Audit Telemetry */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {latestActionExecution ? (
                    <button
                      onClick={() => setShowActionAudit(!showActionAudit)}
                      className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Stage 6 Audit Telemetry</span>
                      {showActionAudit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div />
                  )}

                  {isStaff && (
                    <button
                      onClick={handleExecuteAction}
                      disabled={executingAction}
                      className="inline-flex items-center space-x-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{executingAction ? 'Re-executing...' : 'Re-execute External Action'}</span>
                    </button>
                  )}
                </div>

                {showActionAudit && latestActionExecution && (
                  <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                    <div>Model: {latestActionExecution.model}</div>
                    <div>Duration: {latestActionExecution.durationMs}ms</div>
                    <div>Stage: {latestActionExecution.stage}</div>
                    <div>Attempt: {latestActionExecution.attempt}</div>
                    <div>Status: {latestActionExecution.status}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Prompt Card if draft exists but action not yet executed */
            draftData && isStaff && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-5 shadow-sm">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span>Stage 6: Ready for Simulated Action Execution</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      Customer response email has been drafted. Click below to execute the simulated financial refund or warehouse shipment dispatch.
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <button
                      onClick={handleExecuteAction}
                      disabled={executingAction}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md shadow-emerald-500/25 disabled:opacity-50 transition-all"
                    >
                      {executingAction ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Executing Simulated Action...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-amber-300" />
                          <span>⚡ Execute Simulated Action</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Customer Statement */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
              Customer Statement
            </h2>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-lg border border-slate-200">
              {complaint.description}
            </p>
          </div>

          {/* Linked Order Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center space-x-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Verified Purchase Order</span>
            </h2>

            {order ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-600 pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-900">Order Number:</span>{' '}
                    <span className="font-mono text-blue-700">{order.orderNumber}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Total:</span>{' '}
                    <span className="font-bold text-slate-900">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Status:</span>{' '}
                    <span className="font-medium text-emerald-700">{order.status}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Purchased Items:</p>
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/80"
                      >
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <div className="text-slate-500 space-x-3">
                          <span>Qty: {item.quantity}</span>
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No specific order was attached to this complaint.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Multi-Agent Pipeline Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <div className="flex items-center space-x-2 mb-4">
            <Cpu className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Multi-Agent Pipeline
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Step 1: Ingestion */}
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-[10px]">
                ✓
              </div>
              <div>
                <p className="font-bold text-slate-900">Complaint Ingested</p>
                <p className="text-slate-500">Order verified & complaint stored in MongoDB.</p>
              </div>
            </div>

            {/* Step 2: Triage Agent */}
            <div
              className={`flex items-start space-x-3 ${
                triageData ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                  triageData ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {triageData ? '✓' : '2'}
              </div>
              <div>
                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>Triage Agent</span>
                  {triageData && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                      Completed
                    </span>
                  )}
                </p>
                <p className="text-slate-500">
                  {triageData
                    ? `Classified: ${triageData.category} (${triageData.urgency})`
                    : 'Classifies urgency, sentiment & entities.'}
                </p>
              </div>
            </div>

            {/* Step 3: Knowledge Retrieval */}
            <div
              className={`flex items-start space-x-3 ${
                knowledgeData ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                  knowledgeData ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {knowledgeData ? '✓' : '3'}
              </div>
              <div>
                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>Policy Retrieval (RAG)</span>
                  {knowledgeData && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                      Completed
                    </span>
                  )}
                </p>
                <p className="text-slate-500">
                  {knowledgeData
                    ? `Retrieved ${knowledgeData.citations?.length || 0} policy citations.`
                    : 'Atlas Vector Search on 768-dim embeddings.'}
                </p>
              </div>
            </div>

            {/* Step 4: Resolution Recommendation */}
            <div
              className={`flex items-start space-x-3 ${
                resolutionData ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                  resolutionData ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {resolutionData ? '✓' : '4'}
              </div>
              <div>
                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>Resolution Agent</span>
                  {resolutionData && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                      Completed
                    </span>
                  )}
                </p>
                <p className="text-slate-500">
                  {resolutionData
                    ? `Recommended: ${resolutionData.action}`
                    : 'Grounded policy action with parameter sizing.'}
                </p>
              </div>
            </div>

            {/* Step 5: Human Approval */}
            <div
              className={`flex items-start space-x-3 ${
                approval ? 'opacity-100' : 'opacity-80'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                  approval
                    ? 'bg-blue-600 text-white'
                    : complaint.status === 'PENDING_APPROVAL' || complaint.status === 'NEEDS_MANUAL_REVIEW'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {approval ? '✓' : '5'}
              </div>
              <div>
                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>Human Staff Oversight</span>
                  {approval && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                      {approval.decision}
                    </span>
                  )}
                </p>
                <p className="text-slate-500">
                  {approval
                    ? `Reviewed by ${approval.reviewedBy?.name || 'Staff'}.`
                    : 'Support agent verifies proposed AI action.'}
                </p>
              </div>
            </div>

            {/* Step 6: Customer Communication */}
            <div
              className={`flex items-start space-x-3 ${
                draftData ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                  draftData ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {draftData ? '✓' : '6'}
              </div>
              <div>
                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>Communication Agent</span>
                  {draftData && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                      Dispatched
                    </span>
                  )}
                </p>
                <p className="text-slate-500">
                  {draftData
                    ? 'Customer email drafted & simulated dispatched.'
                    : 'Drafts empathetic customer response email.'}
                </p>
              </div>
            </div>

            {/* Step 7: Simulated External Action Execution */}
            <div
              className={`flex items-start space-x-3 ${
                actionData ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                  actionData ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {actionData ? '✓' : '7'}
              </div>
              <div>
                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>Action Execution</span>
                  {actionData && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                      {actionData.status}
                    </span>
                  )}
                </p>
                <p className="text-slate-500">
                  {actionData
                    ? `${actionData.actionType} executed via simulated system.`
                    : 'Settles refund or logistics warehouse dispatch.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Human Review Modal */}
      <HumanReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
        currentResolution={resolutionData}
        submitting={submittingReview}
      />
    </div>
  );
};

export default ComplaintDetailsPage;
