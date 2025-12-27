import { useState, type JSX } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';

// Sample data matching original app.js
const patientHistory = [
  { date: "2024-11-01", visit_type: "Routine Checkup", findings: "2 cavities detected", status: "Treatment completed" },
  { date: "2024-08-15", visit_type: "Follow-up", findings: "Healing progress normal", status: "Closed" },
  { date: "2024-05-20", visit_type: "Initial consultation", findings: "Gum disease early stage", status: "Under monitoring" }
];

const treatmentSuggestions = [
  { treatment: "Root Canal Therapy - Tooth 18", cdt_code: "D3310", priority: "High", estimated_cost: "$800-1200", description: "Endodontic therapy required due to periapical lesion" },
  { treatment: "Composite Restoration - Tooth 14", cdt_code: "D2391", priority: "Medium", estimated_cost: "$150-250", description: "Resin-based composite filling for dental caries" },
  { treatment: "Periodontal Scaling - Tooth 30", cdt_code: "D4341", priority: "Low", estimated_cost: "$200-350", description: "Scaling and root planing per quadrant" }
];

const patientResults = [
  {
    id: 'case-003',
    imageType: 'Periapical X-Ray',
    sentAt: '2024-11-01T11:00:00',
    finalFindings: [
      { id: 'finding-004', tooth: 21, condition: 'Enamel Demineralization', severity: 'Mild', urgency: 'low' }
    ],
    patientExplanation: 'We found a small area on your front tooth where the enamel is weakening. This is very early and can be reversed with fluoride treatment.',
    recommendations: ['Fluoride treatment', 'Improved oral hygiene', 'Follow-up in 3 months']
  }
];

// Icons matching original app.js getIcon function
const icons: Record<string, JSX.Element> = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  'file-text': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  upload: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  'alert-triangle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>,
};

const Icon = ({ name }: { name: string }) => icons[name] || <span>{name}</span>;

