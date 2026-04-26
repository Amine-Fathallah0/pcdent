import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentScheduler from '../components/appointments/AppointmentScheduler';
import MessagingSystem from '../components/MessagingSystem';
import TreatmentPlanning from '../components/TreatmentPlanning';
import FullReportModal from '../components/FullReportModal';
import TextType from '../components/ui/TextType';
import AnimatedList from '../components/ui/AnimatedList';
import { Icon } from '../components/ui';
import { fetchJobs, fetchMyLinks, generateDraft, requestDentistLink, uploadCTScan, type AIJobDto } from '../lib/backendApi';
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

const getRecentActivityTone = (label: string): 'success' | 'warning' | 'info' => {
  const value = label.toLowerCase();

  if (value.includes('failed') || value.includes('review')) {
    return 'warning';
  }

  if (value.includes('finalized') || value.includes('reviewed') || value.includes('sent')) {
    return 'success';
  }

  return 'info';
};

interface DashboardActionButtonProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

const DashboardActionButton = ({ icon, title, description, onClick }: DashboardActionButtonProps) => (
  <button className="patient-action-btn" onClick={onClick}>
    <span className="patient-action-btn__icon" aria-hidden="true">
      <Icon name={icon} />
    </span>
    <span className="patient-action-btn__content">
      <span className="patient-action-btn__title">{title}</span>
      <span className="patient-action-btn__desc">{description}</span>
    </span>
    <Icon name="chevron-right" size={16} />
  </button>
);

