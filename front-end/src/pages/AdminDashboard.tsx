import { useState, type JSX } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';

// Sample data matching original app.js
const pendingDentists = [
  { id: 'd1', name: 'Dr. Michael Smith', email: 'michael@dental.com', clinic: 'New Age Dental', licenseNumber: 'DL-99001', specialization: 'Orthodontics', phone: '555-0301', createdAt: '2024-12-01' },
  { id: 'd2', name: 'Dr. Jennifer Lee', email: 'jennifer@dental.com', clinic: 'Family Dental', licenseNumber: 'DL-99002', specialization: 'Pediatric', phone: '555-0302', createdAt: '2024-12-02' }
];

const verifiedDentists = [
  { id: 'd3', name: 'Dr. Sarah Johnson', email: 'sarah@dentalcare.com', clinic: 'Downtown Dental Care', dentistCode: 'DEN-2024-001', patientsCount: 48 },
  { id: 'd4', name: 'Dr. Emily Williams', email: 'emily@smile.com', clinic: 'Smile Clinic', dentistCode: 'DEN-2024-002', patientsCount: 35 }
];

const allPatients = [
  { id: 'p1', name: 'John Smith', email: 'john@example.com', assignedDentist: 'Dr. Sarah Johnson', status: 'active', createdAt: '2024-01-15' },
  { id: 'p2', name: 'Mary Davis', email: 'mary@example.com', assignedDentist: 'Dr. Sarah Johnson', status: 'active', createdAt: '2024-02-20' },
  { id: 'p3', name: 'Alice Brown', email: 'alice@example.com', assignedDentist: null, status: 'pending', createdAt: '2024-12-01' }
];

const highRiskAlerts = [
  { id: 'a1', patientId: '#1247', tooth: 14, condition: 'Periapical Abscess', severity: 'Severe', confidence: 94, daysAgo: 2 },
  { id: 'a2', patientId: '#1248', tooth: 36, condition: 'Advanced Caries', severity: 'Moderate', confidence: 89, daysAgo: 3 }
];

// Icons matching original app.js
const icons: Record<string, JSX.Element> = {
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  'check-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  'x-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  edit: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  'alert-triangle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  'trending-up': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  ban: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
};

