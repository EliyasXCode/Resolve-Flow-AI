import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { RoleBadge } from './Badge.jsx';
import { ShieldCheck, LogOut, FileText, Layers, User, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isCustomer, isSupport, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-blue-200" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Resolve<span className="text-blue-400">Flow</span> AI
              </span>
            </Link>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Phase 1: MERN Core
            </span>
          </div>

          {/* Center / Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && (
              <>
                {isCustomer && (
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>My Complaints</span>
                  </Link>
                )}

                {isSupport && (
                  <Link
                    to="/support/queue"
                    className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
                  >
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Support Queue</span>
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Admin Panel</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Action / Auth Status */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-medium text-slate-200 leading-tight">
                    {user.name}
                  </span>
                  <div className="mt-0.5">
                    <RoleBadge role={user.role} />
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 rounded-md shadow transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
