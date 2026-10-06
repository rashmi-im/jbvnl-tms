import React, { useEffect, useState } from 'react';
import { apiCall } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { AlertTriangle, Clock, CheckCircle, Package, ArrowRight, ShieldAlert, PlusCircle, Users, UserCheck, ShieldCheck } from 'lucide-react';

export function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [officerRoleFilter, setOfficerRoleFilter] = useState('ALL');

  const loadDashboard = async () => {
    try {
      const data = await apiCall('dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading || !dashboardData) {
    return <div className="card" style={{ textAlign: 'center', padding: 40 }}>Loading dashboard...</div>;
  }

  const { kpis, workflow_counts, subdivisions, date, officers = [] } = dashboardData;
  const isJE = user.role === 'JE';
  const isAE = user.role === 'AE';

  const filteredOfficers = officers.filter((o) => {
    if (officerRoleFilter === 'AE') return o.role === 'AE';
    if (officerRoleFilter === 'JE') return o.role === 'JE';
    return true;
  });

  const aesCount = officers.filter((o) => o.role === 'AE').length;
  const jesCount = officers.filter((o) => o.role === 'JE').length;

  return (
    <div>
      {/* JE Action Banner */}
      {isJE && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Junior Engineer Workspace</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
              Report transformer failures, submit replacement verifications, and log material delays.
            </p>
          </div>
          <button className="btn" onClick={() => onNavigate('new-failure')}>
            <PlusCircle size={18} /> Report New Failure
          </button>
        </div>
      )}

      {/* AE Action Banner */}
      {isAE && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Assistant Engineer Approval Desk</h3>
            <p style={{ fontSize: '0.85rem', color: '#93c5fd', marginTop: 4 }}>
              Pending Approvals: {kpis.pending_ae} Failure Reports & {kpis.repl_verification} Replacements.
            </p>
          </div>
          <button className="btn btn-sec" onClick={() => onNavigate('inbox')}>
            <ShieldAlert size={18} /> Open Approval Inbox ({kpis.pending_ae + kpis.repl_verification})
          </button>
        </div>
      )}

      {/* Requirement 3: TOTAL BURNT TRANSFORMERS TODAY Subdivision List */}
      <div className="card">
        <div className="card-title">
          <span>⚡ TOTAL BURNT TRANSFORMERS TODAY ({date})</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Click any subdivision to see complete transformer list</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {subdivisions.map((s) => (
            <div
              key={s.id}
              className="kpi-card"
              style={{ cursor: 'pointer', padding: 16 }}
              onClick={() => onNavigate('records', { sub: s.id })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: s.burnt_today > 0 ? '#dc2626' : '#16a34a' }}>
                  {s.burnt_today}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Open: <strong>{s.open}</strong></span>
                <span>Pending AE: <strong>{s.pending_ae}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Consolidated Summary Metrics</h3>
      <div className="grid-cols-4">
        <div className="kpi-card" onClick={() => onNavigate('records', { filter: 'all' })}>
          <div className="kpi-value">{kpis.reported}</div>
          <div className="kpi-label">Reported Today</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('records', { ts: 'Under Process' })}>
          <div className="kpi-value" style={{ color: '#2563eb' }}>{kpis.under_process}</div>
          <div className="kpi-label">Under Process / Replacement</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('records', { ts: 'Replaced' })}>
          <div className="kpi-value" style={{ color: '#16a34a' }}>🟢 {kpis.replaced}</div>
          <div className="kpi-label">Replaced</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('records', { ts: 'Pending' })}>
          <div className="kpi-value" style={{ color: '#d97706' }}>🟡 {kpis.pending}</div>
          <div className="kpi-label">Pending</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('records', { ts: 'Pending >24 Hours' })}>
          <div className="kpi-value" style={{ color: '#dc2626' }}>🔴 {kpis.p24}</div>
          <div className="kpi-label">&gt;24 Hours Pending</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('records', { ts: 'Pending >48 Hours' })}>
          <div className="kpi-value" style={{ color: '#7f1d1d' }}>🔴 {kpis.p48}</div>
          <div className="kpi-label">&gt;48 Hours Pending</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('records', { ts: 'Material Shortage' })}>
          <div className="kpi-value" style={{ color: '#334155' }}>⚫ {kpis.shortage}</div>
          <div className="kpi-label">Material Shortage</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('records', { wf: 'pending_ae' })}>
          <div className="kpi-value" style={{ color: '#7c3aed' }}>{kpis.pending_ae}</div>
          <div className="kpi-label">Pending AE Approval</div>
        </div>
      </div>

      {/* NEW DEDICATED SECTION: JE & AE OFFICERS DIRECTORY & WORKLOAD SUMMARY */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={22} color="#2563eb" />
            <span>👷 JE & AE Officer Roster & Workload Directory</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn btn-sm ${officerRoleFilter === 'ALL' ? '' : 'btn-sec'}`}
              onClick={() => setOfficerRoleFilter('ALL')}
            >
              All ({officers.length})
            </button>
            <button
              className={`btn btn-sm ${officerRoleFilter === 'AE' ? '' : 'btn-sec'}`}
              onClick={() => setOfficerRoleFilter('AE')}
            >
              <ShieldCheck size={14} /> AE Officers ({aesCount})
            </button>
            <button
              className={`btn btn-sm ${officerRoleFilter === 'JE' ? '' : 'btn-sec'}`}
              onClick={() => setOfficerRoleFilter('JE')}
            >
              <UserCheck size={14} /> JE Officers ({jesCount})
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Officer Name</th>
                <th>Employee ID</th>
                <th>Role</th>
                <th>Subdivision / Section</th>
                <th>Reporting Hierarchy</th>
                <th>Pending Approvals</th>
                <th>Total Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficers.map((o) => (
                <tr key={o.id} className="clickable" onClick={() => onNavigate('records', { q: o.name })}>
                  <td>
                    <strong>{o.name}</strong>
                  </td>
                  <td>
                    <code>{o.emp_id}</code>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: o.role === 'AE' ? '#dbeafe' : '#fef3c7',
                        color: o.role === 'AE' ? '#1e40af' : '#92400e',
                      }}
                    >
                      {o.role}
                    </span>
                  </td>
                  <td>
                    {o.subdivision_name || '—'}
                    {o.section_name ? ` (${o.section_name})` : ''}
                  </td>
                  <td>
                    {o.role === 'JE' ? (
                      <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                        Reports to: <strong>{o.reporting_ae_name || 'Unassigned'}</strong>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
                        {o.assigned_jes || 0} JEs Reporting
                      </span>
                    )}
                  </td>
                  <td>
                    {o.role === 'JE' ? (
                      <span style={{ color: o.pending_ae > 0 ? '#d97706' : '#16a34a', fontWeight: 700 }}>
                        {o.pending_ae || 0} Pending
                      </span>
                    ) : (
                      <span style={{ color: o.pending_review > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                        {o.pending_review || 0} Review Pending
                      </span>
                    )}
                  </td>
                  <td>
                    {o.role === 'JE' ? (
                      <span style={{ fontSize: '0.85rem' }}>
                        Reported: <strong>{o.total_reported || 0}</strong> · Replaced: <strong>{o.replaced || 0}</strong>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem' }}>
                        Approved: <strong>{o.approved_total || 0}</strong>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subdivision performance breakdown table */}
      <div className="card">
        <div className="card-title">
          <span>Subdivision Detailed Table ({date})</span>
          <button className="btn btn-sec btn-sm" onClick={() => onNavigate('daily')}>
            View Automatic 9:00 AM Daily Report <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Subdivision</th>
                <th>Burnt Today</th>
                <th>Pending AE</th>
                <th>Open Pending</th>
              </tr>
            </thead>
            <tbody>
              {subdivisions.map((s) => (
                <tr
                  key={s.id}
                  className="clickable"
                  onClick={() => onNavigate('records', { sub: s.id })}
                >
                  <td><strong>{s.name}</strong></td>
                  <td>{s.burnt_today}</td>
                  <td>{s.pending_ae}</td>
                  <td>{s.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