const PatientDashboard = () => {
  const { user } = useAuth();
  const CURRENT_PATIENT_ID = user?.id ?? '';
  const CURRENT_PATIENT_NAME = user?.name ?? '';

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

  // Connect-to-dentist state
  const [connectCode, setConnectCode] = useState('');
  const [connectStatus, setConnectStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [connectMessage, setConnectMessage] = useState('');

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
      ? [...patientCases].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
      : null
  }), [patientCases, treatmentSuggestions]);

  const lastVisitLabel = useMemo(() => {
    if (!lastVisitCase) {
      return 'No visits recorded yet';
    }

    return `Last visit on ${new Date(lastVisitCase.uploadedAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }, [lastVisitCase]);

  const nextAppointment = upcomingAppointments[0] ?? null;

  const remindMeItems = useMemo(() => {
    const items: Array<{ id: string; icon: string; title: string; meta: string; done?: boolean; actionView?: string }> = [];

    if (nextAppointment) {
      items.push({
        id: 'next-visit',
        icon: 'calendar',
        title: `Upcoming ${getAppointmentTypeLabel(nextAppointment.type)}`,
        meta: `${getRelativeDate(nextAppointment.date)} at ${formatTime(nextAppointment.time)}`,
        actionView: 'patient-appointments',
      });
    }

    items.push({
      id: 'records',
      icon: 'file-text',
      title: `${readyResultsCount} result${readyResultsCount === 1 ? '' : 's'} ready to read`,
      meta: readyResultsCount > 0 ? 'Open Records to view your latest update' : 'No new result shared yet',
      done: readyResultsCount === 0,
      actionView: 'patient-results',
    });

    items.push({
      id: 'messages',
      icon: 'message-circle',
      title: 'Check in with your dentist',
      meta: 'Use Chat for quick questions before your next visit',
      actionView: 'patient-messages',
    });

    return items;
  }, [nextAppointment, readyResultsCount]);

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

  const recentActivityEntries = useMemo(() => {
    if (backendJobs.length > 0) {
      return [...backendJobs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6)
        .map((job) => ({
          id: job.job_id,
          date: formatDate(job.created_at),
          title: `CT Scan #${job.ct_scan_id}`,
          description: job.is_fallback_mode ? 'Fallback analysis pipeline' : 'Standard analysis pipeline',
          status: getBackendJobStatusLabel(job.status),
        }));
    }

    return [...patientCases]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 6)
      .map((caseItem) => ({
        id: caseItem.id,
        date: formatDate(caseItem.uploadedAt),
        title: caseItem.imageType,
        description: `${caseItem.aiFindings.length} finding(s) detected`,
        status: getStatusLabel(caseItem.status),
      }));
  }, [backendJobs, patientCases]);

  const recentActivityItems = useMemo(
    () => recentActivityEntries.map((entry) => `${entry.date} - ${entry.title}`),
    [recentActivityEntries]
  );

  const handleConnectRequest = async () => {
    const code = connectCode.trim().toUpperCase();
    if (!code) return;
    setConnectStatus('loading');
    setConnectMessage('');
    try {
      await requestDentistLink(code);
      setConnectStatus('success');
      setConnectMessage('Request sent! Your dentist will approve the connection.');
      setConnectCode('');
    } catch (error: unknown) {
      setConnectStatus('error');
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setConnectMessage(detail ?? 'Failed to send request. Check the code and try again.');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      // ============== PATIENT DASHBOARD ==============
      case 'patient-dashboard':
        return (
          <section className="patient-home">

            {/* Hero greeting */}
            <div className="patient-home__greeting-wrap">
              <TextType
                as="h2"
                className="patient-home__greeting"
                text={`Welcome back, ${CURRENT_PATIENT_NAME.split(' ')[0]}`}
                typingSpeed={38}
                initialDelay={120}
                loop={false}
                startOnVisible
              />
              <p className="patient-home__subtext">
                Here's an overview of your dental care and upcoming schedule.
              </p>
            </div>

            {/* Top row: Quick Actions (left) + Compact Metrics (right) */}
            <div className="patient-home__top-row">

              {/* Quick Actions */}
              <article className="card patient-main-card">
                <div className="patient-main-card__head">
                  <h3>Quick actions</h3>
                </div>
                <div className="patient-actions-grid">
                  <DashboardActionButton
                    icon="upload"
                    title="Upload Scan"
                    description="Send your latest panoramic image"
                    onClick={() => setActiveView('patient-upload')}
                  />
                  <DashboardActionButton
                    icon="file-text"
                    title="Open Records"
                    description="Read your recent results"
                    onClick={() => setActiveView('patient-results')}
                  />
                  <DashboardActionButton
                    icon="message-circle"
                    title="Message Dentist"
                    description="Ask a question in chat"
                    onClick={() => setActiveView('patient-messages')}
                  />
                  <DashboardActionButton
                    icon="clock"
                    title="See Calendar"
                    description="Track your care timeline"
                    onClick={() => setActiveView('patient-history')}
                  />
                </div>
              </article>

              {/* Compact Care Snapshot */}
              <article className="card patient-metrics-summary">
                <div className="patient-main-card__head">
                  <h3>Care snapshot</h3>
                </div>
                <ul className="patient-metrics-summary__list">
                  <li className="patient-metrics-summary__item">
                    <div className="patient-metrics-summary__icon patient-metrics-summary__icon--blue" aria-hidden="true">
                      <Icon name="calendar" size={16} />
                    </div>
                    <div className="patient-metrics-summary__body">
                      <span className="patient-metrics-summary__label">Total Visits</span>
                      <span className="patient-metrics-summary__meta">{lastVisitLabel}</span>
                    </div>
                    <span className="patient-metrics-summary__value">{totalVisits}</span>
                  </li>
                  <li className="patient-metrics-summary__item">
                    <div className="patient-metrics-summary__icon patient-metrics-summary__icon--orange" aria-hidden="true">
                      <Icon name="activity" size={16} />
                    </div>
                    <div className="patient-metrics-summary__body">
                      <span className="patient-metrics-summary__label">Active Treatments</span>
                      <span className="patient-metrics-summary__meta">
                        {highPriorityTreatments > 0 ? `${highPriorityTreatments} high priority` : 'No high priority items'}
                      </span>
                    </div>
                    <span className="patient-metrics-summary__value">{activeTreatments}</span>
                  </li>
                  <li className="patient-metrics-summary__item">
                    <div className="patient-metrics-summary__icon patient-metrics-summary__icon--teal" aria-hidden="true">
                      <Icon name="check-circle" size={16} />
                    </div>
                    <div className="patient-metrics-summary__body">
                      <span className="patient-metrics-summary__label">Records Ready</span>
                      <span className="patient-metrics-summary__meta">{displayResults.length} total records</span>
                    </div>
                    <span className="patient-metrics-summary__value">{readyResultsCount}</span>
                  </li>
                </ul>
              </article>
            </div>

            {/* Main layout: content + sidebar */}
            <div className="patient-home__layout">
              <div className="patient-home__main">

                {/* Next Appointment — compact */}
                <article className="card patient-main-card patient-main-card--compact patient-main-card--focus">
                  <div className="patient-main-card__head">
                    <h3>Next appointment</h3>
                    <button className="btn btn--outline btn--sm" onClick={() => setActiveView('patient-appointments')}>
                      View all
                    </button>
                  </div>
                  {nextAppointment ? (
                    <div className="patient-next-appointment">
                      <div className="patient-next-appointment__badge">
                        <Icon name="calendar" />
                      </div>
                      <div>
                        <p className="patient-next-appointment__title">
                          {getAppointmentTypeLabel(nextAppointment.type)} with {nextAppointment.dentistName}
                        </p>
                        <p className="patient-next-appointment__meta">
                          {getRelativeDate(nextAppointment.date)} at {formatTime(nextAppointment.time)} · {nextAppointment.duration} min
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="patient-empty-copy">No upcoming appointment yet. Book one in under a minute.</p>
                  )}
                  <button className="btn btn--primary btn--sm" onClick={() => setShowScheduler(true)}>
                    <Icon name="plus" />
                    Book Appointment
                  </button>
                </article>

                {/* Recent Activity */}
                <article className="card patient-main-card">
                  <div className="patient-main-card__head">
                    <h3>Recent activity</h3>
                  </div>
                  {recentActivityEntries.length > 0 ? (
                    <AnimatedList
                      items={recentActivityItems}
                      className="patient-activity-list"
                      itemClassName="patient-activity-list__item"
                      showGradients
                      enableArrowNavigation
                      displayScrollbar
                      initialSelectedIndex={0}
                      renderItem={(_, index, isSelected) => {
                        const entry = recentActivityEntries[index];
                        if (!entry) return null;
                        return (
                          <div className={`patient-activity-entry ${isSelected ? 'is-selected' : ''}`}>
                            <div className="patient-activity-entry__main">
                              <p className="patient-activity-entry__title">{entry.title}</p>
                              <p className="patient-activity-entry__desc">{entry.description}</p>
                            </div>
                            <div className="patient-activity-entry__meta">
                              <p className="patient-activity-entry__date">{entry.date}</p>
                              <span className={`patient-activity-entry__status activity-pill--${getRecentActivityTone(entry.status)}`}>
                                {entry.status}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  ) : (
                    <p className="patient-empty-copy">No recent activity yet.</p>
                  )}
                </article>
              </div>

              {/* Right sidebar — Care Team only */}
              <aside className="patient-home__right">
                <article className="card patient-right-card">
                  <h3 className="patient-right-card__title">My care team</h3>
                  <div className="patient-care-card">
                    <div className="patient-care-card__avatar" aria-hidden="true">
                      <Icon name="users" size={18} />
                    </div>
                    <div>
                      <p className="patient-care-card__title">Primary Dentist</p>
                      <p className="patient-care-card__meta">
                        {nextAppointment?.dentistName || 'Assigned doctor'}
                      </p>
                    </div>
                  </div>
                  <button className="btn btn--outline btn--sm btn--full" onClick={() => setActiveView('patient-messages')}>
                    <Icon name="message-circle" />
                    Open Chat
                  </button>
                </article>

                <article className="card patient-right-card" style={{ marginTop: 'var(--space-16)' }}>
                  <h3 className="patient-right-card__title">Connect to a dentist</h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-12)' }}>
                    Ask your dentist for their <strong>DR-XXXX</strong> code and enter it below.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="DR-XXXX"
                      value={connectCode}
                      maxLength={7}
                      onChange={e => { setConnectCode(e.target.value.toUpperCase()); setConnectStatus('idle'); setConnectMessage(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') void handleConnectRequest(); }}
                      style={{ fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}
                    />
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => void handleConnectRequest()}
                      disabled={connectStatus === 'loading' || !connectCode.trim()}
                    >
                      {connectStatus === 'loading' ? '…' : 'Send'}
                    </button>
                  </div>
                  {connectMessage && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: connectStatus === 'success' ? '#10B981' : '#EF4444', marginTop: 'var(--space-4)' }}>
                      {connectMessage}
                    </p>
                  )}
                </article>
              </aside>
            </div>
          </section>
        );

      // ============== PATIENT RESULTS ==============
      case 'patient-results':
        return (
          <>
            <h2 className="patient-view-title">My Results</h2>
            
            {resolvedResultCards.length > 0 ? (
              <div className="results-list">
                {resolvedResultCards.map(({ caseItem, statusLabel, statusClass, metaDate, metaLabel }) => {
                  return (
                  <div className="result-card result-card--patient card" key={caseItem.id}>
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
                            <span className={`urgency-badge urgency-badge--${finding.urgency}`}>
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
            <h2 className="patient-view-title">Upload Dental Images</h2>
            
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
                <div className="upload-feedback upload-feedback--success">
                  <Icon name="check-circle" />
                  <div>
                    <strong>Upload Complete!</strong> Your image has been analyzed. Redirecting to results...
                  </div>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="upload-feedback upload-feedback--error">
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
                          <span className="upload-ready-pill" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
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
            <h2 className="patient-view-title">Care Calendar</h2>
            
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
                    <div className="timeline-case-card timeline-case-card--patient card" key={caseItem.id}>
                      <div className="timeline-case-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-16)', marginBottom: 'var(--space-12)' }}>
                        <div
                          className={`timeline-case-icon timeline-case-icon--patient ${
                            caseItem.status === 'SENT_TO_PATIENT'
                              ? 'timeline-case-icon--sent'
                              : caseItem.status === 'FINALIZED'
                                ? 'timeline-case-icon--finalized'
                                : caseItem.status === 'NEEDS_REVIEW'
                                  ? 'timeline-case-icon--review'
                                  : 'timeline-case-icon--default'
                          }`}
                        >
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
            <h2 className="patient-view-title">Messages</h2>
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
            <h2 className="patient-view-title">My Appointments</h2>
            
            {/* Next Appointment Highlight */}
            {upcomingAppointments.length > 0 && (
              <div className="card patient-appointment-highlight">
                <div className="card-body" style={{ padding: 'var(--space-20)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
                    <div className="patient-appointment-highlight__date-box">
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                        {new Date(upcomingAppointments[0].date + 'T00:00:00').getDate()}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
                        {new Date(upcomingAppointments[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="patient-appointment-highlight__label" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
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
      reminderItems={remindMeItems}
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
