import { useState, type JSX } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';

// Sample data matching original app.js
const myPatients = [
  { id: 'p1', name: 'John Smith', email: 'john@example.com', phone: '555-0101', lastVisit: 'Nov 1, 2024', activeCases: 2 },
  { id: 'p2', name: 'Mary Davis', email: 'mary@example.com', phone: '555-0102', lastVisit: 'Oct 15, 2024', activeCases: 1 },
  { id: 'p3', name: 'Robert Johnson', email: 'robert@example.com', phone: '555-0103', lastVisit: 'Oct 10, 2024', activeCases: 0 }
];

const pendingRequests = [
  { id: 'req1', patientName: 'Alice Brown', patientEmail: 'alice@example.com', requestedAt: '2024-12-01', message: 'Looking for a new dentist after moving to the area.', phone: '555-0201' },
  { id: 'req2', patientName: 'Bob Wilson', patientEmail: 'bob@example.com', requestedAt: '2024-12-02', message: null, phone: '555-0202' }
];

const recentCases = [
  { id: 'c1', patientName: 'John Smith', imageType: 'Panoramic X-Ray', status: 'NEEDS_REVIEW', uploadedAt: new Date().toISOString(), aiFindings: 3, highPriority: 1 },
  { id: 'c2', patientName: 'Mary Davis', imageType: 'Bitewing X-Ray', status: 'FINALIZED', uploadedAt: new Date(Date.now() - 86400000).toISOString(), aiFindings: 2, highPriority: 0 },
  { id: 'c3', patientName: 'Robert Johnson', imageType: 'Periapical X-Ray', status: 'AI_ANALYZED', uploadedAt: new Date(Date.now() - 172800000).toISOString(), aiFindings: 1, highPriority: 0 }
];

const dentistProfile = {
  name: 'Dr. Sarah Johnson',
  email: 'dr.johnson@dentalclinic.com',
  dentistCode: 'DEN-2024-001',
  licenseNumber: 'DL-12345-CA',
  clinic: 'Downtown Dental Care',
  specialization: 'General Dentistry',
  phone: '555-0100',
  address: '123 Main Street, Suite 200',
  availability: 'Mon-Fri 9AM-5PM',
  status: 'verified'
};

// Icons matching original app.js
const icons: Record<string, JSX.Element> = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  upload: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  inbox: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
  'file-text': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  'check-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  'x-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  edit: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  send: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  'alert-triangle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const Icon = ({ name }: { name: string }) => icons[name] || <span>{name}</span>;

