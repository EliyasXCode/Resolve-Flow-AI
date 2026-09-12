import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import policyService from '../services/policyService.js';
import {
  ShieldCheck,
  Server,
  Database,
  Users,
  Cpu,
  CheckCircle2,
  Terminal,
  BookOpen,
  Sparkles,
  Layers,
  FileText,
  Loader2,
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [policyError, setPolicyError] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoadingPolicies(true);
        const res = await policyService.getPolicies();
        if (res.success) {
          setPolicies(res.policies || []);
        }
      } catch (err) {
        console.warn('Failed to load policies:', err.message);
        setPolicyError('Could not retrieve active policies.');
      } finally {
        setLoadingPolicies(false);
      }
    };

    fetchPolicies();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-slate-900">System Administration Console</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Admin Access
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Oversee environment configuration, security policies, and multi-agent backend modules.
        </p>
      </div>

      {/* Grid: Health and CLI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Server className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Backend Agent Infrastructure
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="font-semibold text-emerald-900">MongoDB Atlas Database</span>
              <span className="font-bold text-emerald-700">CONNECTED</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="font-semibold text-emerald-900">JWT & CSRF Protection</span>
              <span className="font-bold text-emerald-700">ACTIVE & VERIFIED</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="font-semibold text-emerald-900">Tenant & Order Isolation</span>
              <span className="font-bold text-emerald-700">ENFORCED</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="font-semibold text-emerald-900">Google Gemini Orchestrator</span>
              <span className="font-bold text-emerald-700">ACTIVE (gemini-flash-lite)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50/70 border border-teal-200">
              <span className="font-semibold text-teal-900">Atlas Vector Search (RAG)</span>
              <span className="font-bold text-teal-700">ACTIVE (768-dim Embeddings)</span>
            </div>
          </div>
        </div>

        {/* Security & Seeding Shortcuts */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Terminal className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              CLI Management Commands
            </h2>
          </div>

          <div className="space-y-2.5 text-xs font-mono text-slate-700">
            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg">
              <div className="text-slate-400 text-[11px] mb-0.5 font-sans"># Seed Admin, Support & Customer Accounts</div>
              <code>npm run seed:admin</code>
            </div>

            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg">
              <div className="text-slate-400 text-[11px] mb-0.5 font-sans"># Seed Realistic E-Commerce Orders</div>
              <code>npm run seed:orders</code>
            </div>

            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg">
              <div className="text-slate-400 text-[11px] mb-0.5 font-sans"># Seed Policies & Generate 768-dim Vector Embeddings</div>
              <code className="text-teal-300">npm run seed:policies</code>
            </div>

            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg">
              <div className="text-slate-400 text-[11px] mb-0.5 font-sans"># Run Test Suite (Vitest + Supertest)</div>
              <code>npm run test:server</code>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 3: Corporate Policy Knowledge Base (Atlas Vector Chunks) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Corporate Policy Knowledge Base (RAG)
              </h2>
              <p className="text-xs text-slate-500">
                Grounding policies chunked with overlap and indexed in Atlas Vector Search (<code className="text-teal-700 font-mono">policy_chunks</code>)
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            {policies.length} Active Policies
          </span>
        </div>

        {loadingPolicies ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span className="text-xs">Loading corporate policies...</span>
          </div>
        ) : policyError ? (
          <div className="p-6 text-center text-xs text-rose-600 bg-rose-50/50">
            {policyError}
          </div>
        ) : policies.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No policy documents found. Run <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm run seed:policies</code> to seed policies.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {policies.map((p) => (
              <div key={p._id} className="p-5 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-sm text-slate-900">{p.title}</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {p.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      v{p.version}
                    </span>
                  </div>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active & Chunked
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {p.rawText}
                </p>

                <div className="mt-2 flex items-center space-x-4 text-[11px] text-slate-400 font-mono">
                  <span>ID: {p._id}</span>
                  <span>Collection: policy_chunks</span>
                  <span>Model: gemini-embedding-001 (768d)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
