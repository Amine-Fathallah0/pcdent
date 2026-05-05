import { useState, useRef, useCallback, useEffect, useMemo, type JSX } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentScheduler from '../components/appointments/AppointmentScheduler';
import MessagingSystem from '../components/MessagingSystem';
import TreatmentPlanning from '../components/TreatmentPlanning';
import DentistCaseDetailView from '../components/DentistCaseDetailView';
import { approveLink, createAppointment, fetchActivePatients, fetchAppointments, fetchJobs, fetchMe, fetchPendingLinks, generateDraft, rejectLink, reviewJob, updateAppointment, uploadCTScan, type ActivePatientDto, type AIJobDto, type AppointmentDto, type MeDto, type PendingLinkDto } from '../lib/backendApi';
import { getBackendJobStatusLabel, getBackendJobStatusClass } from '../lib/jobUtils';
import PatientsHub from './PatientsHub';
import {
  database,
  formatDate,
  formatTime,
  getAppointmentTypeLabel,
  type Appointment
} from '../data/database';


// Better icons with improved styling
const icons: Record<string, JSX.Element> = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  'user-plus': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  'user-check': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  'user-x': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>,
  upload: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  inbox: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
  'file-text': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  'check-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  'x-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  edit: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  save: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  'message-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  send: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  'alert-triangle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  'alert-circle': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  tooth: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6c1-1 2-3 2-5 0-4-3-7-7-7z"/></svg>,
  download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  phone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
  mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  'chevron-left': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  'map-pin': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  award: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  briefcase: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  hash: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

const Icon = ({ name }: { name: string }) => icons[name] || <span>{name}</span>;

type InboxTab = 'new-uploads' | 'needs-review' | 'finalized';

const inboxTabLabels: Record<InboxTab, string> = {
  'new-uploads': 'New Uploads',
  'needs-review': 'Needs Review',
  finalized: 'Finalized / Sent',
};

const mapBackendStatusToInboxTab = (status: AIJobDto['status']): InboxTab => {
  switch (status) {
    case 'queued':
    case 'segmentation_pending':
    case 'report_requested':
      return 'new-uploads';
    case 'draft_ready':
    case 'failed':
      return 'needs-review';
    case 'dentist_reviewed':
    case 'finalized':
      return 'finalized';
    default:
      return 'new-uploads';
  }
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
  const dateValue = new Date(appointment.appointment_date);
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

const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/dicom'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!VALID_FILE_TYPES.includes(file.type as typeof VALID_FILE_TYPES[number]) && !file.name.toLowerCase().endsWith('.dcm')) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or DICOM files.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }
  return { valid: true };
};