const DentistDashboard = () => {
  const [activeView, setActiveView] = useState('dentist-dashboard');
  const [activeInboxTab, setActiveInboxTab] = useState('new-uploads');

  const renderContent = () => {
    switch (activeView) {
      // ============== DENTIST DASHBOARD ==============
      case 'dentist-dashboard':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Clinic Dashboard</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Patients</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="users" />
                  </div>
                </div>
                <div className="stat-value">48</div>
                <div className="stat-change positive">↑ 12% from last month</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">High-Risk Alerts</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-4)', color: '#EF4444' }}>
                    <Icon name="alert-triangle" />
                  </div>
                </div>
                <div className="stat-value">3</div>
                <div className="stat-change">Requires attention</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">AI Accuracy</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="check-circle" />
                  </div>
                </div>
                <div className="stat-value">92%</div>
                <div className="stat-change positive">↑ 2% improvement</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Cases This Month</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">47</div>
                <div className="stat-change">Avg 2.5/day</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-24)' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Recent Cases</h3>
                  <button className="btn btn--outline btn--sm" onClick={() => setActiveView('dentist-inbox')}>
                    View All
                  </button>
                </div>
                <div className="recent-cases-list">
                  {recentCases.map(caseItem => (
                    <div className="recent-case-item" key={caseItem.id}>
                      <div className="case-patient-info">
                        <div className="case-patient-avatar">{caseItem.patientName.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <div className="case-patient-name">{caseItem.patientName}</div>
                          <div className="case-type">{caseItem.imageType}</div>
                        </div>
                      </div>
                      <div className="case-status">
                        <span className={`status-badge ${caseItem.status.toLowerCase().replace('_', '-')}`}>{caseItem.status.replace('_', ' ')}</span>
                        <div className="case-date">{new Date(caseItem.uploadedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Quick Actions</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                  <button className="btn btn--primary btn--full" onClick={() => setActiveView('dentist-upload')}>
                    <Icon name="upload" />
                    New Analysis
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-inbox')}>
                    <Icon name="inbox" />
                    Review Pending Cases
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-patients')}>
                    <Icon name="users" />
                    Patient Management
                  </button>
                </div>
              </div>
            </div>
          </>
        );

      // ============== DENTIST INBOX ==============
      case 'dentist-inbox':
        { const newUploads = recentCases.filter(c => c.status === 'AI_ANALYZED' || c.status === 'UPLOADED');
        const needsReview = recentCases.filter(c => c.status === 'NEEDS_REVIEW');
        const finalized = recentCases.filter(c => c.status === 'FINALIZED' || c.status === 'SENT_TO_PATIENT');
        
        const getCurrentTabCases = () => {
          switch(activeInboxTab) {
            case 'new-uploads': return newUploads;
            case 'needs-review': return needsReview;
            case 'finalized': return finalized;
            default: return newUploads;
          }
        };

        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Case Inbox</h2>
            
            <div className="inbox-tabs">
              <button 
                className={`inbox-tab ${activeInboxTab === 'new-uploads' ? 'active' : ''}`} 
                onClick={() => setActiveInboxTab('new-uploads')}
              >
                New Uploads
                {newUploads.length > 0 && <span className="tab-badge">{newUploads.length}</span>}
              </button>
              <button 
                className={`inbox-tab ${activeInboxTab === 'needs-review' ? 'active' : ''}`}
                onClick={() => setActiveInboxTab('needs-review')}
              >
                Needs Review
                {needsReview.length > 0 && <span className="tab-badge urgent">{needsReview.length}</span>}
              </button>
              <button 
                className={`inbox-tab ${activeInboxTab === 'finalized' ? 'active' : ''}`}
                onClick={() => setActiveInboxTab('finalized')}
              >
                Finalized / Sent
                {finalized.length > 0 && <span className="tab-badge">{finalized.length}</span>}
              </button>
            </div>

            <div className="inbox-content">
              {getCurrentTabCases().length > 0 ? (
                <div className="case-cards-grid">
                  {getCurrentTabCases().map(caseItem => (
                    <div className={`case-card ${caseItem.highPriority > 0 ? 'has-urgent' : ''}`} key={caseItem.id}>
                      <div className="case-card-header">
                        <div className="case-patient">
                          <div className="case-avatar">{caseItem.patientName.split(' ').map(n => n[0]).join('')}</div>
                          <div>
                            <div className="case-patient-name">{caseItem.patientName}</div>
                            <div className="case-meta">{caseItem.imageType}</div>
                          </div>
                        </div>
                        <span className={`status-badge ${caseItem.status.toLowerCase().replace('_', '-')}`}>{caseItem.status.replace('_', ' ')}</span>
                      </div>
                      
                      <div className="case-card-body">
                        <div className="case-stats">
                          <div className="case-stat">
                            <span className="stat-number">{caseItem.aiFindings}</span>
                            <span className="stat-label">AI Findings</span>
                          </div>
                          {caseItem.highPriority > 0 && (
                            <div className="case-stat urgent">
                              <span className="stat-number">{caseItem.highPriority}</span>
                              <span className="stat-label">High Priority</span>
                            </div>
                          )}
                        </div>
                        <div className="case-date">
                          <Icon name="clock" /> Uploaded {new Date(caseItem.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="case-card-actions">
                        {(caseItem.status === 'NEEDS_REVIEW' || caseItem.status === 'AI_ANALYZED') ? (
                          <button className="btn btn--primary btn--full">
                            <Icon name="eye" /> Review Case
                          </button>
                        ) : caseItem.status === 'FINALIZED' ? (
                          <button className="btn btn--success btn--full">
                            <Icon name="send" /> Send to Patient
                          </button>
                        ) : (
                          <button className="btn btn--outline btn--full">
                            <Icon name="eye" /> View Details
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Icon name="check-circle" />
                  <h3>All Caught Up!</h3>
                  <p>No cases in this category.</p>
                </div>
              )}
            </div>
          </>
        ); }

      // ============== DENTIST CHARTING ==============
      case 'dentist-charting':
        return (
          <>
            <div className="charting-workspace">
              <div className="charting-header">
                <div className="charting-title">
                  <h2>Clinical Charting</h2>
                  <p>Interactive dental chart with procedure tracking and history</p>
                </div>
                
                <div className="patient-selector">
                  <label>Select Patient:</label>
                  <select className="patient-dropdown form-select">
                    <option value="">-- Select Patient --</option>
                    {myPatients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="empty-state">
                <Icon name="users" />
                <h3>Select a Patient</h3>
                <p>Choose a patient from the dropdown above to view and edit their dental chart.</p>
              </div>
            </div>
          </>
        );

      // ============== DENTIST PENDING PATIENTS ==============
      case 'dentist-pending':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Pending Patient Requests</h2>
            
            {pendingRequests.length > 0 && (
              <div className="alert info" style={{ marginBottom: 'var(--space-24)' }}>
                <Icon name="info" />
                <span>You have <strong>{pendingRequests.length}</strong> pending patient request(s) awaiting your review.</span>
              </div>
            )}
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Approval Queue</h3>
              </div>
              
              {pendingRequests.length > 0 ? (
                <div className="pending-patients-list">
                  {pendingRequests.map(request => (
                    <div className="pending-patient-card" key={request.id}>
                      <div className="pending-patient-header">
                        <div className="patient-avatar pending">
                          {request.patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="pending-patient-info">
                          <div className="patient-name">{request.patientName}</div>
                          <div className="patient-meta">{request.patientEmail}</div>
                          <div className="patient-meta">Requested: {request.requestedAt}</div>
                        </div>
                        <span className="status-badge pending">Pending</span>
                      </div>
                      
                      {request.message && (
                        <div className="patient-message">
                          <strong>Message from patient:</strong>
                          <p>{request.message}</p>
                        </div>
                      )}
                      
                      <div className="patient-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Phone</span>
                          <span className="detail-value">{request.phone || 'Not provided'}</span>
                        </div>
                      </div>
                      
                      <div className="pending-actions">
                        <button className="btn btn--success">
                          <Icon name="check-circle" /> Accept Patient
                        </button>
                        <button className="btn btn--outline">
                          <Icon name="info" /> Request Info
                        </button>
                        <button className="btn btn--danger">
                          <Icon name="x-circle" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Icon name="check-circle" />
                  <h3>No Pending Requests</h3>
                  <p>All patient requests have been processed. New requests will appear here.</p>
                </div>
              )}
            </div>
          </>
        );

      // ============== DENTIST UPLOAD ==============
      case 'dentist-upload':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>New AI Analysis</h2>
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Upload Patient Image</h3>
              </div>
              <div id="upload-area" className="upload-area">
                <div className="upload-icon">
                  <Icon name="upload" />
                </div>
                <div className="upload-text">Drag and drop dental image here</div>
                <div className="upload-hint">Supports: Panoramic, Bitewing, Periapical, Intraoral</div>
              </div>
            </div>
          </>
        );

      // ============== DENTIST PATIENTS ==============
      case 'dentist-patients':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>My Patients</h2>
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Active Patients ({myPatients.length})</h3>
                <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                  <input type="text" className="form-input" placeholder="Search patients..." style={{ width: '250px' }} />
                </div>
              </div>
              
              {myPatients.length > 0 ? (
                <div className="patients-list">
                  {myPatients.map(patient => (
                    <div className="patient-card" key={patient.id}>
                      <div className="patient-avatar">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="patient-info">
                        <div className="patient-name">{patient.name}</div>
                        <div className="patient-meta">{patient.email}</div>
                        <div className="patient-meta">{patient.phone || 'No phone'}</div>
                      </div>
                      <div className="patient-stats">
                        <div className="patient-stat">
                          <span className="stat-label">Last Visit</span>
                          <span className="stat-value">{patient.lastVisit}</span>
                        </div>
                        <div className="patient-stat">
                          <span className="stat-label">Active Cases</span>
                          <span className="stat-value">{patient.activeCases}</span>
                        </div>
                      </div>
                      <div className="patient-actions">
                        <button className="btn btn--primary btn--sm">
                          <Icon name="file-text" /> View Details
                        </button>
                        <button className="btn btn--outline btn--sm">
                          <Icon name="upload" /> New Analysis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Icon name="users" />
                  <h3>No Active Patients</h3>
                  <p>Patients will appear here once you approve their requests.</p>
                  <button className="btn btn--primary" onClick={() => setActiveView('dentist-pending')}>
                    View Pending Requests
                  </button>
                </div>
              )}
            </div>
          </>
        );

      // ============== DENTIST PROFILE ==============
      case 'dentist-profile':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>My Profile</h2>
            
            <div className="profile-container">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Professional Information</h3>
                  <button className="btn btn--outline btn--sm">
                    <Icon name="edit" /> Edit
                  </button>
                </div>
                
                <div className="profile-grid">
                  <div className="profile-item">
                    <span className="profile-label">Full Name</span>
                    <span className="profile-value">{dentistProfile.name}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Email</span>
                    <span className="profile-value">{dentistProfile.email}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Dentist Code</span>
                    <span className="profile-value code">{dentistProfile.dentistCode}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">License Number</span>
                    <span className="profile-value">{dentistProfile.licenseNumber}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Clinic/Practice</span>
                    <span className="profile-value">{dentistProfile.clinic}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Specialization</span>
                    <span className="profile-value">{dentistProfile.specialization}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Phone</span>
                    <span className="profile-value">{dentistProfile.phone}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Address</span>
                    <span className="profile-value">{dentistProfile.address}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Availability</span>
                    <span className="profile-value">{dentistProfile.availability}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Account Status</span>
                    <span className="profile-value">
                      <span className={`status-badge ${dentistProfile.status}`}>{dentistProfile.status}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="card" style={{ marginTop: 'var(--space-24)' }}>
                <div className="card-header">
                  <h3 className="card-title">Patient Statistics</h3>
                </div>
                <div className="stats-grid-small">
                  <div className="stat-item">
                    <span className="stat-number">{myPatients.length}</span>
                    <span className="stat-label">Active Patients</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{pendingRequests.length}</span>
                    <span className="stat-label">Pending Requests</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">47</span>
                    <span className="stat-label">Cases This Month</span>
                  </div>
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
      role="dentist"
      userName="Dr. Smith"
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default DentistDashboard;
