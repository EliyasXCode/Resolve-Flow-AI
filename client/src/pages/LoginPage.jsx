import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Sparkles, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await login({ email, password });
    setLoading(false);

    if (res.success) {
      if (res.user.role === 'customer') {
        navigate('/dashboard');
      } else {
        navigate('/support/queue');
      }
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleFillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="w-6 h-6 text-blue-200" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Sign in to ResolveFlow AI
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            register a new customer account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Fast Credential Selectors */}
        <div className="mb-6 bg-blue-50/70 border border-blue-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-2.5">
            Quick Fill Demo Accounts:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFillCredentials('john.customer@example.com', 'CustomerPassword123!')}
              className="text-left px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <div className="font-bold text-blue-700">Customer</div>
              <div className="text-[10px] text-slate-500 truncate">John Doe</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillCredentials('support@resolveflow.ai', 'SupportPassword123!')}
              className="text-left px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <div className="font-bold text-indigo-700">Support</div>
              <div className="text-[10px] text-slate-500 truncate">Sarah C.</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillCredentials('admin@resolveflow.ai', 'AdminPassword123!')}
              className="text-left px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <div className="font-bold text-purple-700">Admin</div>
              <div className="text-[10px] text-slate-500 truncate">SysAdmin</div>
            </button>
          </div>
        </div>

        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl">
          {errorMsg && (
            <div className="mb-6 flex items-start space-x-3 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
