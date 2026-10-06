import React, { useEffect, useState } from 'react';
import { apiCall, fileToBase64 } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, WorkflowBadge } from '../components/StatusBadge';
import { PhotoModal } from '../components/PhotoModal';
import { ArrowLeft, CheckCircle2, XCircle, Send } from 'lucide-react';


export function FailureDetailPage({ failureId, onBack, onEdit }) {
  const { user, masterData } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Review state
  const [reviewReason, setReviewReason] = useState('');
  const [replReviewReason, setReplReviewReason] = useState('');

  // Replacement form state
  const [replAt, setReplAt] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [newDtr, setNewDtr] = useState('');
  const [newCap, setNewCap] = useState('');
  const [oldStatus, setOldStatus] = useState('Burnt');
  const [afterPhotoFile, setAfterPhotoFile] = useState(null);

  // Delay form state
  const [delayReason, setDelayReason] = useState('');
  const [materialShortage, setMaterialShortage] = useState(false);
  const [underRepair, setUnderRepair] = useState(false);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const data = await apiCall(`failures/${failureId}`);
      setRecord(data);
      if (data.delay_reason) setDelayReason(data.delay_reason);
      setMaterialShortage(!!data.material_shortage);
      setUnderRepair(!!data.under_repair);
      if (data.new_dtr) setNewDtr(data.new_dtr);
      if (data.new_cap) setNewCap(data.new_cap);
      if (data.old_status) setOldStatus(data.old_status);
      if (data.repl_at) setReplAt(data.repl_at.replace(' ', 'T').slice(0, 16));
    } catch (err) {
      setError(err.message || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [failureId]);

  if (loading || !record) {
    return <div className="card" style={{ textAlign: 'center', padding: 40 }}>Loading details...</div>;
  }

  const isJE = user.role === 'JE';
  const isAE = user.role === 'AE' || user.role === 'ADMIN';
  const org = record.org || {};

  const handleAEAction = async (action, isRepl = false) => {
    setError('');
    setSuccessMsg('');
    try {
      const endpoint = isRepl ? `failures/${failureId}/replacement/review` : `failures/${failureId}/review`;
      const reason = isRepl ? replReviewReason : reviewReason;
      await apiCall(endpoint, 'POST', { action, reason });
      setSuccessMsg(`Action ${action} completed successfully.`);
      loadRecord();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveDelay = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await apiCall(`failures/${failureId}/delay`, 'POST', {
        delay_reason: delayReason,
        material_shortage: materialShortage,
        under_repair: underRepair,
      });
      setSuccessMsg('Delay / shortage details updated.');
      loadRecord();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveReplacement = async (submit = false) => {
    setError('');
    setSuccessMsg('');
    try {
      let b64After = null;
      if (afterPhotoFile) {
        b64After = await fileToBase64(afterPhotoFile);
      }
      const payload = {
        submit,
        repl_at: replAt ? replAt.replace('T', ' ') + ':00' : null,
        new_dtr: newDtr,
        new_cap: newCap,
        old_status: oldStatus,
      };
      if (b64After) payload.after_photo_data = b64After;

      await apiCall(`failures/${failureId}/replacement`, 'POST', payload);
      setSuccessMsg(submit ? 'Replacement submitted for AE verification.' : 'Replacement draft saved.');
      loadRecord();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJESubmitFailure = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await apiCall(`failures/${failureId}/submit`, 'POST', {});
      setSuccessMsg('Failure report submitted for AE approval.');
      loadRecord();
    } catch (err) {
      setError(err.message);
    }
  };

  const capacities = masterData?.lookups?.filter((l) => l.kind === 'capacity') || [];

  return (
    <div>
      <button className="btn btn-sec" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Records
      </button>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Primary Card */}
      <div className="card">
        <div className="card-title">
          <div>
            <span style={{ fontSize: '1.3rem', marginRight: 12 }}>{record.rec_id} · {record.tcode}</span>
            <StatusBadge status={record.transformer_status} />
          </div>
          <div>
            <WorkflowBadge status={record.wf_status} replStatus={record.repl_status} />
          </div>
        </div>

        {record.return_reason && (
          <div className="alert alert-error">
            <strong>Returned by AE:</strong> {record.return_reason}
          </div>
        )}

        {/* Info Grid */}
        <div className="grid-cols-4" style={{ marginTop: 16 }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>LOCATION</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>
              {org.circle} / {org.division} / {record.subdivision} / {record.section}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
              Feeder: {record.feeder} · PSS: {record.pss}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Village: {record.village}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TRANSFORMER</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{record.capacity} · {record.ttype}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>Type: {record.failure_type}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Consumers: {record.consumers ?? 'N/A'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>FAILURE DETAILS</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{record.failed_at}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
              JE: {record.je} · AE: {record.ae}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {record.lat ? `GPS: ${record.lat.toFixed(5)}, ${record.lng.toFixed(5)}` : 'GPS unavailable'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>REPLACEMENT STATUS</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{record.repl_at || 'Not Replaced'}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
              New DTR: {record.new_dtr || '—'} ({record.new_cap || ''})
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Old DTR Status: {record.old_status || '—'}
            </div>
          </div>
        </div>

        {/* Photographs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem' }}>Before-replacement Photo</div>
            {record.before_photo ? (
              <img
                src={`/api/photo/${record.before_photo}`}
                alt="Before"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setSelectedPhoto(record.before_photo)}
              />
            ) : (
              <div style={{ padding: 30, background: '#f1f5f9', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
                No photo uploaded
              </div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem' }}>After-replacement Photo</div>
            {record.after_photo ? (
              <img
                src={`/api/photo/${record.after_photo}`}
                alt="After"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setSelectedPhoto(record.after_photo)}
              />
            ) : (
              <div style={{ padding: 30, background: '#f1f5f9', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
                No replacement photo uploaded
              </div>
            )}
          </div>
        </div>

        {/* Action Sections */}
        {/* 1. JE Draft Edit & Submit */}
        {isJE && ['draft', 'returned'].includes(record.wf_status) && (
          <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: 12 }}>JE Workflow Actions</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-sec" onClick={() => onEdit(record.id)}>
                Edit Report Details
              </button>
              <button className="btn" onClick={handleJESubmitFailure}>
                <Send size={16} /> Submit Failure Report to AE
              </button>
            </div>
          </div>
        )}

        {/* 2. AE Review Failure */}
        {isAE && record.wf_status === 'pending_ae' && (
          <div style={{ marginTop: 24, padding: 16, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
            <h4 style={{ marginBottom: 12, color: '#1e3a8a' }}>AE Review & Verification</h4>
            <div className="form-group">
              <label className="form-label">Return Reason (Required if returning)</label>
              <textarea
                className="form-textarea"
                rows="2"
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Specify reason if returning to JE..."
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" onClick={() => handleAEAction('approve', false)}>
                <CheckCircle2 size={16} /> Approve Failure Report
              </button>
              <button className="btn btn-danger" onClick={() => handleAEAction('return', false)}>
                <XCircle size={16} /> Return to JE for Correction
              </button>
            </div>
          </div>
        )}

        {/* 3. AE Review Replacement */}
        {isAE && record.repl_status === 'pending_ae' && (
          <div style={{ marginTop: 24, padding: 16, background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
            <h4 style={{ marginBottom: 12, color: '#92400e' }}>AE Replacement Verification</h4>
            <div className="form-group">
              <label className="form-label">Return Reason (Required if returning)</label>
              <textarea
                className="form-textarea"
                rows="2"
                value={replReviewReason}
                onChange={(e) => setReplReviewReason(e.target.value)}
                placeholder="Specify reason if returning replacement details..."
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" onClick={() => handleAEAction('approve', true)}>
                <CheckCircle2 size={16} /> Approve Replacement
              </button>
              <button className="btn btn-danger" onClick={() => handleAEAction('return', true)}>
                <XCircle size={16} /> Return Replacement to JE
              </button>
            </div>
          </div>
        )}

        {/* 4. JE Replacement Details Form */}
        {isJE && record.wf_status === 'approved' && ['none', 'draft', 'returned'].includes(record.repl_status) && (
          <div style={{ marginTop: 24, padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <h4 style={{ marginBottom: 12, color: '#166534' }}>Replacement Details Entry</h4>

            {record.repl_return_reason && (
              <div className="alert alert-error">
                <strong>Replacement Returned:</strong> {record.repl_return_reason}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Replacement Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={replAt}
                  onChange={(e) => setReplAt(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">New DTR Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={newDtr}
                  onChange={(e) => setNewDtr(e.target.value)}
                  placeholder="e.g. DTR-NEW-9921"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">New Capacity</label>
                <select
                  className="form-select"
                  value={newCap}
                  onChange={(e) => setNewCap(e.target.value)}
                >
                  <option value="">Select Capacity</option>
                  {capacities.map((c) => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Old DTR Status</label>
                <select
                  className="form-select"
                  value={oldStatus}
                  onChange={(e) => setOldStatus(e.target.value)}
                >
                  <option value="Burnt">Burnt</option>
                  <option value="Repairable">Repairable</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">After-replacement Photograph</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="form-input"
                onChange={(e) => setAfterPhotoFile(e.target.files[0])}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="btn btn-sec" onClick={() => handleSaveReplacement(false)}>
                Save Draft
              </button>
              <button className="btn" onClick={() => handleSaveReplacement(true)}>
                <Send size={16} /> Submit Replacement for Verification
              </button>
            </div>
          </div>
        )}

        {/* 5. JE Delay / Shortage Update */}
        {isJE && record.wf_status === 'approved' && record.repl_status !== 'approved' && (
          <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: 12 }}>Log Delay / Material Shortage</h4>
            <div className="form-group">
              <label className="form-label">Delay Reason</label>
              <input
                type="text"
                className="form-input"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="Reason for replacement delay..."
              />
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={materialShortage}
                  onChange={(e) => setMaterialShortage(e.target.checked)}
                />
                Material Shortage
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={underRepair}
                  onChange={(e) => setUnderRepair(e.target.checked)}
                />
                Under Repair
              </label>
            </div>
            <button className="btn btn-sec btn-sm" onClick={handleSaveDelay}>
              Update Delay Status
            </button>
          </div>
        )}
      </div>

      {/* Audit Timeline */}
      <div className="card">
        <h4 className="card-title">Audit Log Timeline</h4>
        <div className="timeline">
          {record.audit && record.audit.map((item, idx) => (
            <div key={idx} className="timeline-item">
              <div className="timeline-date">{item.at}</div>
              <div className="timeline-content">
                <strong>{item.user_name} ({item.role})</strong> — {item.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal photoName={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  );
}
