import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return <span>—</span>;

  const classMap = {
    'Replaced': { cls: 'badge-Replaced', icon: '🟢' },
    'Under Process': { cls: 'badge-UnderProcess', icon: '🟡' },
    'Pending >24 Hours': { cls: 'badge-P24', icon: '🔴' },
    'Pending >48 Hours': { cls: 'badge-P48', icon: '🔴' },
    'Material Shortage': { cls: 'badge-MS', icon: '⚫' },
    'Repairable / Under Repair': { cls: 'badge-UR', icon: '🔵' },
    'Pending': { cls: 'badge-Pend', icon: '🟡' },
  };

  const info = classMap[status] || { cls: 'badge-Pend', icon: '🟡' };
  return (
    <span className={`status-badge ${info.cls}`}>
      <span style={{ marginRight: 4, fontSize: '0.7rem' }}>{info.icon}</span>
      {status}
    </span>
  );
}

export function WorkflowBadge({ status, replStatus }) {
  const map = {
    draft: { label: 'Draft', cls: 'badge-wf-draft' },
    pending_ae: { label: 'Pending AE Approval', cls: 'badge-wf-pending_ae' },
    returned: { label: 'Returned to JE', cls: 'badge-wf-returned' },
    approved: { label: 'AE Approved', cls: 'badge-wf-approved' },
  };

  const info = map[status] || { label: status, cls: 'badge-wf-draft' };
  return (
    <span className={`status-badge ${info.cls}`}>
      {info.label}
      {replStatus === 'pending_ae' ? ' (+Replacement Pending)' : ''}
    </span>
  );
}
