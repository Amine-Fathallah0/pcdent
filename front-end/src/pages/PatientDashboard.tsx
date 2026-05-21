import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentScheduler from '../components/appointments/AppointmentScheduler';
import PendingRequestsWidget from '../components/appointments/PendingRequestsWidget';
import MessagingSystem from '../components/MessagingSystem';
import TreatmentPlanning from '../components/TreatmentPlanning';
import FullReportModal from '../components/FullReportModal';
import PatientCaseDetailView from '../components/PatientCaseDetailView';
import TextType from '../components/ui/TextType';
import AnimatedList from '../components/ui/AnimatedList';
import { Icon } from '../components/ui';
import { acceptAppointment, cancelAppointment, counterProposeAppointment, createAppointment, declineAppointment, fetchAppointments, fetchJob, fetchJobs, fetchMyLinks, requestDentistLink, uploadCTScan, type AIJobDto, type AppointmentDto, type NotificationDto } from '../lib/backendApi';
import { parseBackendDateTime } from '../lib/dateTime';
import { getBackendJobStatusLabel, getBackendJobStatusClass } from '../lib/jobUtils';
import {
  database,
  createCase,
  getCasesByPatient,
  getPatientResults,
  addNotification,
  formatDate,
  formatTime,
  getRelativeDate,
  getAppointmentTypeLabel,
  getStatusLabel,
  getStatusClass,
  type Case,
  type Appointment,
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

const formatLocalDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalTime = (value: Date): string => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const mapAppointmentStatus = (status: AppointmentDto['status']): Appointment['status'] => {
  if (status === 'no_show') return 'no-show';
  return status;
};

const mapAppointmentDtoToUi = (appointment: AppointmentDto): Appointment => {
  const dateValue = parseBackendDateTime(appointment.appointment_date);
  return {
    id: String(appointment.id),
    patientId: appointment.patient.user.user_id,
    patientName: appointment.patient.user.full_name,
    patientEmail: appointment.patient.user.email,
    dentistId: appointment.dentist.user.user_id,
    dentistName: appointment.dentist.user.full_name,
    date: formatLocalDate(dateValue),
    time: formatLocalTime(dateValue),
    duration: appointment.duration ?? 30,
    type: appointment.appointment_type || 'consultation',
    status: mapAppointmentStatus(appointment.status),
    notes: appointment.notes || null,
    createdAt: appointment.created_at,
  };
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
  const [selectedJob, setSelectedJob] = useState<AIJobDto | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentDtos, setAppointmentDtos] = useState<AppointmentDto[]>([]);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Triggers backend data refresh after local updates
  const [backendJobs, setBackendJobs] = useState<AIJobDto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appointmentsRequestId = useRef(0);
  const appointmentsRefreshTimer = useRef<number | null>(null);

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

  const loadAppointments = useCallback(async () => {
    const requestId = ++appointmentsRequestId.current;
    try {
      const items = await fetchAppointments();
      if (requestId !== appointmentsRequestId.current) {
        return;
      }
      setAppointmentDtos(items);
      setAppointments(items.map(mapAppointmentDtoToUi));
    } catch (error) {
      if (requestId !== appointmentsRequestId.current) {
        return;
      }
      console.error('Unable to load appointments', error);
    }
  }, []);

  const handleAppointmentNotification = useCallback((notification: NotificationDto) => {
    if (!notification.notification_type.startsWith('appointment_')) return;
    void loadAppointments();
    const detail = notification.appointment_detail ?? null;
    const summary = notification.appointment_summary;
    if (detail) {
      setAppointmentDtos((prev) => {
        const next = prev.some((item) => item.id === detail.id)
          ? prev.map((item) => (item.id === detail.id ? detail : item))
          : [detail, ...prev];
        return next;
      });

      const mapped = mapAppointmentDtoToUi(detail);
      setAppointments((prev) => {
        const next = prev.some((item) => item.id === String(detail.id))
          ? prev.map((item) => (item.id === String(detail.id) ? mapped : item))
          : [mapped, ...prev];
        return next;
      });
    }
    if (summary) {
      setAppointmentDtos((prev) => {
        let updated = false;
        const next = prev.map((item) => {
          if (item.id !== summary.id) return item;
          updated = true;
          return {
            ...item,
            appointment_date: summary.appointment_date,
            duration: summary.duration,
            appointment_type: summary.appointment_type || item.appointment_type,
            status: summary.status,
          };
        });
        if (updated) return next;

        const dentistUser = {
          user_id: '',
          username: '',
          email: '',
          full_name: summary.dentist_name,
        };
        const patientUser = {
          user_id: '',
          username: '',
          email: '',
          full_name: summary.patient_name,
        };
        const cancelledBy = summary.cancelled_by_name
          ? { user_id: '', full_name: summary.cancelled_by_name }
          : null;

        const newDto: AppointmentDto = {
          id: summary.id,
          dentist_patient_link: 0,
          patient: { user: patientUser },
          dentist: { user: dentistUser },
          appointment_date: summary.appointment_date,
          status: summary.status,
          appointment_type: summary.appointment_type || '',
          duration: summary.duration,
          notes: '',
          proposal_note: '',
          counter_proposal_count: 0,
          last_proposed_by: null,
          cancelled_by: cancelledBy,
          cancellation_reason: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return [newDto, ...prev];
      });

      setAppointments((prev) => {
        let updated = false;
        const dateValue = parseBackendDateTime(summary.appointment_date);
        const next = prev.map((item) => {
          if (item.id !== String(summary.id)) return item;
          updated = true;
          return {
            ...item,
            date: formatLocalDate(dateValue),
            time: formatLocalTime(dateValue),
            duration: summary.duration ?? item.duration,
            type: summary.appointment_type || item.type,
            status: mapAppointmentStatus(summary.status),
          };
        });
        if (updated) return next;

        const newItem: Appointment = {
          id: String(summary.id),
          patientId: '',
          patientName: summary.patient_name,
          patientEmail: '',
          dentistId: '',
          dentistName: summary.dentist_name,
          date: formatLocalDate(dateValue),
          time: formatLocalTime(dateValue),
          duration: summary.duration ?? 30,
          type: summary.appointment_type || 'consultation',
          status: mapAppointmentStatus(summary.status),
          notes: null,
          createdAt: new Date().toISOString(),
        };

        return [newItem, ...prev];
      });
    }

    if (appointmentsRefreshTimer.current !== null) {
      window.clearTimeout(appointmentsRefreshTimer.current);
    }
    appointmentsRefreshTimer.current = window.setTimeout(() => {
      void loadAppointments();
    }, 500);
  }, [loadAppointments]);

  useEffect(() => {
    void loadBackendJobs();
  }, [refreshKey, loadBackendJobs]);

  useEffect(() => {
    if (activeView === 'patient-dashboard' || activeView === 'patient-appointments') {
      void loadAppointments();
    }
  }, [activeView, loadAppointments]);

  useEffect(() => {
    if (activeView !== 'patient-results' && activeView !== 'patient-case-detail') {
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

  // Keep selectedJob in sync when backendJobs refresh (so dentist updates flow in live).
  useEffect(() => {
    if (!selectedJob) return;
    const fresh = backendJobs.find((j) => j.job_id === selectedJob.job_id);
    if (fresh && fresh !== selectedJob) {
      setSelectedJob(fresh);
    }
  }, [backendJobs, selectedJob]);

  // Dynamic data reads on each render. setRefreshKey triggers re-render when mutated data changes.
  const patientCases = getCasesByPatient(CURRENT_PATIENT_ID);
  const patientResults = getPatientResults(CURRENT_PATIENT_ID);
  const { treatmentSuggestions } = database;
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return appointments
      .filter((appointment) =>
        appointment.date >= today && appointment.status === 'confirmed'
      )
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }, [appointments]);

  const jobsById = useMemo(() => {
    const map = new Map<string, AIJobDto>();
    for (const job of backendJobs) {
      map.set(job.job_id, job);
    }
    return map;
  }, [backendJobs]);

  const sortedBackendJobs = useMemo(
    () =>
      [...backendJobs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [backendJobs]
  );

  const backendLinkedResults = useMemo(
    () =>
      [...patientCases]
        .filter((caseItem) => Boolean(caseItem.backendJobId))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [patientCases]
  );

  // Mock-only fallback used when the patient has no backend jobs at all.
  const fallbackResultCards = useMemo(
    () =>
      (backendLinkedResults.length > 0 ? backendLinkedResults : patientResults).map((caseItem) => {
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
    [backendLinkedResults, patientResults, jobsById]
  );

  const totalDisplayResults = sortedBackendJobs.length || fallbackResultCards.length;

  const readyResultsCount = useMemo(() => {
    if (sortedBackendJobs.length > 0) {
      return sortedBackendJobs.filter(
        (j) => j.status === 'dentist_reviewed' || j.status === 'finalized'
      ).length;
    }
    return fallbackResultCards.filter((result) => result.isReady).length;
  }, [sortedBackendJobs, fallbackResultCards]);

  // Calculate stats with useMemo
  const { totalVisits, highPriorityTreatments, lastVisitCase } = useMemo(() => ({
    totalVisits: patientCases.length,
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
    setUploadError('');

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
      const myLink = links.find((link) => link.patient === CURRENT_PATIENT_ID) || links[0];

      if (!myLink) {
        setUploadError('You are not connected to a dentist yet. Use the "Connect to a dentist" panel on your dashboard to link your account first.');
        setUploadStatus('error');
        return;
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

      // Analysis is triggered automatically via the CTScan post_save signal on the backend.
      // No need to call generateDraft here — doing so risks a 400 if the task already ran.

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
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setUploadError(msg ?? 'Something went wrong. Please check your connection and try again.');
      setUploadStatus('error');
    }
  }, [uploadedFile, CURRENT_PATIENT_ID, CURRENT_PATIENT_NAME]);

  // Clear upload
  const clearUpload = useCallback(() => {
    setUploadedFile(null);
    setUploadPreview(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle View Full Report — open backend-backed detail page when available, otherwise fall back to legacy modal
  const handleViewFullReport = async (caseItem: Case) => {
    if (caseItem.backendJobId) {
      const cached = jobsById.get(caseItem.backendJobId);
      if (cached) {
        setSelectedJob(cached);
        setActiveView('patient-case-detail');
        return;
      }
      try {
        const fresh = await fetchJob(caseItem.backendJobId);
        setSelectedJob(fresh);
        setActiveView('patient-case-detail');
        return;
      } catch (err) {
        console.error('Unable to load job detail', err);
      }
    }
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

  const handleCreateAppointment = useCallback(async ({
    dentistPatientLinkId,
    appointmentDate,
    appointmentType,
    duration,
    notes,
    proposalNote,
    forceOverride,
  }: {
    dentistPatientLinkId: number;
    appointmentDate: string;
    appointmentType: string;
    duration: number;
    notes: string | null;
    proposalNote: string | null;
    forceOverride: boolean;
  }) => {
    const created = await createAppointment({
      dentist_patient_link: dentistPatientLinkId,
      appointment_date: appointmentDate,
      appointment_type: appointmentType ?? '',
      duration: duration ?? 30,
      notes: notes ?? '',
      proposal_note: proposalNote ?? '',
      force_override: forceOverride,
    });
    return created;
  }, []);

  const handleUpdateAppointmentStatus = useCallback(async (appointmentId: string, status: Appointment['status']) => {
    const current = appointments.find((item) => item.id === appointmentId);
    if (!current) return;

    let updated: AppointmentDto;
    if (status === 'confirmed') {
      updated = await acceptAppointment(Number(appointmentId));
    } else if (status === 'cancelled') {
      if (current.status === 'pending_dentist' || current.status === 'pending_patient') {
        updated = await declineAppointment(Number(appointmentId), '');
      } else {
        updated = await cancelAppointment(Number(appointmentId), '');
      }
    } else {
      return;
    }

    const mapped = mapAppointmentDtoToUi(updated);
    setAppointmentDtos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setAppointments((prev) => prev.map((item) => (item.id === String(updated.id) ? mapped : item)));
  }, [appointments]);

  const handleCounterPropose = useCallback(async (appointmentId: number, payload: { appointment_date: string; duration?: number; proposal_note?: string }) => {
    const updated = await counterProposeAppointment(appointmentId, payload);
    const mapped = mapAppointmentDtoToUi(updated);
    setAppointmentDtos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setAppointments((prev) => prev.map((item) => (item.id === String(updated.id) ? mapped : item)));
  }, []);

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
                    <div className="patient-metrics-summary__icon patient-metrics-summary__icon--teal" aria-hidden="true">
                      <Icon name="check-circle" size={16} />
                    </div>
                    <div className="patient-metrics-summary__body">
                      <span className="patient-metrics-summary__label">Records Ready</span>
                      <span className="patient-metrics-summary__meta">{totalDisplayResults} total records</span>
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
      case 'patient-results': {
        const PENDING_STATUSES = ['queued', 'segmentation_pending', 'report_requested'];
        const pendingJobs = sortedBackendJobs.filter(j => PENDING_STATUSES.includes(j.status));
        const readyJobs = sortedBackendJobs.filter(j => !PENDING_STATUSES.includes(j.status));
        return (
          <>
            <h2 className="patient-view-title">My Results</h2>

            {pendingJobs.length > 0 && (
              <div className="results-list" style={{ marginBottom: 'var(--space-16)' }}>
                {pendingJobs.map((job) => (
                  <div className="result-card result-card--patient card" key={job.job_id} style={{ opacity: 0.85 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 className="result-title" style={{ margin: '0 0 var(--space-4) 0' }}>Scan #{job.ct_scan_id}</h3>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          Uploaded: {formatDate(job.created_at)}
                          {job.dentist_name && <> · Dr. {job.dentist_name}</>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1.2s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                        Under AI Analysis
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {readyJobs.length > 0 ? (
              <div className="results-list">
                {readyJobs.map((job) => {
                  const statusLabel = getBackendJobStatusLabel(job.status);
                  const statusClass = getBackendJobStatusClass(job.status);
                  const completedDate = job.completed_at;
                  const metaDate = completedDate || job.updated_at || job.created_at;
                  const metaLabel = completedDate ? 'Completed' : 'Last Updated';
                  const isReady = job.status === 'dentist_reviewed' || job.status === 'finalized';
                  const previewSource = job.dentist_notes?.trim() || job.draft_report?.trim() || '';
                  const preview = previewSource.length > 240 ? previewSource.slice(0, 240) + '…' : previewSource;
                  return (
                    <div className="result-card result-card--patient card" key={job.job_id}>
                      <div className="result-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-16)' }}>
                        <div className="result-info">
                          <h3 className="result-title" style={{ margin: 0 }}>Scan #{job.ct_scan_id}</h3>
                          <div className="result-meta" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Uploaded: {formatDate(job.created_at)} · {metaLabel}: {metaDate ? formatDate(metaDate) : 'N/A'}
                          </div>
                          {job.dentist_name && (
                            <div className="result-meta" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-4)' }}>
                              <Icon name="user" /> Dr. {job.dentist_name}
                            </div>
                          )}
                        </div>
                        <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                      </div>

                      {preview ? (
                        <div className="patient-explanation" style={{
                          background: 'var(--color-bg-1)',
                          padding: 'var(--space-16)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: 'var(--space-16)',
                          borderLeft: '4px solid var(--color-primary)'
                        }}>
                          <h4 style={{ margin: '0 0 var(--space-8) 0' }}>
                            {job.dentist_notes?.trim() ? "Your Dentist's Notes" : 'AI Draft Summary'}
                          </h4>
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{preview}</p>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: '0 0 var(--space-16) 0' }}>
                          {isReady ? 'No notes were added.' : 'Your dentist is still reviewing this scan.'}
                        </p>
                      )}

                      <div className="result-actions" style={{ display: 'flex', gap: 'var(--space-12)' }}>
                        <button
                          className="btn btn--primary"
                          onClick={() => { setSelectedJob(job); setActiveView('patient-case-detail'); }}
                        >
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
            ) : fallbackResultCards.length > 0 ? (
              <div className="results-list">
                {fallbackResultCards.map(({ caseItem, statusLabel, statusClass, metaDate, metaLabel }) => {
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

                    <div className="result-actions" style={{ display: 'flex', gap: 'var(--space-12)' }}>
                      <button className="btn btn--primary" onClick={() => void handleViewFullReport(caseItem)}>
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
      }

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
                    <strong>Upload Failed.</strong> {uploadError || 'Please try again.'}
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

            <div style={{ marginBottom: 'var(--space-24)' }}>
              <PendingRequestsWidget
                appointments={appointmentDtos}
                userRole="patient"
                onAccept={(id) => handleUpdateAppointmentStatus(String(id), 'confirmed')}
                onDecline={(id) => handleUpdateAppointmentStatus(String(id), 'cancelled')}
                onCounterPropose={handleCounterPropose}
              />
            </div>

            <AppointmentList
              appointments={appointments}
              userRole="patient"
              onRefresh={() => void loadAppointments()}
              onScheduleNew={() => setShowScheduler(true)}
              onUpdateStatus={handleUpdateAppointmentStatus}
            />
          </>
        );

      // ============== PATIENT CASE DETAIL (read-only) ==============
      case 'patient-case-detail':
        if (!selectedJob) { setActiveView('patient-results'); return null; }
        return (
          <PatientCaseDetailView
            job={selectedJob}
            onBack={() => { setActiveView('patient-results'); setSelectedJob(null); }}
          />
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
      onNotification={handleAppointmentNotification}
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
          userRole="patient"
          onCreateAppointment={handleCreateAppointment}
          onClose={() => setShowScheduler(false)}
          onSuccess={(appointment) => {
            const mapped = mapAppointmentDtoToUi(appointment);
            setAppointmentDtos((prev) => [...prev, appointment]);
            setAppointments((prev) => [...prev, mapped]);
            setShowScheduler(false);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
