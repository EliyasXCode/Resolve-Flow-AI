import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Lock,
  Database,
  ArrowRight,
  Layers,
  FileCheck,
} from 'lucide-react';

export const LandingPage = () => {
  const { isAuthenticated, isCustomer, isSupport } = useAuth();

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-20 pb-24 border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Phase 1 Live: Production MERN Foundation & Multi-Tenant Security</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Intelligent Complaint Resolution,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
              Orchestrated by AI
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-300 mb-10 leading-relaxed">
            ResolveFlow AI bridges customer claims with backend policy retrieval, automated resolution recommendations,
            and human-in-the-loop validation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to={isCustomer ? '/dashboard' : '/support/queue'}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg shadow-blue-600/25 transition-all"
              >
                <span>Go to Your Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg shadow-blue-600/25 transition-all"
                >
                  <span>Create Customer Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-6 py-3 rounded-lg transition-all"
                >
                  <span>Sign In (Demo Accounts)</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Multi-Agent Orchestration Pipeline Diagram */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            The Orchestrated Multi-Agent Workflow
          </h2>
          <p className="mt-2 text-slate-600">
            A backend-controlled state machine designed for auditability, strict bounds, and human review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Complaint Submission</h3>
            <p className="text-xs text-slate-500 mt-1">
              Customer submits grievance validated against verified order ownership.
            </p>
            <span className="mt-3 inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active in Phase 1
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Triage & Entity Agent</h3>
            <p className="text-xs text-slate-500 mt-1">
              Classifies urgency, sentiment, categories and extracts structured entities.
            </p>
            <span className="mt-3 inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Phase 2 (Gemini)
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Knowledge RAG Agent</h3>
            <p className="text-xs text-slate-500 mt-1">
              Atlas Vector Search retrieves grounded store refund & replacement policy chunks.
            </p>
            <span className="mt-3 inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Phase 3 (Vector RAG)
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm mb-3">
              4
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Human Review & Action</h3>
            <p className="text-xs text-slate-500 mt-1">
              Support agent reviews recommendation; atomic execution with idempotency keys.
            </p>
            <span className="mt-3 inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Phase 4 & 5
            </span>
          </div>
        </div>
      </section>

      {/* Security & Core Architecture Highlights */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Built with Senior Engineering Standards
            </h2>
            <p className="mt-2 text-slate-600">
              Every endpoint, query, and session is guarded with defense-in-depth principles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Strict Role Escalation Defense</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Public registration is cryptographically bounded to the <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">customer</code> role. Support & Admin accounts can only be provisioned via secure internal tooling.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Order Ownership Verification</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Before a customer can attach an order to a grievance, the backend verifies database ownership against the authenticated JWT session.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Tenant & Data Isolation</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Customers can never view or guess another customer's complaints by altering URL parameters or identifiers; enforced by database-level ownership filters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials Box */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Quick Test Drive Credentials</h3>
          </div>
          <p className="text-sm text-slate-300 mb-6">
            The database is seeded with initial role accounts ready for manual testing:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
              <div className="text-blue-400 font-bold uppercase mb-1">Customer</div>
              <div className="text-slate-300">john.customer@example.com</div>
              <div className="text-slate-400 mt-1">CustomerPassword123!</div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
              <div className="text-indigo-400 font-bold uppercase mb-1">Support Staff</div>
              <div className="text-slate-300">support@resolveflow.ai</div>
              <div className="text-slate-400 mt-1">SupportPassword123!</div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
              <div className="text-purple-400 font-bold uppercase mb-1">Administrator</div>
              <div className="text-slate-300">admin@resolveflow.ai</div>
              <div className="text-slate-400 mt-1">AdminPassword123!</div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Click here to sign in with prefilled credentials</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