const DentistDashboard = () => {
  const { user } = useAuth();
  const currentDentistId = user?.id ?? '';
  const currentDentistName = user?.name ?? '';
  const [activeView, setActiveView] = useState('dentist-dashboard');
  const [activeInboxTab, setActiveInboxTab] = useState<InboxTab>('new-uploads');
  const [dashboardInboxExpanded, setDashboardInboxExpanded] = useState(false);
  const [reviewingJob, setReviewingJob] = useState<AIJobDto | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [jobActionLoading, setJobActionLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render for dynamic data
  const [backendJobs, setBackendJobs] = useState<AIJobDto[]>([]);
  const [backendJobsLoading, setBackendJobsLoading] = useState(false);
  const [backendJobsError, setBackendJobsError] = useState<string | null>(null);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [meData, setMeData] = useState<MeDto | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: currentDentistName || database.dentistProfile.name,
    email: database.dentistProfile.email,
    phone: database.dentistProfile.phone,
    clinic: database.dentistProfile.clinic,
    specialization: database.dentistProfile.specialization,
    address: database.dentistProfile.address,
    availability: database.dentistProfile.availability
  });
  
  // Pending requests — real backend data
  const [pendingRequestsState, setPendingRequestsState] = useState<PendingLinkDto[]>([]);
  const [activePatients, setActivePatients] = useState<ActivePatientDto[]>([]);

  const loadPendingLinks = useCallback(async () => {
    try {
      const links = await fetchPendingLinks();
      setPendingRequestsState(links);
    } catch {
      // non-dentist accounts will get 403 — silently ignore
    }
  }, []);

  const loadActivePatients = useCallback(async () => {
    try {
      const patients = await fetchActivePatients();
      setActivePatients(patients);
    } catch {
      // silently ignore for non-dentist accounts
    }
  }, []);

  useEffect(() => {
    void loadPendingLinks();
    void loadActivePatients();
  }, [loadPendingLinks, loadActivePatients]);
  
  // Clinical Charting State
  const [selectedChartingPatient, setSelectedChartingPatient] = useState<string>('');
  const [numberingSystem, setNumberingSystem] = useState<'FDI' | 'Universal'>('FDI');
  const [dentitionType, setDentitionType] = useState<'adult' | 'child'>('adult');
  const [layerFilters, setLayerFilters] = useState({ findings: true, planned: true, completed: true });
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [chartingMode, setChartingMode] = useState<'view' | 'edit'>('view');
  const [toothNotes, setToothNotes] = useState<Record<number, string>>({});
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadJobs = useCallback(async () => {
    const shouldLoadJobs = activeView === 'dentist-dashboard' || activeView === 'dentist-patients';
    if (!shouldLoadJobs) {
      return;
    }

    setBackendJobsLoading(true);
    setBackendJobsError(null);
    try {
      const jobs = await fetchJobs();
      setBackendJobs(jobs);
    } catch (error) {
      console.error(error);
      setBackendJobsError('Unable to load backend job statuses.');
    } finally {
      setBackendJobsLoading(false);
    }
  }, [activeView]);

  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const items = await fetchAppointments();
      setAppointments(items.map(mapAppointmentDtoToUi));
    } catch {
      setAppointmentsError('Unable to load appointments.');
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  const handleCreateAppointment = useCallback(async ({
    dentistPatientLinkId,
    appointmentDate,
    appointmentType,
    duration,
    notes,
  }: {
    dentistPatientLinkId: number;
    appointmentDate: string;
    appointmentType?: string;
    duration?: number;
    notes: string | null;
  }) => {
    const created = await createAppointment({
      dentist_patient_link: dentistPatientLinkId,
      appointment_date: appointmentDate,
      status: 'scheduled',
      appointment_type: appointmentType ?? '',
      duration: duration ?? 30,
      notes: notes ?? '',
    });
    return mapAppointmentDtoToUi(created);
  }, []);

  const handleUpdateAppointmentStatus = useCallback(async (appointmentId: string, status: Appointment['status']) => {
    const backendStatus = status === 'no-show'
      ? 'no_show'
      : status === 'confirmed'
        ? 'scheduled'
        : status;
    const updated = await updateAppointment(Number(appointmentId), { status: backendStatus });
    const mapped = mapAppointmentDtoToUi(updated);
    setAppointments((prev) => prev.map((item) => (item.id === String(updated.id) ? mapped : item)));
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs, refreshKey]);

  useEffect(() => {
    if (activeView === 'dentist-dashboard' || activeView === 'dentist-appointments') {
      void loadAppointments();
    }
  }, [activeView, loadAppointments]);

  useEffect(() => {
    fetchMe().then(data => {
      setMeData(data);
      setProfileForm(prev => ({
        ...prev,
        name: data.full_name,
        email: data.email,
        phone: data.contact_number ?? prev.phone,
        address: data.location ?? prev.address,
      }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const shouldAutoRefresh = activeView === 'dentist-patients';
    if (!shouldAutoRefresh) {
      return;
    }

    void loadJobs();
    const intervalId = window.setInterval(() => {
      void loadJobs();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeView, loadJobs]);

  useEffect(() => {
    if (activeView === 'dentist-patients' || activeView === 'dentist-dashboard') {
      void loadActivePatients();
      void loadPendingLinks();
    }
  }, [activeView, loadActivePatients, loadPendingLinks]);

  const chartingPatients = activePatients;
  const dentistPatientsForScheduler = useMemo(
    () => activePatients.map((patient) => ({
      id: String(patient.id),
      name: patient.patient_name,
      email: patient.patient_email,
    })),
    [activePatients]
  );
  const { dentistProfile } = database;
  const todaysAppointments = useMemo(() => {
    const today = formatLocalDate(new Date());
    return appointments.filter((appointment) =>
      appointment.date === today
      && (appointment.status === 'scheduled' || appointment.status === 'confirmed')
    );
  }, [appointments]);

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

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!uploadedFile || !selectedPatientForUpload) {
      alert('Please select a patient first.');
      return;
    }

    // selectedPatientForUpload holds the link id (from activePatients)
    setUploadError(null);
    const linkId = Number(selectedPatientForUpload);
    const patient = activePatients.find(p => p.id === linkId);
    if (!patient) return;

    setUploadStatus('uploading');
    setUploadProgress(0);

    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) { clearInterval(uploadInterval); return 100; }
        return prev + 10;
      });
    }, 150);

    await new Promise(resolve => setTimeout(resolve, 1500));
    clearInterval(uploadInterval);
    setUploadProgress(100);
    setUploadStatus('processing');

    try {
      const uploaded = await uploadCTScan(
        linkId,
        uploadedFile,
        `Dentist upload for ${patient.patient_name}: ${uploadedFile.name}`
      );

      await generateDraft(uploaded.job.job_id);

      setUploadStatus('complete');
      setRefreshKey(prev => prev + 1);

      setTimeout(() => {
        setUploadedFile(null);
        setUploadPreview(null);
        setUploadProgress(0);
        setUploadStatus('idle');
        setSelectedPatientForUpload('');
        setActiveView('dentist-patients');
      }, 2000);
    } catch (error: unknown) {
      console.error(error);
      const axiosErr = error as { response?: { data?: Record<string, unknown> } };
      const data = axiosErr?.response?.data;
      let msg = 'Upload failed.';
      if (data) {
        const first = Object.values(data)[0];
        if (Array.isArray(first)) msg = String(first[0]);
        else if (typeof first === 'string') msg = first;
        else msg = JSON.stringify(data);
      }
      setUploadError(msg);
      setUploadStatus('error');
    }
  }, [uploadedFile, selectedPatientForUpload, activePatients]);

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

  // Calculate stats
  const casesThisMonth = useMemo(() => {
    const now = new Date();
    return backendJobs.filter(job => {
      const d = new Date(job.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [backendJobs]);

  // Centralized backend status mapping so counts and tabs always use identical logic.
  const backendJobsByInboxTab: Record<InboxTab, AIJobDto[]> = {
    'new-uploads': [],
    'needs-review': [],
    finalized: [],
  };
  for (const job of backendJobs) {
    backendJobsByInboxTab[mapBackendStatusToInboxTab(job.status)].push(job);
  }

  const backendNewUploads = backendJobsByInboxTab['new-uploads'];
  const backendNeedsReview = backendJobsByInboxTab['needs-review'];
  const backendFinalized = backendJobsByInboxTab.finalized;

  const getCurrentTabJobs = () => {
    switch (activeInboxTab) {
      case 'new-uploads': return backendNewUploads;
      case 'needs-review': return backendNeedsReview;
      case 'finalized': return backendFinalized;
      default: return backendNewUploads;
    }
  };

  const handleInboxIndicatorClick = (tab: InboxTab) => {
    setActiveInboxTab(tab);
    setDashboardInboxExpanded(prev => (prev && activeInboxTab === tab ? false : true));
  };

  const renderInboxJobs = ({ showRefresh = false, compact = false }: { showRefresh?: boolean; compact?: boolean } = {}) => {
    const jobs = getCurrentTabJobs();
    const minCardWidth = compact ? 300 : 360;
    const gridGap = compact ? 'var(--space-12)' : 'var(--space-16)';

    return (
      <>
        {showRefresh && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-16)' }}>
            <button className="btn btn--outline btn--sm" onClick={() => setRefreshKey(prev => prev + 1)}>
              <Icon name="activity" /> Refresh
            </button>
          </div>
        )}

        {backendJobsLoading ? (
          <div className="empty-state card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
            <h3>Loading cases...</h3>
          </div>
        ) : backendJobsError ? (
          <div className="empty-state card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
            <h3 style={{ color: '#B91C1C' }}>Unable to load cases</h3>
            <p>{backendJobsError}</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="case-cards-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`, gap: gridGap }}>
            {jobs.map(job => (
              <div className="case-card card" key={job.job_id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)' }}>
                      {job.patient_name ? job.patient_name.split(' ').map((n: string) => n[0]).join('') : '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{job.patient_name || 'Unknown Patient'}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Scan #{job.ct_scan_id} · {formatDate(job.created_at)}</div>
                    </div>
                  </div>
                  <span className={`status-badge ${getBackendJobStatusClass(job.status)}`} style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                    {getBackendJobStatusLabel(job.status)}
                  </span>
                </div>

                {/* Draft report preview */}
                {job.draft_report && (
                  <div style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-10)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                    {job.draft_report.slice(0, 180)}{job.draft_report.length > 180 ? '…' : ''}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'auto' }}>
                  {(job.status === 'segmentation_pending' || job.status === 'queued' || job.status === 'report_requested') && (
                    <button
                      className="btn btn--primary btn--sm btn--full"
                      onClick={() => { setReviewingJob(job); setReviewNotes(job.dentist_notes || ''); setActiveView('case-detail'); }}
                      disabled={jobActionLoading}
                    >
                      <Icon name="file-text" /> Open Case
                    </button>
                  )}
                  {job.status === 'draft_ready' && (
                    <button
                      className="btn btn--primary btn--sm btn--full"
                      onClick={() => { setReviewingJob(job); setReviewNotes(job.dentist_notes || ''); setActiveView('case-detail'); }}
                    >
                      <Icon name="eye" /> Review Report
                    </button>
                  )}
                  {job.status === 'dentist_reviewed' && (
                    <>
                      <button
                        className="btn btn--outline btn--sm"
                        style={{ flex: 1 }}
                        onClick={() => { setReviewingJob(job); setReviewNotes(job.dentist_notes || ''); setActiveView('case-detail'); }}
                      >
                        <Icon name="eye" /> View
                      </button>
                      <button
                        className="btn btn--primary btn--sm"
                        style={{ flex: 1 }}
                        onClick={() => { setReviewingJob(job); setReviewNotes(job.dentist_notes || ''); setActiveView('case-detail'); }}
                      >
                        <Icon name="check-circle" /> Finalize
                      </button>
                    </>
                  )}
                  {job.status === 'finalized' && (
                    <button
                      className="btn btn--outline btn--sm btn--full"
                      onClick={() => { setReviewingJob(job); setReviewNotes(job.dentist_notes || ''); setActiveView('case-detail'); }}
                    >
                      <Icon name="file-text" /> View Report
                    </button>
                  )}
                  {job.status === 'failed' && (
                    <button
                      className="btn btn--outline btn--sm btn--full"
                      onClick={() => void handleGenerateDraftForJob(job)}
                      disabled={jobActionLoading}
                    >
                      <Icon name="activity" /> Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
            <Icon name="check-circle" />
            <h3>All Caught Up!</h3>
            <p>No cases in this category.</p>
          </div>
        )}
      </>
    );
  };

  const renderPatientsHub = () => (
    <>
      <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Patients</h2>

      <div className="dashboard-overview-row">
        <div className="card dashboard-overview-card dashboard-overview-card--pending">
          <div className="card-header">
            <h3 className="card-title">Pending Patients</h3>
            <span className="dashboard-count-chip dashboard-count-chip--warning">{pendingRequestsState.length}</span>
          </div>
          <div className="dashboard-pending-count">{pendingRequestsState.length}</div>
          <p className="dashboard-muted">
            {pendingRequestsState.length === 0 ? 'No pending requests right now.' : 'Requests waiting for approval.'}
          </p>
          <button className="btn btn--outline btn--sm btn--full" onClick={() => setActiveView('dentist-pending')}>
            Review Requests
          </button>
        </div>

        <div className="card dashboard-overview-card dashboard-overview-card--patients">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
              <h3 className="card-title">My Patients</h3>
              <span className="dashboard-count-chip">{activePatients.length}</span>
            </div>
            <button className="btn btn--outline btn--sm" onClick={() => setActiveView('dentist-patients-list')}>
              View All
            </button>
          </div>
          {activePatients.length > 0 ? (
            <div className="dashboard-patients-list">
              {activePatients.slice(0, 4).map(patient => (
                <div className="dashboard-patient-row" key={patient.id}>
                  <div className="dashboard-patient-avatar">
                    {patient.patient_name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="dashboard-patient-info">
                    <div className="dashboard-patient-name">{patient.patient_name}</div>
                    <div className="dashboard-patient-meta">{patient.patient_email}</div>
                  </div>
                  <div className="dashboard-patient-date">{formatDate(patient.connected_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <p className="dashboard-muted">No active patients yet.</p>
              <button className="btn btn--primary btn--sm" onClick={() => setActiveView('dentist-pending')}>
                Review Requests
              </button>
            </div>
          )}
        </div>

        <div className="card dashboard-overview-card dashboard-overview-card--inbox">
          <div className="card-header">
            <h3 className="card-title">Case Inbox</h3>
            <button className="btn btn--outline btn--sm" onClick={() => setActiveView('dentist-patients')}>
              Open Inbox
            </button>
          </div>
          <div className="dashboard-inbox-indicators">
            <button
              className={`dashboard-inbox-indicator ${activeInboxTab === 'new-uploads' ? 'is-active' : ''}`}
              data-variant="new"
              onClick={() => handleInboxIndicatorClick('new-uploads')}
              aria-expanded={dashboardInboxExpanded && activeInboxTab === 'new-uploads'}
            >
              <span className="dashboard-inbox-indicator__label">{inboxTabLabels['new-uploads']}</span>
              <span className="dashboard-inbox-indicator__count">{backendJobsLoading ? '…' : backendNewUploads.length}</span>
            </button>
            <button
              className={`dashboard-inbox-indicator ${activeInboxTab === 'needs-review' ? 'is-active' : ''}`}
              data-variant="review"
              onClick={() => handleInboxIndicatorClick('needs-review')}
              aria-expanded={dashboardInboxExpanded && activeInboxTab === 'needs-review'}
            >
              <span className="dashboard-inbox-indicator__label">{inboxTabLabels['needs-review']}</span>
              <span className="dashboard-inbox-indicator__count">{backendJobsLoading ? '…' : backendNeedsReview.length}</span>
            </button>
            <button
              className={`dashboard-inbox-indicator ${activeInboxTab === 'finalized' ? 'is-active' : ''}`}
              data-variant="final"
              onClick={() => handleInboxIndicatorClick('finalized')}
              aria-expanded={dashboardInboxExpanded && activeInboxTab === 'finalized'}
            >
              <span className="dashboard-inbox-indicator__label">{inboxTabLabels.finalized}</span>
              <span className="dashboard-inbox-indicator__count">{backendJobsLoading ? '…' : backendFinalized.length}</span>
            </button>
          </div>
          <p className="dashboard-inbox-hint">Select a status to open the inbox details below.</p>
        </div>
      </div>

      <div className={`dashboard-inbox-details ${dashboardInboxExpanded ? 'is-open' : ''}`}>
        <div className="card dashboard-inbox-details-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Case Inbox · {inboxTabLabels[activeInboxTab]}</h3>
              <div className="dashboard-inbox-details-meta">
                {backendJobsLoading ? 'Loading cases…' : `${getCurrentTabJobs().length} case${getCurrentTabJobs().length === 1 ? '' : 's'}`}
              </div>
            </div>
            <button className="btn btn--outline btn--sm" onClick={() => setDashboardInboxExpanded(false)}>
              Hide Details
            </button>
          </div>
          {renderInboxJobs({ showRefresh: true, compact: true })}
        </div>
      </div>
    </>
  );

  // Pending request handlers
  const handleAcceptPatient = async (requestId: string) => {
    try {
      await approveLink(Number(requestId));
      setPendingRequestsState(prev => prev.filter(r => String(r.id) !== requestId));
      void loadActivePatients();
      setActionFeedback({ type: 'success', message: 'Patient accepted successfully!' });
    } catch {
      setActionFeedback({ type: 'error', message: 'Failed to accept patient. Please try again.' });
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleRejectPatient = async (requestId: string) => {
    try {
      await rejectLink(Number(requestId));
      setPendingRequestsState(prev => prev.filter(r => String(r.id) !== requestId));
      setActionFeedback({ type: 'info', message: 'Patient request has been declined.' });
    } catch {
      setActionFeedback({ type: 'error', message: 'Failed to decline request. Please try again.' });
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };


  // Backend job action handlers
  const handleGenerateDraftForJob = async (job: AIJobDto) => {
    setJobActionLoading(true);
    try {
      const updated = await generateDraft(job.job_id);
      setRefreshKey(prev => prev + 1);
      setReviewingJob(updated);
      setActionFeedback({ type: 'success', message: 'Draft report generated. You can now review it.' });
    } catch {
      setActionFeedback({ type: 'error', message: 'Failed to generate draft. Please try again.' });
    } finally {
      setJobActionLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleReviewJobAction = async (decision: 'reviewed' | 'finalized') => {
    if (!reviewingJob) return;
    setJobActionLoading(true);
    try {
      const updated = await reviewJob(reviewingJob.job_id, decision, reviewNotes);
      setRefreshKey(prev => prev + 1);
      setReviewingJob(updated);
      setReviewNotes(updated.dentist_notes || '');
      setActionFeedback({ type: 'success', message: decision === 'finalized' ? 'Report finalized successfully.' : 'Report marked as reviewed.' });
      if (decision === 'finalized') setActiveView('dentist-patients');
    } catch {
      setActionFeedback({ type: 'error', message: 'Failed to save review. Please try again.' });
    } finally {
      setJobActionLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Profile handlers
  const handleProfileSave = () => {
    setIsEditingProfile(false);
    setActionFeedback({ type: 'success', message: 'Profile updated successfully!' });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleProfileCancel = () => {
    setProfileForm({
      name: meData?.full_name ?? currentDentistName ?? database.dentistProfile.name,
      email: meData?.email ?? database.dentistProfile.email,
      phone: meData?.contact_number ?? database.dentistProfile.phone,
      clinic: database.dentistProfile.clinic,
      specialization: database.dentistProfile.specialization,
      address: meData?.location ?? database.dentistProfile.address,
      availability: database.dentistProfile.availability
    });
    setIsEditingProfile(false);
  };

  // Render Tooth SVG for Clinical Chart
  const renderToothSVG = (toothNumber: number, toothData: { surfaces?: Record<string, string>, status?: string, aiDetected?: boolean, condition?: string } = {}) => {
    const { surfaces = {}, status, aiDetected } = toothData;
    const isSelected = selectedTooth === toothNumber;
    
    const getSurfaceClass = (surface: string) => {
      const state = surfaces[surface];
      if (!state) return '';
      if (!layerFilters.findings && state === 'finding') return '';
      if (!layerFilters.planned && state === 'planned') return '';
      if (!layerFilters.completed && state === 'completed') return '';
      if (state === 'finding' && aiDetected) return 'surface-ai-finding';
      if (state === 'finding') return 'surface-finding';
      if (state === 'planned') return 'surface-planned';
      if (state === 'completed') return 'surface-completed';
      if (state === 'existing') return 'surface-existing';
      return '';
    };

    return (
      <div 
        className={`tooth-svg-container ${isSelected ? 'selected' : ''}`} 
        key={toothNumber} 
        data-tooth={toothNumber}
        onClick={() => chartingMode === 'edit' && setSelectedTooth(isSelected ? null : toothNumber)}
        style={{ cursor: chartingMode === 'edit' ? 'pointer' : 'default' }}
      >
        <svg viewBox="0 0 50 50" className={`tooth-svg ${isSelected ? 'tooth-selected' : ''}`}>
          <rect className="tooth-base" x="5" y="5" width="40" height="40" rx="4" style={isSelected ? { stroke: '#2563EB', strokeWidth: 3 } : {}} />
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

  // Render Clinical Odontogram for Dentist
  const renderDentistOdontogram = () => {
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
    const toothData: Record<number, { surfaces?: Record<string, string>; status?: string; aiDetected?: boolean; condition?: string }> = {};

    return (
      <div className="clinical-odontogram">
        <div className="odontogram-controls">
          <div className="control-group">
            <label>Numbering:</label>
            <select 
              value={numberingSystem} 
              onChange={(e) => setNumberingSystem(e.target.value as 'FDI' | 'Universal')}
              className="numbering-select"
              style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
            >
              <option value="FDI">FDI (ISO)</option>
              <option value="Universal">Universal</option>
            </select>
          </div>

          <div className="control-group">
            <label>Dentition:</label>
            <div className="dentition-toggle" style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <button 
                className={`btn btn--sm ${dentitionType === 'adult' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => setDentitionType('adult')}
              >
                Adult (32)
              </button>
              <button 
                className={`btn btn--sm ${dentitionType === 'child' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => setDentitionType('child')}
              >
                Child (20)
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Mode:</label>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <button 
                className={`btn btn--sm ${chartingMode === 'view' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => { setChartingMode('view'); setSelectedTooth(null); }}
              >
                <Icon name="eye" /> View
              </button>
              <button 
                className={`btn btn--sm ${chartingMode === 'edit' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => setChartingMode('edit')}
              >
                <Icon name="edit" /> Edit
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Layers:</label>
            <div className="layer-toggles" style={{ display: 'flex', gap: 'var(--space-12)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={layerFilters.findings} 
                  onChange={(e) => setLayerFilters({...layerFilters, findings: e.target.checked})}
                />
                <span style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }}></span>
                Findings
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={layerFilters.planned} 
                  onChange={(e) => setLayerFilters({...layerFilters, planned: e.target.checked})}
                />
                <span style={{ width: '12px', height: '12px', background: '#F59E0B', borderRadius: '2px' }}></span>
                Planned
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={layerFilters.completed} 
                  onChange={(e) => setLayerFilters({...layerFilters, completed: e.target.checked})}
                />
                <span style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '2px' }}></span>
                Completed
              </label>
            </div>
          </div>

          <div className="control-group export-buttons" style={{ marginLeft: 'auto' }}>
            <button className="btn btn--outline btn--sm" onClick={() => console.log('Export JSON')}>
              <Icon name="download" /> JSON
            </button>
            <button className="btn btn--outline btn--sm" onClick={() => console.log('Export PDF')}>
              <Icon name="file-text" /> PDF
            </button>
          </div>
        </div>

        <div className="odontogram-chart" style={{ 
          background: 'var(--color-bg)', 
          borderRadius: 'var(--radius-lg)', 
          padding: 'var(--space-24)',
          border: '1px solid var(--color-border)'
        }}>
          <div className="jaw-section upper" style={{ marginBottom: 'var(--space-16)' }}>
            <div className="jaw-label" style={{ textAlign: 'center', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>Upper</div>
            <div className="quadrant-row" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-24)' }}>
              <div className="quadrant upper-right">
                <div className="quadrant-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>UR</div>
                <div className="teeth-row" style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  {teeth.upperRight.map(tooth => renderToothSVG(tooth, toothData[tooth]))}
                </div>
              </div>
              <div className="midline" style={{ width: '2px', background: 'var(--color-border)', margin: '0 var(--space-8)' }}></div>
              <div className="quadrant upper-left">
                <div className="quadrant-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>UL</div>
                <div className="teeth-row" style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  {teeth.upperLeft.map(tooth => renderToothSVG(tooth, toothData[tooth]))}
                </div>
              </div>
            </div>
          </div>

          <div className="jaw-section lower">
            <div className="quadrant-row" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-24)' }}>
              <div className="quadrant lower-right">
                <div className="quadrant-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>LR</div>
                <div className="teeth-row" style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  {teeth.lowerRight.map(tooth => renderToothSVG(tooth, toothData[tooth]))}
                </div>
              </div>
              <div className="midline" style={{ width: '2px', background: 'var(--color-border)', margin: '0 var(--space-8)' }}></div>
              <div className="quadrant lower-left">
                <div className="quadrant-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>LL</div>
                <div className="teeth-row" style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  {teeth.lowerLeft.map(tooth => renderToothSVG(tooth, toothData[tooth]))}
                </div>
              </div>
            </div>
            <div className="jaw-label" style={{ textAlign: 'center', fontWeight: 'var(--font-weight-semibold)', marginTop: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>Lower</div>
          </div>
        </div>

        <div className="chart-legend" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 'var(--space-32)',
          marginTop: 'var(--space-16)',
          padding: 'var(--space-12)',
          background: 'var(--color-bg-1)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div className="legend-section">
            <div className="legend-title" style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-8)', fontSize: 'var(--font-size-sm)' }}>Status</div>
            <div className="legend-items" style={{ display: 'flex', gap: 'var(--space-16)' }}>
              <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ width: '16px', height: '16px', background: '#EF4444', borderRadius: '3px' }}></span>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Finding</span>
              </div>
              <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ width: '16px', height: '16px', background: '#F59E0B', borderRadius: '3px' }}></span>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Planned</span>
              </div>
              <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ width: '16px', height: '16px', background: '#10B981', borderRadius: '3px' }}></span>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Completed</span>
              </div>
            </div>
          </div>
          <div className="legend-section">
            <div className="legend-title" style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-8)', fontSize: 'var(--font-size-sm)' }}>Source</div>
            <div className="legend-items" style={{ display: 'flex', gap: 'var(--space-16)' }}>
              <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ background: '#7C3AED', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>AI</span>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>AI Detected</span>
              </div>
              <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ background: '#2563EB', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>Dr</span>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Dentist Added</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      // ============== DENTIST DASHBOARD ==============
      case 'dentist-dashboard':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Clinic Dashboard</h2>
            <div className="dentist-home-top-row">
              <article className="card dentist-main-card">
                <div className="card-header">
                  <h3 className="card-title">Quick actions</h3>
                </div>
                <div className="dentist-actions-grid">
                  <button className="btn btn--primary btn--full" onClick={() => setActiveView('dentist-upload')}>
                    <Icon name="upload" /> New Analysis
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-patients')}>
                    <Icon name="inbox" /> Open Patients Hub
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-appointments')}>
                    <Icon name="calendar" /> Appointments
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-patients')}>
                    <Icon name="users" /> Patients
                  </button>
                </div>
              </article>

              <article className="card dentist-summary-card">
                <div className="card-header">
                  <h3 className="card-title">Practice snapshot</h3>
                </div>
                <ul className="dentist-summary-list">
                  <li className="dentist-summary-item">
                    <span className="dentist-summary-item__label">Active Patients</span>
                    <span className="dentist-summary-item__value">{activePatients.length}</span>
                  </li>
                  <li className="dentist-summary-item">
                    <span className="dentist-summary-item__label">Pending Requests</span>
                    <span className="dentist-summary-item__value">{pendingRequestsState.length}</span>
                  </li>
                  <li className="dentist-summary-item">
                    <span className="dentist-summary-item__label">Needs Review</span>
                    <span className="dentist-summary-item__value">{backendNeedsReview.length}</span>
                  </li>
                  <li className="dentist-summary-item">
                    <span className="dentist-summary-item__label">Cases This Month</span>
                    <span className="dentist-summary-item__value">{casesThisMonth}</span>
                  </li>
                </ul>
              </article>
            </div>

            <div className="dentist-dashboard-lower-row">
              <div className="card dentist-today-card">
                <div className="card-header">
                  <h3 className="card-title">Today</h3>
                  <button className="btn btn--outline btn--sm" onClick={() => setActiveView('dentist-appointments')}>
                    View Schedule
                  </button>
                </div>
                {todaysAppointments.length > 0 ? (
                  <div className="dashboard-patients-list">
                    {todaysAppointments.slice(0, 4).map(appointment => (
                      <div className="dashboard-patient-row" key={appointment.id}>
                        <div className="dashboard-patient-avatar">{appointment.patientName.split(' ').map(n => n[0]).join('')}</div>
                        <div className="dashboard-patient-info">
                          <div className="dashboard-patient-name">{appointment.patientName}</div>
                          <div className="dashboard-patient-meta">{getAppointmentTypeLabel(appointment.type)}</div>
                        </div>
                        <div className="dashboard-patient-date">{formatTime(appointment.time)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-muted">No appointments scheduled for today.</p>
                )}
              </div>

              <div className="card dentist-recent-card">
                <div className="card-header">
                  <h3 className="card-title">Recent Cases</h3>
                  <button className="btn btn--outline btn--sm" onClick={() => setActiveView('dentist-patients')}>
                    View All
                  </button>
                </div>
                {renderInboxJobs({ compact: true })}
              </div>
            </div>
          </>
        );

      // ============== DENTIST PATIENTS HUB ==============
      case 'dentist-patients':
        return (
          <PatientsHub
            backendJobs={backendJobs}
            activePatients={activePatients}
            pendingLinks={pendingRequestsState}
            loading={backendJobsLoading}
            onOpenCase={(job) => {
              setReviewingJob(job);
              setReviewNotes(job.dentist_notes || '');
              setActiveView('case-detail');
            }}
            onAcceptPatient={handleAcceptPatient}
            onRejectPatient={handleRejectPatient}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        );

      // ============== DENTIST APPOINTMENTS ==============
      case 'dentist-appointments':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Appointments</h2>
            
            {/* Today's Schedule Highlight */}
            {todaysAppointments.length > 0 && (
              <div className="card" style={{ 
                marginBottom: 'var(--space-24)',
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                border: '1px solid #F59E0B'
              }}>
                <div className="card-body" style={{ padding: 'var(--space-20)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: '#B45309', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                        TODAY'S SCHEDULE
                      </div>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                        {todaysAppointments.length} Appointment{todaysAppointments.length !== 1 ? 's' : ''} Today
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>
                        Next: {getAppointmentTypeLabel(todaysAppointments[0].type)} with {todaysAppointments[0].patientName} at {formatTime(todaysAppointments[0].time)}
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

            {/* Week Overview */}
            <div className="card" style={{ marginBottom: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">This Week's Overview</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-12)', padding: 'var(--space-16)' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => {
                  const dayDate = new Date();
                  const currentDay = dayDate.getDay();
                  const diff = (idx + 1) - currentDay;
                  dayDate.setDate(dayDate.getDate() + diff);
                  const dateStr = dayDate.toISOString().split('T')[0];
                  const dayAppointments = appointments.filter(a => a.date === dateStr);
                  const isToday = diff === 0;
                  
                  return (
                    <div key={day} style={{
                      padding: 'var(--space-12)',
                      background: isToday ? 'var(--color-primary)' : 'var(--color-bg-1)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      color: isToday ? 'white' : 'inherit'
                    }}>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{day}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7, marginBottom: '8px' }}>
                        {dayDate.getDate()}
                      </div>
                      <div style={{ 
                        fontSize: 'var(--font-size-xl)', 
                        fontWeight: 'var(--font-weight-bold)',
                        color: isToday ? 'white' : dayAppointments.length > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                      }}>
                        {dayAppointments.length}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {appointmentsLoading && (
              <div className="card" style={{ marginBottom: 'var(--space-16)', padding: 'var(--space-16)' }}>
                Loading appointments...
              </div>
            )}
            {appointmentsError && (
              <div className="card" style={{ marginBottom: 'var(--space-16)', padding: 'var(--space-16)', color: '#B91C1C' }}>
                {appointmentsError}
              </div>
            )}

            <AppointmentList
              appointments={appointments}
              userRole="dentist"
              onRefresh={() => void loadAppointments()}
              onScheduleNew={() => setShowScheduler(true)}
              onUpdateStatus={handleUpdateAppointmentStatus}
            />
          </>
        );

      // ============== DENTIST UPLOAD ==============
      case 'dentist-upload':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>New Analysis</h2>

            <div className="card" style={{ marginBottom: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Upload CT Scan</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                    Select Patient
                  </label>
                  <select
                    value={selectedPatientForUpload}
                    onChange={(e) => setSelectedPatientForUpload(e.target.value)}
                    style={{
                      padding: 'var(--space-12) var(--space-16)',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      fontSize: 'var(--font-size-base)',
                      minWidth: '300px',
                      background: 'var(--color-bg)'
                    }}
                  >
                    <option value="">-- Select a patient --</option>
                    {activePatients.map(patient => (
                      <option key={patient.id} value={patient.id}>{patient.patient_name}</option>
                    ))}
                  </select>
                  {activePatients.length === 0 && (
                    <p style={{ marginTop: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
                      No connected patients yet. Approve requests to upload scans.
                    </p>
                  )}
                </div>

                <div
                  className={`upload-dropzone${isDragging ? ' is-dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-32)',
                    textAlign: 'center',
                    background: isDragging ? 'var(--color-bg-1)' : 'transparent'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.dcm"
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />

                  {uploadPreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', alignItems: 'center' }}>
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        style={{ maxWidth: '280px', borderRadius: 'var(--radius-md)' }}
                      />
                      <button className="btn btn--outline btn--sm" onClick={clearUpload}>
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Icon name="upload" />
                      <p style={{ marginTop: 'var(--space-12)' }}>Drag and drop a scan here, or</p>
                      <button className="btn btn--outline btn--sm" onClick={() => fileInputRef.current?.click()}>
                        Choose File
                      </button>
                    </div>
                  )}
                </div>

                {uploadedFile && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{uploadedFile.name}</strong>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <span className="status-badge" style={{ textTransform: 'capitalize' }}>{uploadStatus}</span>
                  </div>
                )}

                {uploadStatus !== 'idle' && (
                  <div style={{ width: '100%' }}>
                    <div style={{ height: '8px', background: 'var(--color-bg-1)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--color-primary)' }} />
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div style={{ color: '#B91C1C', background: '#FEE2E2', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)' }}>
                    {uploadError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
                  <button
                    className="btn btn--primary"
                    onClick={() => void handleUpload()}
                    disabled={!uploadedFile || !selectedPatientForUpload || uploadStatus === 'uploading' || uploadStatus === 'processing'}
                  >
                    <Icon name="upload" /> Upload & Analyze
                  </button>
                  <button className="btn btn--outline" onClick={clearUpload} disabled={!uploadedFile}>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </>
        );

      // ============== DENTIST CASE DETAIL ==============
      case 'case-detail':
        if (!reviewingJob) { setActiveView('dentist-patients'); return null; }
        return (
          <DentistCaseDetailView
            job={reviewingJob}
            reviewNotes={reviewNotes}
            onNotesChange={setReviewNotes}
            onBack={() => { setActiveView('dentist-patients'); setReviewingJob(null); }}
            onGenerateDraft={handleGenerateDraftForJob}
            onReview={handleReviewJobAction}
            loading={jobActionLoading}
          />
        );

      // ============== DENTIST PENDING REQUESTS ==============
      case 'dentist-pending':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Pending Requests</h2>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Patient Requests</h3>
              </div>
              {pendingRequestsState.length === 0 ? (
                <div style={{ padding: 'var(--space-24)', color: 'var(--color-text-secondary)' }}>
                  No pending requests right now.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                  {pendingRequestsState.map(request => (
                    <div key={request.id} className="card" style={{ padding: 'var(--space-16)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-16)' }}>
                        <div>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{request.patient_name}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{request.patient_email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                          <button className="btn btn--outline btn--sm" onClick={() => void handleRejectPatient(String(request.id))}>
                            Reject
                          </button>
                          <button className="btn btn--primary btn--sm" onClick={() => void handleAcceptPatient(String(request.id))}>
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );

      // ============== DENTIST PATIENTS LIST ==============
      case 'dentist-patients-list':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>My Patients</h2>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Active Patients</h3>
              </div>
              {activePatients.length === 0 ? (
                <div style={{ padding: 'var(--space-24)', color: 'var(--color-text-secondary)' }}>
                  No active patients yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--space-12)', padding: 'var(--space-16)' }}>
                  {activePatients.map((patient) => (
                    <div key={patient.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-12)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{patient.patient_name}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{patient.patient_email}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>{patient.patient_phone}</div>
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        Connected {formatDate(patient.connected_at)}
                      </div>
                    </div>
                  ))}
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
            
            {/* Action Feedback Toast */}
            {actionFeedback && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-12)', 
                padding: 'var(--space-16)', 
                background: actionFeedback.type === 'success' ? '#D1FAE5' : actionFeedback.type === 'error' ? '#FEE2E2' : '#DBEAFE',
                color: actionFeedback.type === 'success' ? '#047857' : actionFeedback.type === 'error' ? '#B91C1C' : '#1D4ED8',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-16)',
                borderLeft: `4px solid ${actionFeedback.type === 'success' ? '#10B981' : actionFeedback.type === 'error' ? '#EF4444' : '#3B82F6'}`
              }}>
                <Icon name={actionFeedback.type === 'success' ? 'check-circle' : 'info'} />
                <span>{actionFeedback.message}</span>
              </div>
            )}
            
            <div className="profile-container">
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">Professional Information</h3>
                  {!isEditingProfile ? (
                    <button className="btn btn--primary btn--sm" onClick={() => setIsEditingProfile(true)}>
                      <Icon name="edit" /> Edit Profile
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                      <button className="btn btn--success btn--sm" onClick={handleProfileSave}>
                        <Icon name="save" /> Save Changes
                      </button>
                      <button className="btn btn--outline btn--sm" onClick={handleProfileCancel}>
                        <Icon name="x" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                {!isEditingProfile ? (
                  // View Mode
                  <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-20)' }}>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="users" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{profileForm.name}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="mail" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{profileForm.email}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="hash" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dentist Code</span>
                        <span className="profile-value code" style={{ fontWeight: 'var(--font-weight-bold)', fontFamily: 'monospace', background: 'var(--color-primary)', color: 'white', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>{meData?.dentist_code ?? '—'}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="shield" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>License Number</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.licenseNumber}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="briefcase" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinic/Practice</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{profileForm.clinic}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="award" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Specialization</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{profileForm.specialization}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="phone" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{profileForm.phone}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="map-pin" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{profileForm.address}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="clock" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Availability</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{profileForm.availability}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: '#10B981', marginTop: '2px' }}><Icon name="check-circle" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Status</span>
                        <span className={`status-badge ${dentistProfile.status}`} style={{ background: '#D1FAE5', color: '#047857', padding: '4px 12px', borderRadius: '12px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'capitalize' }}>{dentistProfile.status}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <div className="profile-edit-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-20)' }}>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                        <Icon name="users" /> Full Name
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', fontSize: 'var(--font-size-base)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                        <Icon name="mail" /> Email
                      </label>
                      <input 
                        type="email" 
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', fontSize: 'var(--font-size-base)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                        <Icon name="phone" /> Phone
                      </label>
                      <input 
                        type="tel" 
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', fontSize: 'var(--font-size-base)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                        <Icon name="briefcase" /> Clinic/Practice
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.clinic}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, clinic: e.target.value }))}
                        style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', fontSize: 'var(--font-size-base)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                        <Icon name="award" /> Specialization
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.specialization}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, specialization: e.target.value }))}
                        style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', fontSize: 'var(--font-size-base)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                        <Icon name="clock" /> Availability
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.availability}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, availability: e.target.value }))}
                        style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', fontSize: 'var(--font-size-base)' }}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                        <Icon name="map-pin" /> Address
                      </label>
                      <input 
                        type="text" 
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                        style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', fontSize: 'var(--font-size-base)' }}
                      />
                    </div>
                    
                    {/* Non-editable fields info */}
                    <div style={{ gridColumn: 'span 2', padding: 'var(--space-16)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-8)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>
                        <Icon name="info" />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>The following fields cannot be edited:</span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-24)', flexWrap: 'wrap' }}>
                        <div><strong>Dentist Code:</strong> {meData?.dentist_code ?? '—'}</div>
                        <div><strong>License Number:</strong> {dentistProfile.licenseNumber}</div>
                        <div><strong>Status:</strong> {dentistProfile.status}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="card" style={{ marginTop: 'var(--space-24)' }}>
                <div className="card-header">
                  <h3 className="card-title">Statistics</h3>
                </div>
                <div className="stats-grid-small" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-16)' }}>
                  <div className="stat-item" style={{ textAlign: 'center', padding: 'var(--space-20)', background: 'linear-gradient(135deg, var(--color-bg-1) 0%, rgba(59, 130, 246, 0.12) 100%)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
                      <div style={{ width: '40px', height: '40px', background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Icon name="users" />
                      </div>
                    </div>
                    <span className="stat-number" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)', display: 'block' }}>{activePatients.length}</span>
                    <span className="stat-label" style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)' }}>Active Patients</span>
                  </div>
                  <div className="stat-item" style={{ textAlign: 'center', padding: 'var(--space-20)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.15) 100%)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
                      <div style={{ width: '40px', height: '40px', background: '#F59E0B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Icon name="user-plus" />
                      </div>
                    </div>
                    <span className="stat-number" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: '#F59E0B', display: 'block' }}>{pendingRequestsState.length}</span>
                    <span className="stat-label" style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)' }}>Pending Requests</span>
                  </div>
                  <div className="stat-item" style={{ textAlign: 'center', padding: 'var(--space-20)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.15) 100%)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
                      <div style={{ width: '40px', height: '40px', background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Icon name="activity" />
                      </div>
                    </div>
                    <span className="stat-number" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: '#10B981', display: 'block' }}>{casesThisMonth}</span>
                    <span className="stat-label" style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)' }}>Cases This Month</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      // ============== CLINICAL CHARTING ==============
      case 'dentist-charting': {
        const chartingPatient = chartingPatients.find(p => p.patient_user_id === selectedChartingPatient);
        const patientToothData: Record<number, { surfaces?: Record<string, string>; status?: string; aiDetected?: boolean; condition?: string }> = {};
        const patientConditions: { tooth: number; condition: string; source: 'AI' | 'Dentist' }[] = [];
        
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Clinical Chart</h2>
            
            {/* Patient Selection */}
            <div className="card" style={{ marginBottom: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title"><Icon name="users" /> Select Patient</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)', flexWrap: 'wrap' }}>
                <select
                  value={selectedChartingPatient}
                  onChange={(e) => { setSelectedChartingPatient(e.target.value); setSelectedTooth(null); }}
                  style={{
                    padding: 'var(--space-12) var(--space-16)',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--color-border)',
                    fontSize: 'var(--font-size-base)',
                    minWidth: '300px',
                    background: 'var(--color-bg)'
                  }}
                >
                  <option value="">-- Select a patient --</option>
                  {chartingPatients.map(patient => (
                    <option key={patient.patient_user_id} value={patient.patient_user_id}>{patient.patient_name}</option>
                  ))}
                </select>
                
                {chartingPatient && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      {chartingPatient.patient_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{chartingPatient.patient_name}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {Object.keys(patientToothData).length} teeth with findings
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Odontogram */}
            {selectedChartingPatient ? (
              chartDataAvailable ? (
                <div style={{ display: 'grid', gridTemplateColumns: selectedTooth ? '2fr 1fr' : '1fr', gap: 'var(--space-24)' }}>
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title"><Icon name="tooth" /> Dental Chart - {chartingPatient?.patient_name}</h3>
                    </div>
                    {renderDentistOdontogram()}
                  </div>

                  {/* Tooth Details Panel (when in edit mode and tooth selected) */}
                  {selectedTooth && chartingMode === 'edit' && (
                    <div className="card" style={{ alignSelf: 'start' }}>
                      <div className="card-header">
                        <h3 className="card-title">Tooth #{selectedTooth}</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                            Condition
                          </label>
                          {patientToothData[selectedTooth]?.condition ? (
                            <div style={{ 
                              padding: 'var(--space-12)', 
                              background: 'var(--color-bg-1)', 
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border)'
                            }}>
                              {patientToothData[selectedTooth].condition}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                              No conditions recorded
                            </div>
                          )}
                        </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                          Notes
                        </label>
                        <textarea
                          value={toothNotes[selectedTooth] || ''}
                          onChange={(e) => setToothNotes(prev => ({ ...prev, [selectedTooth]: e.target.value }))}
                          placeholder="Add clinical notes..."
                          style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: 'var(--space-12)',
                            borderRadius: 'var(--radius-md)',
                            border: '2px solid var(--color-border)',
                            fontSize: 'var(--font-size-base)',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                          Quick Actions
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
                          <button className="btn btn--outline btn--sm" onClick={() => console.log('Mark as missing')}>
                            Mark Missing
                          </button>
                          <button className="btn btn--outline btn--sm" onClick={() => console.log('Add restoration')}>
                            Add Restoration
                          </button>
                          <button className="btn btn--outline btn--sm" onClick={() => console.log('Mark implant')}>
                            Mark Implant
                          </button>
                        </div>
                      </div>

                        <button className="btn btn--primary btn--full" onClick={() => {
                          console.log('Save tooth', selectedTooth, toothNotes[selectedTooth]);
                          setSelectedTooth(null);
                        }}>
                          <Icon name="save" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
                  <Icon name="tooth" />
                  <h3 style={{ marginTop: 'var(--space-16)', marginBottom: 'var(--space-8)' }}>Chart Data Not Available</h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    Clinical charting data is not available from the backend yet. Once chart data is connected, it will appear here.
                  </p>
                </div>
              )
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
                <Icon name="tooth" />
                <h3 style={{ marginTop: 'var(--space-16)', marginBottom: 'var(--space-8)' }}>Select a Patient</h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Choose a patient from the dropdown above to view and edit their dental chart.
                </p>
              </div>
            )}

            {/* Conditions Summary */}
            {selectedChartingPatient && patientConditions.length > 0 && (
              <div className="card" style={{ marginTop: 'var(--space-24)' }}>
                <div className="card-header">
                  <h3 className="card-title"><Icon name="activity" /> Recorded Conditions</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-12)' }}>
                  {patientConditions.map((cond, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-12)',
                      padding: 'var(--space-12)',
                      background: 'var(--color-bg-1)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: cond.source === 'AI' ? '#7C3AED' : '#2563EB',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-bold)'
                      }}>
                        {cond.tooth}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{cond.condition}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {cond.source === 'AI' ? 'AI Detected' : 'Dentist Confirmed'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      }

      // ============== DENTIST MESSAGES ==============
      case 'dentist-messages':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Messages</h2>
            <MessagingSystem
              userId={currentDentistId}
              userName={currentDentistName}
              userRole="dentist"
            />
          </>
        );

      // ============== DENTIST TREATMENT PLANS ==============
      case 'dentist-treatment':
        return (
          <TreatmentPlanning
            userId={currentDentistId}
            userName={currentDentistName}
            userRole="dentist"
          />
        );

      default:
        return <p>View not found</p>;
    }
  };

  return (
    <DashboardLayout
      role="dentist"
      userName={currentDentistName}
      userId={currentDentistId}
      activeView={activeView}
      onViewChange={setActiveView}
      onProfileClick={() => setActiveView('dentist-profile')}
      badges={{
        'dentist-patients':
          backendJobs.filter(j => j.status === 'draft_ready' || j.status === 'segmentation_pending').length +
          pendingRequestsState.length,
      }}
    >
      {renderContent()}

      {/* Appointment Scheduler Modal */}
      {showScheduler && (
        <AppointmentScheduler
          userId={currentDentistId}
          userRole="dentist"
          dentistId={currentDentistId}
          dentistPatients={dentistPatientsForScheduler}
          onCreateAppointment={handleCreateAppointment}
          onClose={() => setShowScheduler(false)}
          onSuccess={(appointment) => {
            setAppointments((prev) => [appointment, ...prev]);
            setShowScheduler(false);
          }}
        />
      )}

    </DashboardLayout>
  );
};

export default DentistDashboard;
