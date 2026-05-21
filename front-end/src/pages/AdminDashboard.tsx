import { useState, useEffect, useCallback, type JSX } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminStats,
  fetchAdminDentists,
  fetchAdminPatients,
  verifyDentist,
  suspendDentist,
  type AdminStatsDto,
  type AdminDentistDto,
  type AdminPatientDto,
} from '../lib/backendApi';

// Icons
const icons: Record<string, JSX.Element> = {
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  'check-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  'x-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  'alert-triangle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  'trending-up': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  ban: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  'bar-chart': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  refresh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  'map-pin': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
};

const Icon = ({ name }: { name: string }) => icons[name] || <span>{name}</span>;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('admin-dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [dentists, setDentists] = useState<AdminDentistDto[]>([]);
  const [patients, setPatients] = useState<AdminPatientDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, p] = await Promise.all([
        fetchAdminStats(),
        fetchAdminDentists(),
        fetchAdminPatients(),
      ]);
      setStats(s);
      setDentists(d);
      setPatients(p);
    } catch {
      showFeedback('error', 'Failed to load data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleVerifyDentist = async (dentistId: string) => {
    try {
      await verifyDentist(dentistId);
      showFeedback('success', 'Dentist verified successfully.');
      await loadData();
    } catch {
      showFeedback('error', 'Failed to verify dentist.');
    }
  };

  const handleSuspendDentist = async (dentistId: string) => {
    try {
      await suspendDentist(dentistId);
      showFeedback('success', 'Dentist suspended.');
      await loadData();
    } catch {
      showFeedback('error', 'Failed to suspend dentist.');
    }
  };

  const pendingDentists = dentists.filter(d => !d.is_verified);
  const verifiedDentists = dentists.filter(d => d.is_verified);

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVerifiedDentists = verifiedDentists.filter(d =>
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout role="admin" userName={user?.name ?? 'Admin'} activeView={activeView} onViewChange={setActiveView}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      // ============== OVERVIEW ==============
      case 'admin-dashboard':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-24)' }}>
              <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>System Dashboard</h2>
              <button className="btn btn--outline btn--sm" onClick={loadData}>
                <Icon name="refresh" /> Refresh
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Dentists</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="shield" />
                  </div>
                </div>
                <div className="stat-value">{stats?.total_dentists ?? 0}</div>
                <div className="stat-change">{stats?.verified_dentists ?? 0} verified, {stats?.pending_dentists ?? 0} pending</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Patients</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="users" />
                  </div>
                </div>
                <div className="stat-value">{stats?.total_patients ?? 0}</div>
                <div className="stat-change">{stats?.total_appointments ?? 0} appointments total</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">AI Jobs</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-5)', color: '#9333EA' }}>
                    <Icon name="trending-up" />
                  </div>
                </div>
                <div className="stat-value">{stats?.total_ai_jobs ?? 0}</div>
                <div className="stat-change">CT scan analyses</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Pending Approvals</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-4)', color: '#EF4444' }}>
                    <Icon name="alert-triangle" />
                  </div>
                </div>
                <div className="stat-value">{stats?.pending_dentists ?? 0}</div>
                <div className="stat-change">Dentists awaiting review</div>
              </div>
            </div>

            {pendingDentists.length > 0 && (
              <div className="alert warning" style={{ marginTop: 'var(--space-24)' }}>
                <Icon name="alert-triangle" />
                <span>
                  You have <strong>{pendingDentists.length}</strong> dentist(s) waiting for verification.{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('admin-dentists'); }} style={{ color: 'var(--color-primary)', marginLeft: 'var(--space-4)' }}>
                    Review now
                  </a>
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-24)', marginTop: 'var(--space-24)' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Quick Actions</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', padding: 'var(--space-16)' }}>
                  <button className="btn btn--primary btn--full" onClick={() => setActiveView('admin-dentists')}>
                    <Icon name="shield" /> Manage Dentists
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('admin-patients')}>
                    <Icon name="users" /> View All Patients
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('admin-system')}>
                    <Icon name="settings" /> System Info
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Pending Verifications</h3>
                </div>
                <div className="recent-list">
                  {pendingDentists.length > 0 ? pendingDentists.slice(0, 4).map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-12)', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: 'var(--space-12)', flexShrink: 0 }}>
                        {d.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{d.full_name}</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{d.location}</div>
                      </div>
                      <button className="btn btn--success btn--sm" onClick={() => handleVerifyDentist(d.id)}>
                        <Icon name="check-circle" /> Verify
                      </button>
                    </div>
                  )) : (
                    <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No pending verifications
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );

      // ============== DENTIST MANAGEMENT ==============
      case 'admin-dentists':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Dentist Management</h2>

            {actionFeedback && (
              <div className={`alert ${actionFeedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 'var(--space-16)' }}>
                <Icon name={actionFeedback.type === 'success' ? 'check-circle' : 'alert-triangle'} />
                {actionFeedback.message}
              </div>
            )}

            {pendingDentists.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-24)' }}>
                <div className="card-header">
                  <h3 className="card-title"><Icon name="alert-triangle" /> Pending Verification ({pendingDentists.length})</h3>
                </div>
                <div style={{ padding: 'var(--space-16)' }}>
                  {pendingDentists.map(dentist => (
                    <div key={dentist.id} style={{ background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-16)', marginBottom: 'var(--space-12)', border: '1px solid #F59E0B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                          {dentist.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentist.full_name}</div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{dentist.email}</div>
                        </div>
                        <span style={{ background: '#FEF3C7', color: '#D97706', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)', flexShrink: 0 }}>Pending</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Location</div>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{dentist.location || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Phone</div>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{dentist.contact_number || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Code</div>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{dentist.dentist_code}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                        <button className="btn btn--success" onClick={() => handleVerifyDentist(dentist.id)}>
                          <Icon name="check-circle" /> Verify & Approve
                        </button>
                        <button className="btn btn--danger" onClick={() => handleSuspendDentist(dentist.id)}>
                          <Icon name="x-circle" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Verified Dentists ({verifiedDentists.length})</h3>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search dentists..."
                  style={{ width: '250px', padding: 'var(--space-8) var(--space-12)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredVerifiedDentists.length > 0 ? (
                <div style={{ padding: 'var(--space-16)' }}>
                  {filteredVerifiedDentists.map(dentist => (
                    <div key={dentist.id} style={{ background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-16)', marginBottom: 'var(--space-12)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                          {dentist.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentist.full_name}</div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{dentist.email}</div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            <Icon name="map-pin" /> {dentist.location || '—'} · Code: <strong>{dentist.dentist_code}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', marginRight: 'var(--space-16)' }}>
                          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: '#2563EB' }}>{dentist.patient_count}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Patients</div>
                        </div>
                        <span style={{ background: '#D1FAE5', color: '#047857', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)', flexShrink: 0 }}>Verified</span>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                        <button className="btn btn--outline btn--sm">
                          <Icon name="mail" /> Contact
                        </button>
                        <button className="btn btn--danger btn--sm" onClick={() => handleSuspendDentist(dentist.id)}>
                          <Icon name="ban" /> Suspend
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 'var(--space-48)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  <Icon name="shield" />
                  <h3 style={{ marginTop: 'var(--space-16)' }}>No Verified Dentists</h3>
                </div>
              )}
            </div>
          </>
        );

      // ============== PATIENT REGISTRY ==============
      case 'admin-patients':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>All Patients</h2>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Patient Registry ({filteredPatients.length})</h3>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search patients..."
                  style={{ width: '250px', padding: 'var(--space-8) var(--space-12)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-1)' }}>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Patient</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Email</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Phone</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Appointments</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>DOB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map(patient => (
                      <tr key={patient.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: 'var(--space-12)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'bold', flexShrink: 0 }}>
                              {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span>{patient.full_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>{patient.email}</td>
                        <td style={{ padding: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>{patient.contact_number || '—'}</td>
                        <td style={{ padding: 'var(--space-12)' }}>
                          <span style={{ background: patient.appointment_count > 0 ? '#DBEAFE' : '#D1FAE5', color: patient.appointment_count > 0 ? '#1D4ED8' : '#047857', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)' }}>
                            {patient.appointment_count}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>{patient.date_of_birth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      // ============== SYSTEM INFO ==============
      case 'admin-system':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>System Info</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Users</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="users" />
                  </div>
                </div>
                <div className="stat-value">{(stats?.total_dentists ?? 0) + (stats?.total_patients ?? 0)}</div>
                <div className="stat-change">Dentists + Patients</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Appointments</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="clock" />
                  </div>
                </div>
                <div className="stat-value">{stats?.total_appointments ?? 0}</div>
                <div className="stat-change">All time</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">AI Analyses</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-5)', color: '#9333EA' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">{stats?.total_ai_jobs ?? 0}</div>
                <div className="stat-change">CT scan jobs</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Verified Dentists</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="shield" />
                  </div>
                </div>
                <div className="stat-value">{stats?.verified_dentists ?? 0}</div>
                <div className="stat-change">of {stats?.total_dentists ?? 0} registered</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Database Overview</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-16)', padding: 'var(--space-16)' }}>
                {[
                  { label: 'Dentists', value: stats?.total_dentists ?? 0, color: '#2563EB' },
                  { label: 'Patients', value: stats?.total_patients ?? 0, color: '#10B981' },
                  { label: 'Appointments', value: stats?.total_appointments ?? 0, color: '#F59E0B' },
                ].map((item) => (
                  <div key={item.label} style={{ textAlign: 'center', padding: 'var(--space-16)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      default:
        return <p>View not found</p>;
    }
  };

  return (
    <DashboardLayout
      role="admin"
      userName={user?.name ?? 'Admin'}
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default AdminDashboard;
