import React from 'react';
import { getStatusMeta } from '../utils/formatters.js';

export const StatusBadge = ({ status }) => {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}
    >
      {meta.label}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const roleStyles = {
    customer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    support: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide border ${
        roleStyles[role] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {role}
    </span>
  );
};
