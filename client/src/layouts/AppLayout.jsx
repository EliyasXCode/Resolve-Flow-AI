import React from 'react';
import Navbar from '../components/Navbar.jsx';

export const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-grow">{children}</main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        ResolveFlow AI — Enterprise Multi-Agent Resolution System • Phase 1
      </footer>
    </div>
  );
};

export default AppLayout;
