import React, { useEffect, useState } from 'react';
import { apiCall } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, WorkflowBadge } from '../components/StatusBadge';
import { Search, Filter, Eye } from 'lucide-react';

export function FailuresPage({ initialParams = {}, onSelectRecord }) {
  const { user } = useAuth();
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialParams.q || '');
  const [wfFilter, setWfFilter] = useState(initialParams.wf || '');
  const [tsFilter, setTsFilter] = useState(initialParams.ts || '');
  const [isInbox, setIsInbox] = useState(!!initialParams.inbox);

  const loadFailures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (wfFilter) params.append('wf', wfFilter);
      if (tsFilter) params.append('ts', tsFilter);
      if (initialParams.sub) params.append('sub', initialParams.sub);

      let data = await apiCall(`failures?${params.toString()}`);
      if (isInbox) {
        data = data.filter((r) => r.wf_status === 'pending_ae' || r.repl_status === 'pending_ae');
      }
      setFailures(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFailures();
  }, [searchQuery, wfFilter, tsFilter, isInbox]);

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>{isInbox ? 'Approval Inbox' : 'Transformer Failure Records'}</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{failures.length} Records found</span>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by DTR code, record ID, village, feeder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
            <Search
              size={18}
              style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}
            />
          </div>

          <select
            className="form-select"
            value={wfFilter}
            onChange={(e) => {
              setIsInbox(false);
              setWfFilter(e.target.value);
            }}
            style={{ width: 'auto', minWidth: 160 }}
          >
            <option value="">All Workflows</option>
            <option value="draft">Draft</option>
            <option value="pending_ae">Pending AE Approval</option>
            <option value="returned">Returned to JE</option>
            <option value="approved">AE Approved</option>
          </select>

          <select
            className="form-select"
            value={tsFilter}
            onChange={(e) => {
              setIsInbox(false);
              setTsFilter(e.target.value);
            }}
            style={{ width: 'auto', minWidth: 180 }}
          >
            <option value="">All Statuses</option>
            <option value="Under Process">Under Process</option>
            <option value="Pending">Pending</option>
            <option value="Pending >24 Hours">Pending &gt;24 Hours</option>
            <option value="Pending >48 Hours">Pending &gt;48 Hours</option>
            <option value="Material Shortage">Material Shortage</option>
            <option value="Replaced">Replaced</option>
          </select>
        </div>

        {/* Quick Filter Buttons */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            className={`btn btn-sm ${!isInbox && !wfFilter && !tsFilter ? '' : 'btn-sec'}`}
            onClick={() => {
              setIsInbox(false);
              setWfFilter('');
              setTsFilter('');
            }}
          >
            All
          </button>
          <button
            className={`btn btn-sm ${isInbox ? '' : 'btn-sec'}`}
            onClick={() => {
              setIsInbox(true);
              setWfFilter('');
              setTsFilter('');
            }}
          >
            Approval Inbox
          </button>
          <button
            className={`btn btn-sm ${wfFilter === 'draft' ? '' : 'btn-sec'}`}
            onClick={() => {
              setIsInbox(false);
              setWfFilter('draft');
            }}
          >
            Drafts
          </button>
          <button
            className={`btn btn-sm ${wfFilter === 'pending_ae' ? '' : 'btn-sec'}`}
            onClick={() => {
              setIsInbox(false);
              setWfFilter('pending_ae');
            }}
          >
            Pending AE
          </button>
          <button
            className={`btn btn-sm ${tsFilter === 'Replaced' ? '' : 'btn-sec'}`}
            onClick={() => {
              setIsInbox(false);
              setWfFilter('');
              setTsFilter('Replaced');
            }}
          >
            Replaced
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>Loading records...</div>
        ) : failures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            No failure records found matching filter criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Transformer Code</th>
                  <th>Subdivision</th>
                  <th>Village</th>
                  <th>Failed Date</th>
                  <th>Type</th>
                  <th>JE</th>
                  <th>Workflow</th>
                  <th>Transformer Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((r) => (
                  <tr
                    key={r.id}
                    className="clickable"
                    onClick={() => onSelectRecord(r.id)}
                  >
                    <td><strong>{r.rec_id}</strong></td>
                    <td>{r.tcode}</td>
                    <td>{r.subdivision}</td>
                    <td>{r.village}</td>
                    <td>{r.failed_at ? r.failed_at.slice(0, 16) : ''}</td>
                    <td>{r.failure_type}</td>
                    <td>{r.je}</td>
                    <td>
                      <WorkflowBadge status={r.wf_status} replStatus={r.repl_status} />
                    </td>
                    <td>
                      <StatusBadge status={r.transformer_status} />
                    </td>
                    <td>
                      <button className="btn btn-sec btn-sm" onClick={(e) => { e.stopPropagation(); onSelectRecord(r.id); }}>
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
