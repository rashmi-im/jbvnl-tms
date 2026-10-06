import React, { useState, useEffect } from 'react';
import { apiCall, fileToBase64 } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MapPin, Camera, Save, Send, ArrowLeft } from 'lucide-react';

export function FailureFormPage({ failureId = null, onCancel, onSuccess }) {
  const { masterData } = useAuth();
  const [transformerId, setTransformerId] = useState('');
  const [failedAt, setFailedAt] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [village, setVillage] = useState('');
  const [capacity, setCapacity] = useState('');
  const [ttype, setTtype] = useState('3-Phase');
  const [failureType, setFailureType] = useState('');
  const [consumers, setConsumers] = useState('');
  const [remarks, setRemarks] = useState('');
  const [beforePhotoFile, setBeforePhotoFile] = useState(null);
  const [beforePhotoPreview, setBeforePhotoPreview] = useState('');
  const [gps, setGps] = useState({ lat: null, lng: null, status: 'Not captured' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (failureId) {
      apiCall(`failures/${failureId}`).then((f) => {
        setTransformerId(f.transformer_id);
        if (f.failed_at) setFailedAt(f.failed_at.replace(' ', 'T').slice(0, 16));
        setVillage(f.village || '');
        setCapacity(f.capacity || '');
        setTtype(f.ttype || '3-Phase');
        setFailureType(f.failure_type || '');
        setConsumers(f.consumers ?? '');
        setRemarks(f.remarks || '');
        if (f.lat) setGps({ lat: f.lat, lng: f.lng, status: `Captured ${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}` });
        if (f.before_photo) setBeforePhotoPreview(`/api/photo/${f.before_photo}`);
      }).catch((err) => setError(err.message));
    } else if (masterData && masterData.transformers && masterData.transformers.length > 0) {
      const first = masterData.transformers[0];
      setTransformerId(first.id);
      setVillage(first.village || '');
      setCapacity(first.capacity || '');
    }
  }, [failureId, masterData]);

  const handleTransformerChange = (id) => {
    setTransformerId(id);
    const t = masterData?.transformers?.find((x) => x.id === +id);
    if (t) {
      if (t.village) setVillage(t.village);
      if (t.capacity) setCapacity(t.capacity);
    }
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGps({ lat: null, lng: null, status: 'Geolocation unavailable' });
      return;
    }
    setGps({ ...gps, status: 'Locating...' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGps({ lat, lng, status: `Captured: ${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      },
      () => {
        setGps({ lat: null, lng: null, status: 'Failed to capture GPS' });
      }
    );
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBeforePhotoFile(file);
      setBeforePhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (submitForApproval = false) => {
    setError('');
    setLoading(true);
    try {
      let b64Photo = null;
      if (beforePhotoFile) {
        b64Photo = await fileToBase64(beforePhotoFile);
      }

      const payload = {
        failed_at: failedAt ? failedAt.replace('T', ' ') + ':00' : null,
        village,
        capacity,
        ttype,
        failure_type: failureType,
        consumers: consumers === '' ? null : +consumers,
        remarks,
        lat: gps.lat,
        lng: gps.lng,
      };

      if (b64Photo) {
        payload.before_photo_data = b64Photo;
      }

      let fid = failureId;
      if (failureId) {
        await apiCall(`failures/${failureId}`, 'PUT', payload);
      } else {
        payload.transformer_id = +transformerId;
        const res = await apiCall('failures', 'POST', payload);
        fid = res.id;
      }

      if (submitForApproval) {
        await apiCall(`failures/${fid}/submit`, 'POST', {});
      }

      onSuccess(fid);
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const capacities = masterData?.lookups?.filter((l) => l.kind === 'capacity') || [];
  const failureTypes = masterData?.lookups?.filter((l) => l.kind === 'failure_type') || [];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button className="btn btn-sec" onClick={onCancel} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Records
      </button>

      <div className="card">
        <h2 className="card-title">
          <span>{failureId ? 'Edit Failure Report' : 'Report Transformer Failure'}</span>
        </h2>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label required">Transformer Code</label>
          <select
            className="form-select"
            value={transformerId}
            onChange={(e) => handleTransformerChange(e.target.value)}
            disabled={!!failureId}
          >
            {masterData?.transformers?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.village} ({t.capacity})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label required">Failure Date & Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={failedAt}
              onChange={(e) => setFailedAt(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label required">Village / Location</label>
            <input
              type="text"
              className="form-input"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Village 11"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label required">Capacity</label>
            <select
              className="form-select"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            >
              <option value="">Select Capacity</option>
              {capacities.map((c) => (
                <option key={c.value} value={c.value}>{c.value}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label required">Phase Type</label>
            <select
              className="form-select"
              value={ttype}
              onChange={(e) => setTtype(e.target.value)}
            >
              <option value="1-Phase">1-Phase</option>
              <option value="3-Phase">3-Phase</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label required">Failure Type</label>
            <select
              className="form-select"
              value={failureType}
              onChange={(e) => setFailureType(e.target.value)}
            >
              <option value="">Select Failure Type</option>
              {failureTypes.map((ft) => (
                <option key={ft.value} value={ft.value}>{ft.value}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label required">Consumers Affected</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={consumers}
              onChange={(e) => setConsumers(e.target.value)}
              placeholder="e.g. 150"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label required">Before-replacement Photograph</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="form-input"
            onChange={handlePhotoSelect}
          />
          {beforePhotoPreview && (
            <div style={{ marginTop: 8 }}>
              <img
                src={beforePhotoPreview}
                alt="Preview"
                style={{ maxHeight: 150, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">GPS Coordinates</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-sec btn-sm" type="button" onClick={captureGps}>
              <MapPin size={16} /> Capture GPS
            </button>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{gps.status}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea
            className="form-textarea"
            rows="3"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional additional notes..."
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            className="btn btn-sec"
            style={{ flex: 1 }}
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            <Save size={16} /> Save Draft
          </button>
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => handleSubmit(true)}
            disabled={loading}
          >
            <Send size={16} /> Submit for AE Approval
          </button>
        </div>
      </div>
    </div>
  );
}
