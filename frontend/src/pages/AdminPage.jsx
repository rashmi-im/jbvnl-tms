import React, { useState } from 'react';
import { apiCall } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Plus, UserPlus, Layers, Zap } from 'lucide-react';

export function AdminPage() {
  const { masterData, fetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState('subdivision');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Subdivision Form State
  const [subName, setSubName] = useState('');
  const [divId, setDivId] = useState(masterData?.divisions?.[0]?.id || 1);

  // Section Form State
  const [secName, setSecName] = useState('');
  const [secSubId, setSecSubId] = useState(masterData?.subdivisions?.[0]?.id || 1);

  // User Form State
  const [userName, setUserName] = useState('');
  const [userEmpId, setUserEmpId] = useState('');
  const [userPw, setUserPw] = useState('ChangeMe@123');
  const [userRole, setUserRole] = useState('JE');
  const [userSubId, setUserSubId] = useState(masterData?.subdivisions?.[0]?.id || 1);
  const [userSecId, setUserSecId] = useState(masterData?.sections?.[0]?.id || 1);
  const [userAeId, setUserAeId] = useState(masterData?.aes?.[0]?.id || '');

  // Transformer Form State
  const [tCode, setTCode] = useState('');
  const [tDtrNo, setTDtrNo] = useState('');
  const [tCap, setTCap] = useState('63 KVA');
  const [tType, setTType] = useState('3-Phase');
  const [tSecId, setTSecId] = useState(masterData?.sections?.[0]?.id || 1);
  const [tVillage, setTVillage] = useState('');

  const handleCreateSubdivision = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await apiCall('admin/subdivisions', 'POST', { name: subName, division_id: +divId });
      setSuccess(`Subdivision "${subName}" created successfully!`);
      setSubName('');
      fetchUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await apiCall('admin/sections', 'POST', { name: secName, subdivision_id: +secSubId });
      setSuccess(`Section "${secName}" created successfully!`);
      setSecName('');
      fetchUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const selectedSub = masterData?.subdivisions?.find(s => s.id === +userSubId);
      const payload = {
        name: userName,
        emp_id: userEmpId,
        password: userPw,
        role: userRole,
        division_id: selectedSub?.division_id || 1,
        subdivision_id: +userSubId,
        section_id: userRole === 'JE' ? +userSecId : null,
        ae_id: userRole === 'JE' && userAeId ? +userAeId : null,
      };

      await apiCall('admin/users', 'POST', payload);
      setSuccess(`User "${userName}" (${userRole}) created successfully!`);
      setUserName('');
      setUserEmpId('');
      fetchUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransformer = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await apiCall('admin/transformers', 'POST', {
        code: tCode,
        dtr_no: tDtrNo,
        capacity: tCap,
        ttype: tType,
        section_id: +tSecId,
        village: tVillage,
        active: 1
      });
      setSuccess(`Transformer ${tCode} added successfully!`);
      setTCode('');
      setTDtrNo('');
      setTVillage('');
      fetchUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={22} />
            <span>Admin Management Console</span>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
          <button
            className={`btn btn-sm ${activeTab === 'subdivision' ? '' : 'btn-sec'}`}
            onClick={() => { setActiveTab('subdivision'); setError(''); setSuccess(''); }}
          >
            <Layers size={14} /> Add Subdivision
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'section' ? '' : 'btn-sec'}`}
            onClick={() => { setActiveTab('section'); setError(''); setSuccess(''); }}
          >
            <Plus size={14} /> Add Section
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'user' ? '' : 'btn-sec'}`}
            onClick={() => { setActiveTab('user'); setError(''); setSuccess(''); }}
          >
            <UserPlus size={14} /> Add User (JE/AE)
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'transformer' ? '' : 'btn-sec'}`}
            onClick={() => { setActiveTab('transformer'); setError(''); setSuccess(''); }}
          >
            <Zap size={14} /> Add Transformer
          </button>
        </div>

        {/* 1. Add Subdivision Form */}
        {activeTab === 'subdivision' && (
          <form onSubmit={handleCreateSubdivision}>
            <h4 style={{ marginBottom: 16 }}>Create New Subdivision</h4>
            <div className="form-group">
              <label className="form-label required">Division</label>
              <select className="form-select" value={divId} onChange={(e) => setDivId(e.target.value)}>
                {masterData?.divisions?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Subdivision Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sahibganj West Subdivision"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                required
              />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              Create Subdivision
            </button>
          </form>
        )}

        {/* 2. Add Section Form */}
        {activeTab === 'section' && (
          <form onSubmit={handleCreateSection}>
            <h4 style={{ marginBottom: 16 }}>Create New Section</h4>
            <div className="form-group">
              <label className="form-label required">Parent Subdivision</label>
              <select className="form-select" value={secSubId} onChange={(e) => setSecSubId(e.target.value)}>
                {masterData?.subdivisions?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Section Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Section-2 Urban"
                value={secName}
                onChange={(e) => setSecName(e.target.value)}
                required
              />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              Create Section
            </button>
          </form>
        )}

        {/* 3. Add User Form */}
        {activeTab === 'user' && (
          <form onSubmit={handleCreateUser}>
            <h4 style={{ marginBottom: 16 }}>Create New Officer / User</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rajesh Kumar"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Employee ID (Username)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. je4, ae4"
                  value={userEmpId}
                  onChange={(e) => setUserEmpId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Password (8+ chars)</label>
                <input
                  type="text"
                  className="form-input"
                  value={userPw}
                  onChange={(e) => setUserPw(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Role</label>
                <select className="form-select" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                  <option value="JE">JE (Junior Engineer)</option>
                  <option value="AE">AE (Assistant Engineer)</option>
                  <option value="DIVISION">Division Officer</option>
                  <option value="CIRCLE">Circle Officer</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Subdivision</label>
                <select className="form-select" value={userSubId} onChange={(e) => setUserSubId(e.target.value)}>
                  {masterData?.subdivisions?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {userRole === 'JE' && (
                <div className="form-group">
                  <label className="form-label required">Section</label>
                  <select className="form-select" value={userSecId} onChange={(e) => setUserSecId(e.target.value)}>
                    {masterData?.sections?.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {userRole === 'JE' && (
              <div className="form-group">
                <label className="form-label required">Assigned AE (Reporting Officer)</label>
                <select className="form-select" value={userAeId} onChange={(e) => setUserAeId(e.target.value)}>
                  <option value="">Select AE Officer</option>
                  {masterData?.aes?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.emp_id})</option>
                  ))}
                </select>
              </div>
            )}

            <button className="btn" type="submit" disabled={loading}>
              Create User
            </button>
          </form>
        )}

        {/* 4. Add Transformer Form */}
        {activeTab === 'transformer' && (
          <form onSubmit={handleCreateTransformer}>
            <h4 style={{ marginBottom: 16 }}>Add Master Transformer (DTR)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Transformer Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. DTR-1005"
                  value={tCode}
                  onChange={(e) => setTCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">DTR No.</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1005"
                  value={tDtrNo}
                  onChange={(e) => setTDtrNo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Capacity</label>
                <select className="form-select" value={tCap} onChange={(e) => setTCap(e.target.value)}>
                  {masterData?.lookups?.filter((l) => l.kind === 'capacity').map((c) => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Phase Type</label>
                <select className="form-select" value={tType} onChange={(e) => setTType(e.target.value)}>
                  <option value="1-Phase">1-Phase</option>
                  <option value="3-Phase">3-Phase</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Section</label>
                <select className="form-select" value={tSecId} onChange={(e) => setTSecId(e.target.value)}>
                  {masterData?.sections?.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Village / Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Village 14"
                  value={tVillage}
                  onChange={(e) => setTVillage(e.target.value)}
                  required
                />
              </div>
            </div>

            <button className="btn" type="submit" disabled={loading}>
              Add Transformer
            </button>
          </form>
        )}
      </div>

      {/* Overview Table of Existing Master Data */}
      <div className="card">
        <h4 className="card-title">Existing Subdivisions ({masterData?.subdivisions?.length || 0})</h4>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Subdivision ID</th>
                <th>Subdivision Name</th>
              </tr>
            </thead>
            <tbody>
              {masterData?.subdivisions?.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.id}</strong></td>
                  <td>{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