const PatientDashboard = () => {
  const [activeView, setActiveView] = useState('patient-dashboard');

  // Render Timeline matching original renderTimeline function
  const renderTimeline = () => (
    <div className="timeline">
      {patientHistory.map((item, index) => (
        <div className="timeline-item" key={index}>
          <div className="timeline-date">
            {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="timeline-content">
            <div className="timeline-title">{item.visit_type}</div>
            <div className="timeline-description">{item.findings}</div>
            <span className="timeline-status">{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // Render Treatment Plans matching original app.js structure
  const renderTreatmentPlans = () => (
    <div className="treatment-list">
      {treatmentSuggestions.map((item, index) => (
        <div className="treatment-plan" key={index}>
          <div className="treatment-header">
            <div>
              <div className="treatment-name">{item.treatment}</div>
              <div className="treatment-code">{item.cdt_code}</div>
            </div>
            <span className={`priority-badge ${item.priority.toLowerCase()}`}>{item.priority} Priority</span>
          </div>
          <div className="treatment-description">{item.description}</div>
          <div className="treatment-cost">Estimated Cost: {item.estimated_cost}</div>
        </div>
      ))}
    </div>
  );

  // Render Tooth SVG matching original app.js renderToothSVG function
  const renderToothSVG = (toothNumber: number, toothData: { surfaces?: Record<string, string>, status?: string, aiDetected?: boolean } = {}) => {
    const { surfaces = {}, status, aiDetected } = toothData;
    
    const getSurfaceClass = (surface: string) => {
      const state = surfaces[surface];
      if (!state) return '';
      if (state === 'finding' && aiDetected) return 'surface-ai-finding';
      if (state === 'finding') return 'surface-finding';
      if (state === 'planned') return 'surface-planned';
      if (state === 'completed') return 'surface-completed';
      if (state === 'existing') return 'surface-existing';
      return '';
    };

    return (
      <div className="tooth-svg-container" key={toothNumber} data-tooth={toothNumber}>
        <svg viewBox="0 0 50 50" className="tooth-svg">
          <rect className="tooth-base" x="5" y="5" width="40" height="40" rx="4" />
          {/* Buccal - top */}
          <polygon className={`tooth-surface surface-B ${getSurfaceClass('B')}`} points="10,10 40,10 35,18 15,18" />
          {/* Mesial - left */}
          <polygon className={`tooth-surface surface-M ${getSurfaceClass('M')}`} points="10,10 15,18 15,32 10,40" />
          {/* Distal - right */}
          <polygon className={`tooth-surface surface-D ${getSurfaceClass('D')}`} points="40,10 40,40 35,32 35,18" />
          {/* Lingual - bottom */}
          <polygon className={`tooth-surface surface-L ${getSurfaceClass('L')}`} points="10,40 15,32 35,32 40,40" />
          {/* Occlusal - center */}
          <polygon className={`tooth-surface surface-O ${getSurfaceClass('O')}`} points="15,18 35,18 35,32 15,32" />
          
          {/* Status indicators */}
          {status === 'missing' && (
            <>
              <line className="status-indicator missing-x" x1="10" y1="10" x2="40" y2="40" />
              <line className="status-indicator missing-x" x1="40" y1="10" x2="10" y2="40" />
            </>
          )}
          {status === 'implant' && (
            <>
              <circle className="status-indicator implant-circle" cx="25" cy="25" r="12" />
              <line className="status-indicator implant-line" x1="25" y1="13" x2="25" y2="37" />
            </>
          )}
          
          {/* AI detection indicator */}
          {aiDetected && (
            <>
              <circle className="ai-indicator" cx="42" cy="8" r="8" />
              <text x="42" y="11" className="ai-indicator-text">AI</text>
            </>
          )}
        </svg>
        <div className="tooth-number">{toothNumber}</div>
      </div>
    );
  };

  // Clinical Odontogram State
  const [numberingSystem, setNumberingSystem] = useState<'FDI' | 'Universal'>('FDI');
  const [dentitionType, setDentitionType] = useState<'adult' | 'child'>('adult');
  const [layerFilters, setLayerFilters] = useState({ findings: true, planned: true, completed: true });

  // Sample tooth data for demonstration (would come from API in real app)
  const sampleToothData: Record<number, { surfaces?: Record<string, string>, status?: string, aiDetected?: boolean }> = {
    18: { surfaces: { O: 'finding', M: 'finding' }, aiDetected: true },
    14: { surfaces: { O: 'planned', B: 'planned' } },
    21: { surfaces: { B: 'completed' } },
    36: { surfaces: { O: 'existing' } },
  };

  // Render Clinical Odontogram matching original app.js renderClinicalOdontogram function
  const renderClinicalOdontogram = () => {
    const adultTeeth = {
      upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
      upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
      lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
      lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38]
    };

    const childTeeth = {
      upperRight: [55, 54, 53, 52, 51],
      upperLeft: [61, 62, 63, 64, 65],
      lowerRight: [85, 84, 83, 82, 81],
      lowerLeft: [71, 72, 73, 74, 75]
    };

    const teeth = dentitionType === 'adult' ? adultTeeth : childTeeth;

    return (
      <div className="clinical-odontogram">
        {/* Odontogram Controls */}
        <div className="odontogram-controls">
          <div className="control-group">
            <label>Numbering:</label>
            <select 
              value={numberingSystem} 
              onChange={(e) => setNumberingSystem(e.target.value as 'FDI' | 'Universal')}
              className="numbering-select"
            >
              <option value="FDI">FDI (ISO)</option>
              <option value="Universal">Universal</option>
            </select>
          </div>

          <div className="control-group">
            <label>Dentition:</label>
            <div className="dentition-toggle">
              <button 
                className={`toggle-btn ${dentitionType === 'adult' ? 'active' : ''}`}
                onClick={() => setDentitionType('adult')}
              >
                Adult (32)
              </button>
              <button 
                className={`toggle-btn ${dentitionType === 'child' ? 'active' : ''}`}
                onClick={() => setDentitionType('child')}
              >
                Child (20)
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Layers:</label>
            <div className="layer-toggles">
              <label className="layer-checkbox">
                <input 
                  type="checkbox" 
                  checked={layerFilters.findings} 
                  onChange={(e) => setLayerFilters({...layerFilters, findings: e.target.checked})}
                />
                <span className="layer-swatch finding"></span>
                Findings
              </label>
              <label className="layer-checkbox">
                <input 
                  type="checkbox" 
                  checked={layerFilters.planned} 
                  onChange={(e) => setLayerFilters({...layerFilters, planned: e.target.checked})}
                />
                <span className="layer-swatch planned"></span>
                Planned
              </label>
              <label className="layer-checkbox">
                <input 
                  type="checkbox" 
                  checked={layerFilters.completed} 
                  onChange={(e) => setLayerFilters({...layerFilters, completed: e.target.checked})}
                />
                <span className="layer-swatch completed"></span>
                Completed
              </label>
            </div>
          </div>

          <div className="control-group export-buttons">
            <button className="btn btn-outline btn-sm" onClick={() => console.log('Export JSON')}>
              <Icon name="download" /> JSON
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => console.log('Export PDF')}>
              <Icon name="file-text" /> PDF
            </button>
          </div>
        </div>

        {/* Odontogram Chart */}
        <div className="odontogram-chart">
          {/* Upper Jaw */}
          <div className="jaw-section upper">
            <div className="jaw-label">Upper</div>
            <div className="quadrant-row">
              <div className="quadrant upper-right">
                <div className="quadrant-label">UR</div>
                <div className="teeth-row">
                  {teeth.upperRight.map(tooth => renderToothSVG(tooth, sampleToothData[tooth]))}
                </div>
              </div>
              <div className="midline"></div>
              <div className="quadrant upper-left">
                <div className="quadrant-label">UL</div>
                <div className="teeth-row">
                  {teeth.upperLeft.map(tooth => renderToothSVG(tooth, sampleToothData[tooth]))}
                </div>
              </div>
            </div>
          </div>

          {/* Lower Jaw */}
          <div className="jaw-section lower">
            <div className="quadrant-row">
              <div className="quadrant lower-right">
                <div className="quadrant-label">LR</div>
                <div className="teeth-row">
                  {teeth.lowerRight.map(tooth => renderToothSVG(tooth, sampleToothData[tooth]))}
                </div>
              </div>
              <div className="midline"></div>
              <div className="quadrant lower-left">
                <div className="quadrant-label">LL</div>
                <div className="teeth-row">
                  {teeth.lowerLeft.map(tooth => renderToothSVG(tooth, sampleToothData[tooth]))}
                </div>
              </div>
            </div>
            <div className="jaw-label">Lower</div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="chart-legend">
          <div className="legend-section">
            <div className="legend-title">Status</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-swatch finding"></span>
                <span>Finding</span>
              </div>
              <div className="legend-item">
                <span className="legend-swatch planned"></span>
                <span>Planned</span>
              </div>
              <div className="legend-item">
                <span className="legend-swatch completed"></span>
                <span>Completed</span>
              </div>
              <div className="legend-item">
                <span className="legend-swatch existing"></span>
                <span>Existing</span>
              </div>
            </div>
          </div>
          <div className="legend-section">
            <div className="legend-title">Source</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="source-badge ai">AI</span>
                <span>AI Detected</span>
              </div>
              <div className="legend-item">
                <span className="source-badge dr">Dr</span>
                <span>Dentist Added</span>
              </div>
            </div>
          </div>
          <div className="legend-section">
            <div className="legend-title">Urgency</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="urgency-indicator high"></span>
                <span>High</span>
              </div>
              <div className="legend-item">
                <span className="urgency-indicator medium"></span>
                <span>Medium</span>
              </div>
              <div className="legend-item">
                <span className="urgency-indicator low"></span>
                <span>Low</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      // ============== PATIENT DASHBOARD ==============
      case 'patient-dashboard':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Welcome, John</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Visits</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="calendar" />
                  </div>
                </div>
                <div className="stat-value">12</div>
                <div className="stat-change">Last visit: Nov 1, 2024</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Active Treatments</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">3</div>
                <div className="stat-change">2 high priority</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Next Appointment</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="clock" />
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>Dec 15</div>
                <div className="stat-change">2:30 PM - Dr. Johnson</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-24)' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Recent Activity</h3>
                </div>
                {renderTimeline()}
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Quick Actions</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                  <button className="btn btn--primary btn--full" onClick={() => setActiveView('patient-upload')}>
                    <Icon name="upload" />
                    Upload New Images
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('patient-treatment')}>
                    <Icon name="file-text" />
                    View Treatment Plan
                  </button>
                  <button className="btn btn--outline btn--full">
                    <Icon name="calendar" />
                    Schedule Appointment
                  </button>
                </div>
              </div>
            </div>
          </>
        );

      // ============== PATIENT RESULTS ==============
      case 'patient-results':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>My Results</h2>
            
            {patientResults.length > 0 ? (
              <div className="results-list">
                {patientResults.map(caseItem => (
                  <div className="result-card" key={caseItem.id}>
                    <div className="result-header">
                      <div className="result-info">
                        <h3 className="result-title">{caseItem.imageType} Analysis</h3>
                        <div className="result-meta">
                          Completed: {new Date(caseItem.sentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                      <span className="status-badge sent">Results Ready</span>
                    </div>
                    
                    <div className="result-summary">
                      <div className="summary-stat">
                        <span className="summary-number">{caseItem.finalFindings.length}</span>
                        <span className="summary-label">Findings</span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-number">{caseItem.finalFindings.filter(f => f.urgency === 'high').length}</span>
                        <span className="summary-label">High Priority</span>
                      </div>
                    </div>

                    {caseItem.patientExplanation && (
                      <div className="patient-explanation">
                        <h4>Your Dentist's Summary</h4>
                        <p>{caseItem.patientExplanation}</p>
                      </div>
                    )}

                    {caseItem.finalFindings.length > 0 && (
                      <div className="findings-summary">
                        <h4>Findings</h4>
                        {caseItem.finalFindings.map(finding => (
                          <div className="finding-item-patient" key={finding.id}>
                            <div className="finding-tooth">Tooth {finding.tooth}</div>
                            <div className="finding-condition">{finding.condition}</div>
                            <span className={`urgency-badge ${finding.urgency}`}>{finding.urgency}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {caseItem.recommendations && (
                      <div className="recommendations-section">
                        <h4>Recommendations</h4>
                        <ul>
                          {caseItem.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="result-actions">
                      <button className="btn btn--primary">
                        <Icon name="eye" /> View Full Report
                      </button>
                      <button className="btn btn--outline">
                        <Icon name="download" /> Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <Icon name="file-text" />
                  <h3>No Results Yet</h3>
                  <p>When your dentist completes their analysis and sends results, they will appear here.</p>
                </div>
              </div>
            )}
          </>
        );

      // ============== PATIENT UPLOAD ==============
      case 'patient-upload':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Upload Dental Images</h2>
            
            <div className="alert info">
              <Icon name="info" />
              <div>
                <strong>Preferred:</strong> Panoramic X-ray (OPG) for best AI analysis results.<br />
                <span style={{ color: 'var(--color-text-secondary)' }}>Also accepted: Bitewing, periapical, or intraoral photos. Formats: JPG, PNG. Max: 10MB.</span>
              </div>
            </div>

            <div className="card">
              <div className="image-type-selector" style={{ display: 'flex', gap: 'var(--space-12)', marginBottom: 'var(--space-16)', flexWrap: 'wrap' }}>
                <label className="image-type-option" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: 'var(--space-12)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', flex: 1, minWidth: '150px' }}>
                  <input type="radio" name="imageType" value="Panoramic X-ray" defaultChecked style={{ accentColor: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>Panoramic (OPG)</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Recommended</div>
                  </div>
                </label>
                <label className="image-type-option" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: 'var(--space-12)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', flex: 1, minWidth: '150px' }}>
                  <input type="radio" name="imageType" value="Bitewing X-ray" style={{ accentColor: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Bitewing</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Interproximal view</div>
                  </div>
                </label>
                <label className="image-type-option" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: 'var(--space-12)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', flex: 1, minWidth: '150px' }}>
                  <input type="radio" name="imageType" value="Periapical X-ray" style={{ accentColor: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Periapical</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Single tooth/root</div>
                  </div>
                </label>
                <label className="image-type-option" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: 'var(--space-12)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', flex: 1, minWidth: '150px' }}>
                  <input type="radio" name="imageType" value="Intraoral Photo" style={{ accentColor: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Intraoral Photo</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Clinical photo</div>
                  </div>
                </label>
              </div>
              
              <div id="upload-area" className="upload-area">
                <div className="upload-icon">
                  <Icon name="upload" />
                </div>
                <div className="upload-text">Drag and drop your dental images here</div>
                <div className="upload-hint">or click to browse files</div>
              </div>
            </div>
          </>
        );

      // ============== PATIENT HISTORY (Case Timeline) ==============
      case 'patient-history':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Case Timeline</h2>
            
            <div className="case-timeline">
              <div className="timeline-case-card">
                <div className="timeline-case-header">
                  <div className="timeline-case-icon sent-to-patient">
                    <Icon name="mail" />
                  </div>
                  <div className="timeline-case-info">
                    <h3>Periapical X-Ray</h3>
                    <div className="timeline-date">Uploaded: November 1, 2024</div>
                  </div>
                  <span className="status-badge sent-to-patient">RESULTS SENT</span>
                </div>
                <div className="timeline-case-body">
                  <p>1 finding detected. Reviewed by Dr. Johnson and sent to you.</p>
                  <button className="btn btn--sm btn--outline" onClick={() => setActiveView('patient-results')}>
                    <Icon name="eye" /> View Results
                  </button>
                </div>
              </div>

              <div className="timeline-case-card">
                <div className="timeline-case-header">
                  <div className="timeline-case-icon finalized">
                    <Icon name="file-text" />
                  </div>
                  <div className="timeline-case-info">
                    <h3>Bitewing X-Ray</h3>
                    <div className="timeline-date">Uploaded: December 15, 2024</div>
                  </div>
                  <span className="status-badge finalized">FINALIZED</span>
                </div>
                <div className="timeline-case-body">
                  <p>1 finding detected. Wisdom tooth assessment complete.</p>
                </div>
              </div>

              <div className="timeline-case-card">
                <div className="timeline-case-header">
                  <div className="timeline-case-icon needs-review">
                    <Icon name="clock" />
                  </div>
                  <div className="timeline-case-info">
                    <h3>Panoramic X-Ray</h3>
                    <div className="timeline-date">Uploaded: December 20, 2024</div>
                  </div>
                  <span className="status-badge needs-review">UNDER REVIEW</span>
                </div>
                <div className="timeline-case-body">
                  <p>AI analysis complete. Awaiting dentist review.</p>
                </div>
              </div>
            </div>
          </>
        );

      // ============== PATIENT TREATMENT ==============
      case 'patient-treatment':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Treatment Plan</h2>
            
            <div className="alert warning">
              <Icon name="alert-triangle" />
              You have 2 high-priority treatments recommended by your dentist.
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Affected Teeth</h3>
              </div>
              {renderClinicalOdontogram()}
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recommended Treatments</h3>
              </div>
              {renderTreatmentPlans()}
            </div>
          </>
        );

      default:
        return <p>View not found</p>;
    }
  };

  return (
    <DashboardLayout
      role="patient"
      userName="John Smith"
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default PatientDashboard;