const Icon = ({ name }: { name: string }) => icons[name] || <span>{name}</span>;

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState('admin-dashboard');

  const renderContent = () => {
    switch (activeView) {
      // ============== ADMIN DASHBOARD ==============
      case 'admin-dashboard':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>System Dashboard</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Dentists</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="shield" />
                  </div>
                </div>
                <div className="stat-value">{pendingDentists.length + verifiedDentists.length}</div>
                <div className="stat-change">{verifiedDentists.length} verified, {pendingDentists.length} pending</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Patients</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="users" />
                  </div>
                </div>
                <div className="stat-value">{allPatients.length}</div>
                <div className="stat-change">{allPatients.filter(p => p.status === 'active').length} active</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">AI Accuracy</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-5)', color: '#9333EA' }}>
                    <Icon name="trending-up" />
                  </div>
                </div>
                <div className="stat-value">92.0%</div>
                <div className="stat-change positive">↑ 2.3% this month</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Pending Approvals</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="clock" />
                  </div>
                </div>
                <div className="stat-value">{pendingDentists.length}</div>
                <div className="stat-change">Dentists awaiting verification</div>
              </div>
            </div>

            {pendingDentists.length > 0 && (
              <div className="alert warning" style={{ marginTop: 'var(--space-24)' }}>
                <Icon name="alert-triangle" />
                <span>You have <strong>{pendingDentists.length}</strong> dentist(s) waiting for verification. 
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('admin-dentists'); }} style={{ color: 'var(--color-primary)' }}> Review now</a></span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-24)', marginTop: 'var(--space-24)' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Recent Registrations</h3>
                </div>
                <div className="recent-list">
                  {pendingDentists.map(d => (
                    <div className="recent-item" key={d.id}>
                      <div className="recent-avatar">{d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                      <div className="recent-info">
                        <div className="recent-name">{d.name}</div>
                        <div className="recent-meta">{d.clinic}</div>
                      </div>
                      <span className="status-badge pending">pending</span>
                    </div>
                  ))}
                  {verifiedDentists.slice(0, 2).map(d => (
                    <div className="recent-item" key={d.id}>
                      <div className="recent-avatar">{d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                      <div className="recent-info">
                        <div className="recent-name">{d.name}</div>
                        <div className="recent-meta">{d.clinic}</div>
                      </div>
                      <span className="status-badge verified">verified</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Quick Actions</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', padding: 'var(--space-16)' }}>
                  <button className="btn btn--primary btn--full" onClick={() => setActiveView('admin-dentists')}>
                    <Icon name="shield" />
                    Manage Dentists
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('admin-patients')}>
                    <Icon name="users" />
                    View All Patients
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('admin-system')}>
                    <Icon name="settings" />
                    System Settings
                  </button>
                </div>
              </div>
            </div>
          </>
        );

      // ============== ADMIN DENTISTS ==============
      case 'admin-dentists':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Dentist Management</h2>
            
            {pendingDentists.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-24)' }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <Icon name="alert-triangle" /> Pending Verification ({pendingDentists.length})
                  </h3>
                </div>
                <div className="dentists-list">
                  {pendingDentists.map(dentist => (
                    <div className="dentist-card pending" key={dentist.id}>
                      <div className="dentist-header">
                        <div className="dentist-avatar pending">
                          {dentist.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="dentist-info">
                          <div className="dentist-name">{dentist.name}</div>
                          <div className="dentist-meta">{dentist.email}</div>
                          <div className="dentist-meta">Applied: {dentist.createdAt}</div>
                        </div>
                        <span className="status-badge pending">Pending Verification</span>
                      </div>
                      
                      <div className="dentist-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Clinic</span>
                          <span className="detail-value">{dentist.clinic}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">License #</span>
                          <span className="detail-value">{dentist.licenseNumber}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Specialization</span>
                          <span className="detail-value">{dentist.specialization}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Phone</span>
                          <span className="detail-value">{dentist.phone}</span>
                        </div>
                      </div>
                      
                      <div className="dentist-actions">
                        <button className="btn btn--success">
                          <Icon name="check-circle" /> Verify & Approve
                        </button>
                        <button className="btn btn--outline">
                          <Icon name="eye" /> View Details
                        </button>
                        <button className="btn btn--danger">
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
                <input type="text" className="form-input" placeholder="Search dentists..." style={{ width: '250px' }} />
              </div>
              
              {verifiedDentists.length > 0 ? (
                <div className="dentists-list">
                  {verifiedDentists.map(dentist => (
                    <div className="dentist-card" key={dentist.id}>
                      <div className="dentist-header">
                        <div className="dentist-avatar verified">
                          {dentist.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="dentist-info">
                          <div className="dentist-name">{dentist.name}</div>
                          <div className="dentist-meta">{dentist.email}</div>
                          <div className="dentist-meta">Code: <strong>{dentist.dentistCode}</strong></div>
                        </div>
                        <span className="status-badge verified">Verified</span>
                      </div>
                      
                      <div className="dentist-stats">
                        <div className="dentist-stat">
                          <span className="stat-value">{dentist.patientsCount}</span>
                          <span className="stat-label">Patients</span>
                        </div>
                        <div className="dentist-stat">
                          <span className="stat-value">{dentist.clinic}</span>
                          <span className="stat-label">Clinic</span>
                        </div>
                      </div>
                      
                      <div className="dentist-actions">
                        <button className="btn btn--outline btn--sm">
                          <Icon name="eye" /> View
                        </button>
                        <button className="btn btn--outline btn--sm">
                          <Icon name="edit" /> Edit
                        </button>
                        <button className="btn btn--danger btn--sm">
                          <Icon name="ban" /> Suspend
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Icon name="shield" />
                  <h3>No Verified Dentists</h3>
                  <p>Verified dentists will appear here.</p>
                </div>
              )}
            </div>
          </>
        );

      // ============== ADMIN PATIENTS ==============
      case 'admin-patients':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>All Patients</h2>
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Patient Registry ({allPatients.length})</h3>
                <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                  <select className="form-select" style={{ width: '150px' }}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                  <input type="text" className="form-input" placeholder="Search patients..." style={{ width: '250px' }} />
                </div>
              </div>
              
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Email</th>
                      <th>Assigned Dentist</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPatients.map(patient => (
                      <tr key={patient.id}>
                        <td>
                          <div className="table-user">
                            <div className="table-avatar">{patient.name.split(' ').map(n => n[0]).join('')}</div>
                            <span>{patient.name}</span>
                          </div>
                        </td>
                        <td>{patient.email}</td>
                        <td>{patient.assignedDentist || 'Unassigned'}</td>
                        <td><span className={`status-badge ${patient.status}`}>{patient.status}</span></td>
                        <td>{patient.createdAt}</td>
                        <td>
                          <button className="btn btn--outline btn--xs">
                            <Icon name="eye" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      // ============== ADMIN ALERTS ==============
      case 'admin-alerts':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>High-Risk Patient Alerts</h2>
            
            <div className="alert danger">
              <Icon name="alert-triangle" />
              {highRiskAlerts.length} patients flagged as high-risk and require immediate attention
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Critical Cases</h3>
              </div>
              <div style={{ padding: 'var(--space-24)' }}>
                <div className="detections-list">
                  {highRiskAlerts.map(alert => (
                    <div className="detection-item high-urgency" key={alert.id}>
                      <div className="detection-header">
                        <div className="detection-title">Patient {alert.patientId} - Tooth {alert.tooth}</div>
                        <span className="urgency-badge high">High Priority</span>
                      </div>
                      <div className="detection-details">
                        <div className="detection-detail">
                          <span className="detection-detail-label">Condition</span>
                          <span className="detection-detail-value">{alert.condition}</span>
                        </div>
                        <div className="detection-detail">
                          <span className="detection-detail-label">Severity</span>
                          <span className="detection-detail-value">{alert.severity}</span>
                        </div>
                        <div className="detection-detail">
                          <span className="detection-detail-label">Confidence</span>
                          <span className="detection-detail-value">{alert.confidence}%</span>
                        </div>
                        <div className="detection-detail">
                          <span className="detection-detail-label">Detected</span>
                          <span className="detection-detail-value">{alert.daysAgo} days ago</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );

      // ============== ADMIN SYSTEM ==============
      case 'admin-system':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>System Settings</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Uptime</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">99.8%</div>
                <div className="stat-change positive">Last 30 days</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Avg Response Time</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="clock" />
                  </div>
                </div>
                <div className="stat-value">1.2s</div>
                <div className="stat-change">AI processing</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">System Configuration</h3>
              </div>
              <div style={{ padding: 'var(--space-16)' }}>
                <div className="settings-group">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Auto-approve Dentists</div>
                      <div className="setting-desc">Automatically verify new dentist registrations</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Email Notifications</div>
                      <div className="setting-desc">Send email notifications for pending approvals</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">AI Confidence Threshold</div>
                      <div className="setting-desc">Minimum confidence level for AI findings</div>
                    </div>
                    <select className="form-select" style={{ width: '150px' }}>
                      <option>70%</option>
                      <option>80%</option>
                      <option>90%</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Database Statistics</h3>
              </div>
              <div className="stats-grid-small" style={{ padding: 'var(--space-16)' }}>
                <div className="stat-item">
                  <span className="stat-number">{pendingDentists.length + verifiedDentists.length + allPatients.length}</span>
                  <span className="stat-label">Total Users</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{allPatients.length}</span>
                  <span className="stat-label">Total Patients</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">5</span>
                  <span className="stat-label">Assignment Requests</span>
                </div>
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
      userName="Admin User"
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default AdminDashboard;
