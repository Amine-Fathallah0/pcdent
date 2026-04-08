import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentScheduler from '../components/appointments/AppointmentScheduler';
import MessagingSystem from '../components/MessagingSystem';
import TreatmentPlanning from '../components/TreatmentPlanning';
import FullReportModal from '../components/FullReportModal';
import { Icon } from '../components/ui';
import { fetchJobs, fetchMyLinks, generateDraft, uploadCTScan, type AIJobDto } from '../lib/backendApi';
import { 
  database, 
  createCase,
  getCasesByPatient, 
  getPatientResults, 
  getAppointmentsByPatient,
  getUpcomingAppointments,
  addNotification,
  formatDate, 
  formatTime,
  getRelativeDate,
  getAppointmentTypeLabel,
  getStatusLabel,
  getStatusClass,
  type Case,
  type Appointment
} from '../data/database';
import './PatientDashboard.css';

// Current patient ID (would come from auth in real app)
const CURRENT_PATIENT_ID = 'patient-001';
const CURRENT_PATIENT_NAME = 'John Smith';

// File validation constants
const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/dicom'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// File validation helper
const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!VALID_FILE_TYPES.includes(file.type as typeof VALID_FILE_TYPES[number]) && 
      !file.name.toLowerCase().endsWith('.dcm')) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or DICOM files.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }
  return { valid: true };
};

const getBackendJobStatusLabel = (status: AIJobDto['status']): string => {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'segmentation_pending':
      return 'Segmentation Pending';
    case 'report_requested':
      return 'Report Requested';
    case 'draft_ready':
      return 'Draft Ready for Review';
    case 'dentist_reviewed':
      return 'Reviewed by Dentist';
    case 'finalized':
      return 'Finalized';
    case 'failed':
      return 'Processing Failed';
    default:
      return 'Unknown Status';
  }
};

const getBackendJobStatusClass = (status: AIJobDto['status']): string => {
  switch (status) {
    case 'queued':
    case 'segmentation_pending':
    case 'report_requested':
      return 'uploaded';
    case 'draft_ready':
    case 'failed':
      return 'needs-review';
    case 'dentist_reviewed':
    case 'finalized':
      return 'finalized';
    default:
      return 'uploaded';
  }
};

