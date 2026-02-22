import { useState, type JSX } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  database,
  getAdminStats,
  getAllDentists,
  getAllPatients,
  updateDentistStatus,
  formatDate
} from '../data/database';

// Icons
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
  'bar-chart': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  'pie-chart': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>,
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  refresh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
};

const Icon = ({ name }: { name: string }) => icons[name] || <span>{name}</span>;

// Simple Bar Chart Component
const BarChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-8)', height: '200px', padding: 'var(--space-16) 0' }}>
      {data.map((item, idx) => (
        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-8)' }}>
          <div style={{ 
            width: '100%', 
            height: `${(item.value / maxValue) * 150}px`, 
            background: item.color,
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            minHeight: '20px',
            transition: 'height 0.3s ease'
          }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState('admin-dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Get dynamic data
  const stats = getAdminStats();
  const allDentists = getAllDentists();
  const allPatients = getAllPatients();
  
  const pendingDentists = allDentists.filter(d => d.status === 'pending');
  const activeDentists = allDentists.filter(d => d.status === 'active');

  // Handle dentist verification
  const handleVerifyDentist = (dentistId: string) => {
    if (updateDentistStatus(dentistId, 'active')) {
      setActionFeedback({ type: 'success', message: 'Dentist verified successfully!' });
      setRefreshKey(prev => prev + 1);
    }
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleSuspendDentist = (dentistId: string) => {
    if (updateDentistStatus(dentistId, 'suspended')) {
      setActionFeedback({ type: 'success', message: 'Dentist suspended.' });
      setRefreshKey(prev => prev + 1);
    }
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Filter patients based on search
  const filteredPatients = allPatients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const renderContent = () => {
    switch (activeView) {
      // ============== ADMIN DASHBOARD ==============
      case 'admin-dashboard':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-24)' }}>
              <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>System Dashboard</h2>
              <button className="btn btn--outline btn--sm" onClick={() => setRefreshKey(prev => prev + 1)}>
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
                <div className="stat-value">{stats.totalDentists}</div>
                <div className="stat-change">{stats.activeDentists} verified, {stats.pendingDentists} pending</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Patients</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="users" />
                  </div>
                </div>
                <div className="stat-value">{stats.totalPatients}</div>
                <div className="stat-change">{stats.totalCases} total cases</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">AI Accuracy</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-5)', color: '#9333EA' }}>
                    <Icon name="trending-up" />
                  </div>
                </div>
                <div className="stat-value">{stats.aiAccuracy}%</div>
                <div className="stat-change positive">↑ 2.3% this month</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">High-Risk Alerts</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-4)', color: '#EF4444' }}>
                    <Icon name="alert-triangle" />
                  </div>
                </div>
                <div className="stat-value">{stats.highRiskCases}</div>
                <div className="stat-change">Require attention</div>
              </div>
            </div>

            {pendingDentists.length > 0 && (
              <div className="alert warning" style={{ marginTop: 'var(--space-24)' }}>
                <Icon name="alert-triangle" />
                <span>You have <strong>{pendingDentists.length}</strong> dentist(s) waiting for verification. 
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('admin-dentists'); }} style={{ color: 'var(--color-primary)', marginLeft: 'var(--space-4)' }}>Review now</a></span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-24)', marginTop: 'var(--space-24)' }}>
              {/* Monthly Cases Chart */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><Icon name="bar-chart" /> Cases by Month</h3>
                </div>
                <BarChart data={stats.monthlyStats.map((m, idx) => ({
                  label: m.month.split(' ')[0],
                  value: m.cases,
                  color: idx === stats.monthlyStats.length - 1 ? '#2563EB' : '#93C5FD'
                }))} />
              </div>

              {/* Quick Actions */}
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
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('admin-analytics')}>
                    <Icon name="bar-chart" /> View Analytics
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('admin-system')}>
                    <Icon name="settings" /> System Settings
                  </button>
                </div>
              </div>
            </div>

            {/* Pending Verifications */}
            <div className="card" style={{ marginTop: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Pending Verifications</h3>
              </div>
              <div className="recent-list">
                {pendingDentists.length > 0 ? pendingDentists.slice(0, 4).map(d => (
                  <div className="recent-item" key={d.id} style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-12)', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="recent-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: 'var(--space-12)' }}>
                      {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="recent-info" style={{ flex: 1 }}>
                      <div className="recent-name" style={{ fontWeight: 'var(--font-weight-medium)' }}>{d.name}</div>
                      <div className="recent-meta" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{d.clinic}</div>
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
          </>
        );

      // ============== ANALYTICS ==============
      case 'admin-analytics':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Analytics Dashboard</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Cases This Month</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">{stats.casesThisMonth}</div>
                <div className="stat-change positive">↑ 15% vs last month</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Avg. Processing Time</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="clock" />
                  </div>
                </div>
                <div className="stat-value">2.3s</div>
                <div className="stat-change">AI analysis time</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Detection Rate</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="check-circle" />
                  </div>
                </div>
                <div className="stat-value">98.2%</div>
                <div className="stat-change">Cases with findings</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">AI Accuracy</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-5)', color: '#9333EA' }}>
                    <Icon name="trending-up" />
                  </div>
                </div>
                <div className="stat-value">{stats.aiAccuracy}%</div>
                <div className="stat-change positive">Dentist-confirmed</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-24)', marginTop: 'var(--space-24)' }}>
              {/* Monthly Trends */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Monthly Trends</h3>
                </div>
                <BarChart data={stats.monthlyStats.map((m, idx) => ({
                  label: m.month.split(' ')[0],
                  value: m.cases,
                  color: idx === stats.monthlyStats.length - 1 ? '#2563EB' : '#93C5FD'
                }))} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-24)', padding: 'var(--space-16)', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#2563EB' }}>
                      {stats.monthlyStats.reduce((acc, m) => acc + m.cases, 0)}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Total Cases</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#10B981' }}>
                      {stats.monthlyStats.reduce((acc, m) => acc + m.patients, 0)}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Patients Served</div>
                  </div>
                </div>
              </div>

              {/* AI Accuracy by Condition */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">AI Accuracy by Condition</h3>
                </div>
                <div style={{ padding: 'var(--space-16)' }}>
                  {database.analytics.aiAccuracy.byCondition.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 'var(--space-16)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{item.condition}</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{item.accuracy}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${item.accuracy}%`, 
                          height: '100%', 
                          background: item.accuracy >= 93 ? '#10B981' : item.accuracy >= 90 ? '#F59E0B' : '#EF4444',
                          borderRadius: 'var(--radius-full)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Condition Distribution */}
            <div className="card" style={{ marginTop: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Condition Distribution</h3>
                <button className="btn btn--outline btn--sm">
                  <Icon name="download" /> Export Report
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-16)', padding: 'var(--space-16)' }}>
                {stats.topConditions.map((cond, idx) => (
                  <div key={idx} style={{ 
                    padding: 'var(--space-16)', 
                    background: 'var(--color-bg-1)', 
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: 'var(--font-size-2xl)', 
                      fontWeight: 'var(--font-weight-bold)',
                      color: ['#2563EB', '#10B981', '#F59E0B', '#EF4444'][idx]
                    }}>
                      {cond.count}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)' }}>
                      {cond.condition}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                      {cond.percentage}% of total
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      // ============== ADMIN DENTISTS ==============
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
                  <h3 className="card-title">
                    <Icon name="alert-triangle" /> Pending Verification ({pendingDentists.length})
                  </h3>
                </div>
                <div className="dentists-list" style={{ padding: 'var(--space-16)' }}>
                  {pendingDentists.map(dentist => (
                    <div className="dentist-card pending" key={dentist.id} style={{ 
                      background: 'var(--color-bg-1)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: 'var(--space-16)', 
                      marginBottom: 'var(--space-12)',
                      border: '1px solid #F59E0B'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {dentist.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentist.name}</div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{dentist.email}</div>
                        </div>
                        <span style={{ background: '#FEF3C7', color: '#D97706', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)' }}>Pending</span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Clinic</div>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{dentist.clinic}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>License #</div>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{dentist.licenseNumber}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Specialization</div>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{dentist.specialization}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Phone</div>
                          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{dentist.phone}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                        <button className="btn btn--success" onClick={() => handleVerifyDentist(dentist.id)}>
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
                <h3 className="card-title">Verified Dentists ({activeDentists.length})</h3>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search dentists..." 
                  style={{ width: '250px', padding: 'var(--space-8) var(--space-12)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {activeDentists.length > 0 ? (
                <div className="dentists-list" style={{ padding: 'var(--space-16)' }}>
                  {activeDentists
                    .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(dentist => (
                    <div className="dentist-card" key={dentist.id} style={{ 
                      background: 'var(--color-bg-1)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: 'var(--space-16)', 
                      marginBottom: 'var(--space-12)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {dentist.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentist.name}</div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{dentist.email}</div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Code: <strong>{dentist.dentistCode}</strong></div>
                        </div>
                        <span style={{ background: '#D1FAE5', color: '#047857', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)' }}>Verified</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 'var(--space-24)', marginBottom: 'var(--space-12)' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: '#2563EB' }}>{dentist.patientsCount || 0}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Patients</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>{dentist.clinic}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Clinic</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                        <button className="btn btn--outline btn--sm">
                          <Icon name="eye" /> View
                        </button>
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
              
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-1)' }}>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Patient</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Email</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Phone</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Active Cases</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Last Visit</th>
                      <th style={{ padding: 'var(--space-12)', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map(patient => (
                      <tr key={patient.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: 'var(--space-12)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                              {patient.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span>{patient.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>{patient.email}</td>
                        <td style={{ padding: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>{patient.phone}</td>
                        <td style={{ padding: 'var(--space-12)' }}>
                          <span style={{ 
                            background: patient.activeCases > 0 ? '#DBEAFE' : '#D1FAE5', 
                            color: patient.activeCases > 0 ? '#1D4ED8' : '#047857',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-sm)'
                          }}>
                            {patient.activeCases} case{patient.activeCases !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>{patient.lastVisit}</td>
                        <td style={{ padding: 'var(--space-12)' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                            <button className="btn btn--outline btn--xs" style={{ padding: 'var(--space-4) var(--space-8)' }}>
                              <Icon name="eye" />
                            </button>
                            <button className="btn btn--outline btn--xs" style={{ padding: 'var(--space-4) var(--space-8)' }}>
                              <Icon name="mail" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <div className="stat-value">99.9%</div>
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
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Storage Used</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">42.3 GB</div>
                <div className="stat-change">of 100 GB</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">API Calls Today</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-5)', color: '#9333EA' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">1,247</div>
                <div className="stat-change">AI analysis requests</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">System Configuration</h3>
              </div>
              <div style={{ padding: 'var(--space-16)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-16)', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Auto-approve Dentists</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Automatically verify new dentist registrations</div>
                  </div>
                  <input type="checkbox" style={{ width: '20px', height: '20px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-16)', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Email Notifications</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Send email notifications for pending approvals</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-16)', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>AI Confidence Threshold</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Minimum confidence level for AI findings</div>
                  </div>
                  <select style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <option>70%</option>
                    <option>80%</option>
                    <option>85%</option>
                    <option>90%</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-16)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Data Retention Period</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>How long to keep patient data</div>
                  </div>
                  <select style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <option>1 Year</option>
                    <option>3 Years</option>
                    <option>5 Years</option>
                    <option>7 Years</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Database Statistics</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-16)', padding: 'var(--space-16)' }}>
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#2563EB' }}>
                    {stats.totalDentists + stats.totalPatients}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Total Users</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#10B981' }}>
                    {stats.totalCases}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Total Cases</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#F59E0B' }}>
                    {database.appointments.length}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Appointments</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#9333EA' }}>
                    {database.treatmentPlans.length}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Treatment Plans</div>
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
