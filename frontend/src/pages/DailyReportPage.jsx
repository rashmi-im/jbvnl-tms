import React, { useEffect, useState } from 'react';
import { apiCall } from '../services/api';
import { Download, Calendar } from 'lucide-react';

export function DailyReportPage() {
  const [report, setReport] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall(`report/daily?date=${date}`);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [date]);

  const handleDownloadCsv = () => {
    window.open(`/api/report/daily?date=${date}&format=csv`, '_blank');
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Transformer Failure – Subdivision-wise Daily Status</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px' }}
          />
          <button className="btn btn-sm" onClick={handleDownloadCsv}>
            <Download size={14} /> Download CSV
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading report...</div>
      ) : !report ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No report data available</div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Subdivision</th>
                <th>Opening Pending</th>
                <th>Today's Burnt</th>
                <th>Replaced Today</th>
                <th>Closing Pending</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.subdivision_id || r.subdivision}>
                  <td><strong>{r.subdivision}</strong></td>
                  <td>{r.opening}</td>
                  <td>{r.burnt}</td>
                  <td>{r.replaced}</td>
                  <td>{r.closing}</td>
                </tr>
              ))}
              {report.total && (
                <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                  <td>{report.total.subdivision}</td>
                  <td>{report.total.opening}</td>
                  <td>{report.total.burnt}</td>
                  <td>{report.total.replaced}</td>
                  <td>{report.total.closing}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