const PatientDashboard = () => {
  const [activeView, setActiveView] = useState('patient-dashboard');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(getAppointmentsByPatient(CURRENT_PATIENT_ID));
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Triggers backend data refresh after local updates
  const [backendJobs, setBackendJobs] = useState<AIJobDto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackendJobs = useCallback(async () => {
    try {
      const jobs = await fetchJobs();
      setBackendJobs(jobs);
    } catch (error) {
      console.error('Unable to load patient backend jobs', error);
    }
  }, []);

  useEffect(() => {
    void loadBackendJobs();
  }, [refreshKey, loadBackendJobs]);

  useEffect(() => {
    if (activeView !== 'patient-results') {
      return;
    }

    void loadBackendJobs();
    const intervalId = window.setInterval(() => {
      void loadBackendJobs();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeView, loadBackendJobs]);

  // Dynamic data reads on each render. setRefreshKey triggers re-render when mutated data changes.
  const patientCases = getCasesByPatient(CURRENT_PATIENT_ID);
  const patientResults = getPatientResults(CURRENT_PATIENT_ID);
  const { treatmentSuggestions } = database;
  const upcomingAppointments = getUpcomingAppointments(CURRENT_PATIENT_ID, 'patient');

  const jobsById = useMemo(() => {
    const map = new Map<string, AIJobDto>();
    for (const job of backendJobs) {
      map.set(job.job_id, job);
    }
    return map;
  }, [backendJobs]);

  const backendLinkedResults = useMemo(
    () =>
      [...patientCases]
        .filter((caseItem) => Boolean(caseItem.backendJobId))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [patientCases]
  );

  const displayResults = backendLinkedResults.length > 0 ? backendLinkedResults : patientResults;

  const resolvedResultCards = useMemo(
    () =>
      displayResults.map((caseItem) => {
        const matchedJob = caseItem.backendJobId ? jobsById.get(caseItem.backendJobId) : undefined;
        const statusLabel = matchedJob ? getBackendJobStatusLabel(matchedJob.status) : getStatusLabel(caseItem.status);
        const statusClass = matchedJob ? getBackendJobStatusClass(matchedJob.status) : getStatusClass(caseItem.status);
        const completedDate = matchedJob?.completed_at || caseItem.sentAt;
        const metaDate = completedDate || matchedJob?.updated_at || caseItem.finalizedAt || caseItem.uploadedAt;
        const metaLabel = completedDate ? 'Completed' : 'Last Updated';
        const isReady = matchedJob
          ? matchedJob.status === 'dentist_reviewed' || matchedJob.status === 'finalized'
          : caseItem.status === 'FINALIZED' || caseItem.status === 'SENT_TO_PATIENT';

        return {
          caseItem,
          statusLabel,
          statusClass,
          metaDate,
          metaLabel,
          isReady,
        };
      }),
    [displayResults, jobsById]
  );

  const readyResultsCount = useMemo(
    () => resolvedResultCards.filter((result) => result.isReady).length,
    [resolvedResultCards]
  );

  // Calculate stats with useMemo
  const { totalVisits, activeTreatments, highPriorityTreatments, lastVisitCase } = useMemo(() => ({
    totalVisits: patientCases.length,
    activeTreatments: treatmentSuggestions.length,
    highPriorityTreatments: treatmentSuggestions.filter(t => t.priority === 'High').length,
    lastVisitCase: patientCases.length > 0 
      ? patientCases.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
      : null
  }), [patientCases, treatmentSuggestions]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadedFile(file);
    setUploadStatus('idle');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Simulate upload and AI analysis
  const handleUpload = useCallback(async () => {
    if (!uploadedFile) return;

    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    // Wait for "upload" to complete
    await new Promise(resolve => setTimeout(resolve, 1500));
    clearInterval(uploadInterval);
    setUploadProgress(100);

    setUploadStatus('processing');

    try {
      const links = await fetchMyLinks();
      const currentUserId = localStorage.getItem('user_id');
      const myLink = links.find((link) => link.patient === currentUserId) || links[0];

      if (!myLink) {
        throw new Error('No active dentist link found.');
      }

      const uploaded = await uploadCTScan(
        myLink.id,
        uploadedFile,
        `Patient upload: ${uploadedFile.name}`
      );

      const currentPatientUser = Object.values(database.users).find(
        (user) => user.id === CURRENT_PATIENT_ID && user.role === 'patient'
      );
      const assignedDentistId =
        currentPatientUser && 'assignedDentist' in currentPatientUser
          ? currentPatientUser.assignedDentist
          : undefined;

      const createdCase = createCase(
        CURRENT_PATIENT_ID,
        CURRENT_PATIENT_NAME,
        currentPatientUser?.email || 'patient@email.com',
        assignedDentistId || 'dentist-001',
        null,
        {
          backendJobId: uploaded.job.job_id,
          ctScanId: uploaded.scan.id,
        }
      );

      createdCase.status = 'AI_ANALYZED';
      createdCase.aiAnalyzedAt = new Date().toISOString();

      await generateDraft(uploaded.job.job_id);

      setUploadStatus('complete');

      addNotification({
        userId: CURRENT_PATIENT_ID,
        userRole: 'patient',
        type: 'case',
        title: 'Image Uploaded Successfully',
        message: 'Your X-ray has been uploaded. Draft analysis is ready for dentist review.',
        actionUrl: 'patient-results'
      });

      setRefreshKey(prev => prev + 1);

      setTimeout(() => {
        setUploadedFile(null);
        setUploadPreview(null);
        setUploadProgress(0);
        setUploadStatus('idle');
        setActiveView('patient-results');
      }, 2000);
    } catch (error) {
      console.error(error);
      setUploadStatus('error');
    }
  }, [uploadedFile]);

  // Clear upload
  const clearUpload = useCallback(() => {
    setUploadedFile(null);
    setUploadPreview(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle View Full Report
  const handleViewFullReport = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setShowReportModal(true);
  };

  // Render Timeline from cases
  const renderTimeline = () => {
    if (backendJobs.length > 0) {
      const sortedJobs = [...backendJobs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

      return (
        <div className="timeline">
          {sortedJobs.map((job) => (
            <div className="timeline-item" key={job.job_id}>
              <div className="timeline-date">{formatDate(job.created_at)}</div>
              <div className="timeline-content">
                <div className="timeline-title">CT Scan #{job.ct_scan_id}</div>
                <div className="timeline-description">
                  {job.is_fallback_mode ? 'Fallback analysis pipeline' : 'Standard analysis pipeline'}
                </div>
                <span className="timeline-status">{getBackendJobStatusLabel(job.status)}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const sortedCases = [...patientCases].sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    ).slice(0, 3);

    return (
      <div className="timeline">
        {sortedCases.map((caseItem) => (
          <div className="timeline-item" key={caseItem.id}>
            <div className="timeline-date">
              {formatDate(caseItem.uploadedAt)}
            </div>
            <div className="timeline-content">
              <div className="timeline-title">{caseItem.imageType}</div>
              <div className="timeline-description">
                {caseItem.aiFindings.length} finding(s) detected
              </div>
              <span className="timeline-status">{getStatusLabel(caseItem.status)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Treatment Plans
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

  // Render Tooth SVG
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
          <polygon className={`tooth-surface surface-B ${getSurfaceClass('B')}`} points="10,10 40,10 35,18 15,18" />
          <polygon className={`tooth-surface surface-M ${getSurfaceClass('M')}`} points="10,10 15,18 15,32 10,40" />
          <polygon className={`tooth-surface surface-D ${getSurfaceClass('D')}`} points="40,10 40,40 35,32 35,18" />
          <polygon className={`tooth-surface surface-L ${getSurfaceClass('L')}`} points="10,40 15,32 35,32 40,40" />
          <polygon className={`tooth-surface surface-O ${getSurfaceClass('O')}`} points="15,18 35,18 35,32 15,32" />
          
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

  // Generate tooth data from cases
  const generateToothData = () => {
    const toothData: Record<number, { surfaces?: Record<string, string>, status?: string, aiDetected?: boolean }> = {};
    
    patientCases.forEach(caseItem => {
      caseItem.aiFindings.forEach(finding => {
        toothData[finding.tooth] = {
          surfaces: { O: 'finding' },
          aiDetected: true
        };
      });
      caseItem.finalFindings.forEach(finding => {
        if (finding.status === 'accepted') {
          toothData[finding.tooth] = {
            surfaces: { O: 'completed' },
            aiDetected: false
          };
        }
      });
    });
    
    return toothData;
  };

  const sampleToothData = generateToothData();

  // Render Clinical Odontogram
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

        <div className="odontogram-chart">
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
        </div>
      </div>
    );
  };

  // Kept for upcoming dedicated patient treatment/charting views.
  void renderTreatmentPlans;
  void renderClinicalOdontogram;

  const renderContent = () => {
    switch (activeView) {
      // ============== PATIENT DASHBOARD ==============
      case 'patient-dashboard':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>
              Welcome, {CURRENT_PATIENT_NAME.split(' ')[0]}
            </h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Visits</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="calendar" />
                  </div>
                </div>
                <div className="stat-value">{totalVisits}</div>
                <div className="stat-change">
                  Last visit: {lastVisitCase ? formatDate(lastVisitCase.uploadedAt) : 'N/A'}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Active Treatments</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">{activeTreatments}</div>
                <div className="stat-change">{highPriorityTreatments} high priority</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Results Ready</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="check-circle" />
                  </div>
                </div>
                <div className="stat-value">{readyResultsCount}</div>
                <div className="stat-change">{displayResults.length} total tracked</div>
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
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('patient-results')}>
                    <Icon name="eye" />
                    View Results
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('patient-appointments')}>
                    <Icon name="calendar" />
                    My Appointments
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('patient-treatment')}>
                    <Icon name="file-text" />
                    View Treatment Plan
                  </button>
                </div>

                {/* Upcoming Appointment Preview */}
                {upcomingAppointments.length > 0 && (
                  <div style={{ 
                    marginTop: 'var(--space-16)', 
                    padding: 'var(--space-12)', 
                    background: 'var(--color-bg-1)', 
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid #4F46E5'
                  }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#4F46E5', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                      NEXT APPOINTMENT
                    </div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
                      {getAppointmentTypeLabel(upcomingAppointments[0].type)}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {getRelativeDate(upcomingAppointments[0].date)} at {formatTime(upcomingAppointments[0].time)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      // ============== PATIENT RESULTS ==============
      case 'patient-results':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>My Results</h2>
            
            {resolvedResultCards.length > 0 ? (
              <div className="results-list">
                {resolvedResultCards.map(({ caseItem, statusLabel, statusClass, metaDate, metaLabel }) => {
                  return (
                  <div className="result-card card" key={caseItem.id} style={{ marginBottom: 'var(--space-16)' }}>
                    <div className="result-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-16)' }}>
                      <div className="result-info">
                        <h3 className="result-title" style={{ margin: 0 }}>{caseItem.imageType} Analysis</h3>
                        <div className="result-meta" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          {metaLabel}: {metaDate ? formatDate(metaDate) : 'N/A'}
                        </div>
                      </div>
                      <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                    </div>

                    
                    <div className="result-summary" style={{ display: 'flex', gap: 'var(--space-24)', marginBottom: 'var(--space-16)' }}>
                      <div className="summary-stat" style={{ textAlign: 'center' }}>
                        <span className="summary-number" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                          {caseItem.finalFindings.length}
                        </span>
                        <span className="summary-label" style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Findings</span>
                      </div>
                      <div className="summary-stat" style={{ textAlign: 'center' }}>
                        <span className="summary-number" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#EF4444' }}>
                          {caseItem.finalFindings.filter(f => f.urgency === 'high').length}
                        </span>
                        <span className="summary-label" style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>High Priority</span>
                      </div>
                    </div>

                    {caseItem.patientExplanation && (
                      <div className="patient-explanation" style={{ 
                        background: 'var(--color-bg-1)', 
                        padding: 'var(--space-16)', 
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-16)',
                        borderLeft: '4px solid var(--color-primary)'
                      }}>
                        <h4 style={{ margin: '0 0 var(--space-8) 0' }}>Your Dentist's Summary</h4>
                        <p style={{ margin: 0 }}>{caseItem.patientExplanation}</p>
                      </div>
                    )}

                    {caseItem.finalFindings.length > 0 && (
                      <div className="findings-summary" style={{ marginBottom: 'var(--space-16)' }}>
                        <h4 style={{ margin: '0 0 var(--space-12) 0' }}>Findings</h4>
                        {caseItem.finalFindings.map(finding => (
                          <div className="finding-item-patient" key={finding.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-12)',
                            padding: 'var(--space-8)',
                            background: 'var(--color-bg-1)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: 'var(--space-8)'
                          }}>
                            <div className="finding-tooth" style={{ 
                              fontWeight: 'var(--font-weight-bold)',
                              background: 'var(--color-bg-2)',
                              padding: 'var(--space-4) var(--space-8)',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              Tooth {finding.tooth}
                            </div>
                            <div className="finding-condition" style={{ flex: 1 }}>{finding.condition}</div>
                            <span className={`urgency-badge ${finding.urgency}`} style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 'var(--font-weight-semibold)',
                              textTransform: 'uppercase',
                              background: finding.urgency === 'high' ? '#FEE2E2' : finding.urgency === 'medium' ? '#FEF3C7' : '#D1FAE5',
                              color: finding.urgency === 'high' ? '#B91C1C' : finding.urgency === 'medium' ? '#B45309' : '#047857'
                            }}>
                              {finding.urgency}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {caseItem.report?.recommendations && (
                      <div className="recommendations-section" style={{ marginBottom: 'var(--space-16)' }}>
                        <h4 style={{ margin: '0 0 var(--space-8) 0' }}>Recommendations</h4>
                        <ul style={{ margin: 0, paddingLeft: 'var(--space-20)' }}>
                          {caseItem.report.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="result-actions" style={{ display: 'flex', gap: 'var(--space-12)' }}>
                      <button className="btn btn--primary" onClick={() => handleViewFullReport(caseItem)}>
                        <Icon name="eye" /> View Full Report
                      </button>
                      <button className="btn btn--outline" onClick={() => window.print()}>
                        <Icon name="download" /> Download PDF
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
                  <Icon name="file-text" />
                  <h3>No Results Yet</h3>
                  <p>When your dentist completes their analysis and sends results, they will appear here.</p>
                </div>
              </div>
            )}
          </>
        );

      // ============== PATIENT UPLOAD (Panoramic Only) ==============
      case 'patient-upload':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Upload Dental Images</h2>
            
            <div className="alert info" style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 'var(--space-12)', 
              padding: 'var(--space-16)', 
              background: 'var(--color-bg-1)', 
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-24)',
              borderLeft: '4px solid var(--color-primary)'
            }}>
              <Icon name="info" />
              <div>
                <strong>Accepted Image Type:</strong> Panoramic X-ray (OPG) only<br />
                <span style={{ color: 'var(--color-text-secondary)' }}>This provides the best AI analysis results. Formats: JPG, PNG, DICOM. Max: 10MB.</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Upload Panoramic X-Ray (OPG)</h3>
              </div>
              
              <div className="image-type-info" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-12)', 
                padding: 'var(--space-16)', 
                background: 'var(--color-bg-1)', 
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-16)'
              }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'var(--color-primary)', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Icon name="tooth" />
                </div>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>Panoramic X-Ray (OPG)</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Full mouth view • Best for comprehensive AI analysis
                  </div>
                </div>
              </div>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleInputChange}
                accept="image/jpeg,image/png,image/jpg,.dcm"
                style={{ display: 'none' }}
              />

              {/* Upload Status Messages */}
              {uploadStatus === 'complete' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-12)',
                  padding: 'var(--space-16)',
                  background: '#D1FAE5',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-16)',
                  color: '#047857'
                }}>
                  <Icon name="check-circle" />
                  <div>
                    <strong>Upload Complete!</strong> Your image has been analyzed. Redirecting to results...
                  </div>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-12)',
                  padding: 'var(--space-16)',
                  background: '#FEE2E2',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-16)',
                  color: '#B91C1C'
                }}>
                  <Icon name="alert-triangle" />
                  <div>
                    <strong>Upload Failed!</strong> Please try again.
                  </div>
                </div>
              )}

              {/* Upload Area or Preview */}
              {!uploadedFile ? (
                <div 
                  className={`upload-area ${isDragging ? 'dragging' : ''}`}
                  style={{
                    border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-48)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="upload-icon" style={{ marginBottom: 'var(--space-16)', color: isDragging ? 'var(--color-primary)' : 'inherit' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div className="upload-text" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                    {isDragging ? 'Drop your file here' : 'Drag and drop your Panoramic X-ray here'}
                  </div>
                  <div className="upload-hint" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-16)' }}>
                    or click to browse files
                  </div>
                  <button className="btn btn--outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Browse Files
                  </button>
                </div>
              ) : (
                <div className="upload-preview" style={{ marginBottom: 'var(--space-16)' }}>
                  {/* Preview Card */}
                  <div style={{
                    display: 'flex',
                    gap: 'var(--space-20)',
                    padding: 'var(--space-16)',
                    background: 'var(--color-bg-1)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-16)'
                  }}>
                    {/* Image Preview */}
                    <div style={{
                      width: '200px',
                      height: '150px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      background: '#000',
                      flexShrink: 0
                    }}>
                      {uploadPreview && (
                        <img 
                          src={uploadPreview} 
                          alt="Preview" 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain' 
                          }} 
                        />
                      )}
                    </div>
                    
                    {/* File Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-8)' }}>
                        {uploadedFile.name}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-12)' }}>
                        Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Type: {uploadedFile.type || 'DICOM'}
                      </div>
                      
                      {/* Progress Bar */}
                      {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                        <div style={{ marginBottom: 'var(--space-12)' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginBottom: 'var(--space-4)',
                            fontSize: 'var(--font-size-sm)'
                          }}>
                            <span>{uploadStatus === 'uploading' ? 'Uploading...' : 'AI Analysis in progress...'}</span>
                            <span>{uploadStatus === 'uploading' ? `${uploadProgress}%` : ''}</span>
                          </div>
                          <div style={{
                            height: '8px',
                            background: 'var(--color-border)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: uploadStatus === 'processing' ? '100%' : `${uploadProgress}%`,
                              background: uploadStatus === 'processing' 
                                ? 'linear-gradient(90deg, var(--color-primary) 0%, transparent 50%, var(--color-primary) 100%)' 
                                : 'var(--color-primary)',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease',
                              animation: uploadStatus === 'processing' ? 'shimmer 1.5s infinite' : 'none'
                            }}></div>
                          </div>
                          {uploadStatus === 'processing' && (
                            <div style={{ 
                              fontSize: 'var(--font-size-xs)', 
                              color: 'var(--color-text-secondary)', 
                              marginTop: 'var(--space-4)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-8)'
                            }}>
                              <span className="spinner" style={{
                                width: '12px',
                                height: '12px',
                                border: '2px solid var(--color-border)',
                                borderTopColor: 'var(--color-primary)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></span>
                              Detecting dental conditions using AI...
                            </div>
                          )}
                        </div>
                      )}
                      
                      {uploadStatus === 'idle' && (
                        <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
                            background: '#D1FAE5',
                            color: '#047857',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)'
                          }}>
                            <Icon name="check-circle" /> Ready to upload
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
                    {uploadStatus === 'idle' && (
                      <>
                        <button 
                          className="btn btn--primary" 
                          onClick={handleUpload}
                          style={{ flex: 1 }}
                        >
                          <Icon name="upload" /> Upload & Analyze
                        </button>
                        <button 
                          className="btn btn--outline" 
                          onClick={clearUpload}
                        >
                          <Icon name="x" /> Cancel
                        </button>
                      </>
                    )}
                    {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                      <button className="btn btn--outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                        Processing...
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Upload Tips */}
              <div style={{ 
                marginTop: 'var(--space-24)', 
                padding: 'var(--space-16)', 
                background: 'var(--color-bg-1)', 
                borderRadius: 'var(--radius-md)' 
              }}>
                <h4 style={{ margin: '0 0 var(--space-12) 0' }}>Tips for Best Results</h4>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-20)', color: 'var(--color-text-secondary)' }}>
                  <li>Use high-quality panoramic X-ray images</li>
                  <li>Ensure the image is properly oriented (not rotated)</li>
                  <li>Avoid blurry or low-contrast images</li>
                  <li>DICOM format provides the best diagnostic quality</li>
                </ul>
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
              {patientCases
                .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                .map(caseItem => {
                  const getStatusIcon = () => {
                    switch (caseItem.status) {
                      case 'SENT_TO_PATIENT': return 'mail';
                      case 'FINALIZED': return 'check-circle';
                      case 'NEEDS_REVIEW': return 'clock';
                      case 'AI_ANALYZED': return 'activity';
                      default: return 'upload';
                    }
                  };

                  const getStatusDescription = () => {
                    switch (caseItem.status) {
                      case 'SENT_TO_PATIENT': 
                        return `${caseItem.finalFindings.length} finding(s) detected. Reviewed by Dr. Johnson and sent to you.`;
                      case 'FINALIZED': 
                        return `${caseItem.finalFindings.length} finding(s) detected. Review complete.`;
                      case 'NEEDS_REVIEW': 
                        return `${caseItem.aiFindings.length} finding(s) detected by AI. Awaiting dentist review.`;
                      case 'AI_ANALYZED': 
                        return `${caseItem.aiFindings.length} finding(s) detected by AI. Ready for review.`;
                      default: 
                        return 'Uploaded and processing.';
                    }
                  };

                  return (
                    <div className="timeline-case-card card" key={caseItem.id} style={{ marginBottom: 'var(--space-16)' }}>
                      <div className="timeline-case-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-16)', marginBottom: 'var(--space-12)' }}>
                        <div className={`timeline-case-icon ${getStatusClass(caseItem.status)}`} style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: caseItem.status === 'SENT_TO_PATIENT' ? '#D1FAE5' : 
                                     caseItem.status === 'FINALIZED' ? '#DBEAFE' : 
                                     caseItem.status === 'NEEDS_REVIEW' ? '#FEF3C7' : '#E5E7EB',
                          color: caseItem.status === 'SENT_TO_PATIENT' ? '#047857' : 
                                 caseItem.status === 'FINALIZED' ? '#1D4ED8' : 
                                 caseItem.status === 'NEEDS_REVIEW' ? '#B45309' : '#374151'
                        }}>
                          <Icon name={getStatusIcon()} />
                        </div>
                        <div className="timeline-case-info" style={{ flex: 1 }}>
                          <h3 style={{ margin: 0 }}>{caseItem.imageType}</h3>
                          <div className="timeline-date" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Uploaded: {formatDate(caseItem.uploadedAt)}
                          </div>
                        </div>
                        <span className={`status-badge ${getStatusClass(caseItem.status)}`} style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                          textTransform: 'uppercase'
                        }}>
                          {getStatusLabel(caseItem.status)}
                        </span>
                      </div>
                      <div className="timeline-case-body">
                        <p style={{ margin: '0 0 var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                          {getStatusDescription()}
                        </p>
                        {caseItem.status === 'SENT_TO_PATIENT' && (
                          <button className="btn btn--sm btn--primary" onClick={() => handleViewFullReport(caseItem)}>
                            <Icon name="eye" /> View Results
                          </button>
                        )}
                        {caseItem.status === 'FINALIZED' && (
                          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <Icon name="clock" /> Awaiting delivery to patient
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        );

      // ============== PATIENT TREATMENT ==============
      case 'patient-treatment':
        return (
          <TreatmentPlanning
            userId={CURRENT_PATIENT_ID}
            userName={CURRENT_PATIENT_NAME}
            userRole="patient"
          />
        );

      // ============== PATIENT MESSAGES ==============
      case 'patient-messages':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Messages</h2>
            <MessagingSystem
              userId={CURRENT_PATIENT_ID}
              userName={CURRENT_PATIENT_NAME}
              userRole="patient"
            />
          </>
        );

      // ============== PATIENT APPOINTMENTS ==============
      case 'patient-appointments':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>My Appointments</h2>
            
            {/* Next Appointment Highlight */}
            {upcomingAppointments.length > 0 && (
              <div className="card" style={{ 
                marginBottom: 'var(--space-24)',
                background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                border: '1px solid #C7D2FE'
              }}>
                <div className="card-body" style={{ padding: 'var(--space-20)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: 'var(--radius-lg)',
                      background: '#4F46E5',
                      color: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                        {new Date(upcomingAppointments[0].date + 'T00:00:00').getDate()}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
                        {new Date(upcomingAppointments[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: '#4F46E5', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                        NEXT APPOINTMENT
                      </div>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                        {getAppointmentTypeLabel(upcomingAppointments[0].type)} with {upcomingAppointments[0].dentistName}
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
                        <span>{getRelativeDate(upcomingAppointments[0].date)}</span>
                        <span>•</span>
                        <span>{formatTime(upcomingAppointments[0].time)}</span>
                        <span>•</span>
                        <span>{upcomingAppointments[0].duration} min</span>
                      </div>
                    </div>
                    <button className="btn btn--primary" onClick={() => setShowScheduler(true)}>
                      <Icon name="calendar" />
                      Schedule New
                    </button>
                  </div>
                </div>
              </div>
            )}

            <AppointmentList
              appointments={appointments}
              userRole="patient"
              onRefresh={() => setAppointments(getAppointmentsByPatient(CURRENT_PATIENT_ID))}
              onScheduleNew={() => setShowScheduler(true)}
            />
          </>
        );

      default:
        return <p>View not found</p>;
    }
  };

  return (
    <DashboardLayout
      role="patient"
      userName={CURRENT_PATIENT_NAME}
      userId={CURRENT_PATIENT_ID}
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {renderContent()}
      
      {/* Full Report Modal */}
      {showReportModal && selectedCase && (
        <FullReportModal 
          caseData={selectedCase} 
          onClose={() => {
            setShowReportModal(false);
            setSelectedCase(null);
          }} 
        />
      )}

      {/* Appointment Scheduler Modal */}
      {showScheduler && (
        <AppointmentScheduler
          userId={CURRENT_PATIENT_ID}
          userRole="patient"
          dentistId="dentist-001"
          onClose={() => setShowScheduler(false)}
          onSuccess={(appointment) => {
            setAppointments([...appointments, appointment]);
            setShowScheduler(false);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
