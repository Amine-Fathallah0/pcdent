import { useState, useRef, useCallback, useEffect, useMemo, type JSX } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import AppointmentList from '../components/appointments/AppointmentList';
import AppointmentScheduler from '../components/appointments/AppointmentScheduler';
import MessagingSystem from '../components/MessagingSystem';
import TreatmentPlanning from '../components/TreatmentPlanning';
import { fetchJobs, fetchMyLinks, generateDraft, reviewJob, uploadCTScan, type AIJobDto } from '../lib/backendApi';
import {
  createCase,
  database,
  getCasesByDentist,
  getPatientsByDentist,
  getPendingRequestsByDentist,
  getAppointmentsByDentist,
  getUpcomingAppointments,
  getTodaysAppointments,
  addNotification,
  formatDate,
  formatDateTime,
  formatTime,
  getAppointmentTypeLabel,
  getStatusLabel,
  getStatusClass,
  type Case,
  type AssignmentRequest,
  type Appointment
} from '../data/database';

// Current dentist ID (would come from auth in real app)
const CURRENT_DENTIST_ID = 'dentist-001';

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
  'map-pin': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  award: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  briefcase: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  hash: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

const Icon = ({ name }: { name: string }) => icons[name] || <span>{name}</span>;

type InboxTab = 'new-uploads' | 'needs-review' | 'finalized';

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
      return 'Dentist Reviewed';
    case 'finalized':
      return 'Finalized';
    case 'failed':
      return 'Processing Failed';
    default:
      return 'Unknown Status';
  }
};

const mapBackendJobToCaseStatus = (status: AIJobDto['status']): Case['status'] => {
  switch (status) {
    case 'queued':
    case 'segmentation_pending':
      return 'UPLOADED';
    case 'report_requested':
      return 'AI_ANALYZED';
    case 'draft_ready':
    case 'failed':
      return 'NEEDS_REVIEW';
    case 'dentist_reviewed':
      return 'FINALIZED';
    case 'finalized':
      return 'SENT_TO_PATIENT';
    default:
      return 'UPLOADED';
  }
};

// Case Review Modal Component
const CaseReviewModal = ({
  caseData,
  onClose,
  onMarkReviewed,
  onSendToPatient
}: {
  caseData: Case;
  onClose: () => void;
  onMarkReviewed: (caseId: string, dentistNotes: string) => Promise<void>;
  onSendToPatient: (caseId: string, dentistNotes: string) => Promise<void>;
}) => {
  const [findingsState, setFindingsState] = useState(
    caseData.aiFindings.map(f => ({ ...f, reviewed: false, action: 'pending' as 'pending' | 'accepted' | 'modified' | 'rejected' }))
  );
  const [patientExplanation, setPatientExplanation] = useState(caseData.patientExplanation || '');

  const handleFindingAction = (findingId: string, action: 'accepted' | 'modified' | 'rejected') => {
    setFindingsState(prev => prev.map(f => 
      f.id === findingId ? { ...f, action, reviewed: true } : f
    ));
  };

  const allReviewed = findingsState.every(f => f.reviewed);

  return (
    <div className="modal-container" style={{ display: 'flex' }}>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Review Case: {caseData.patientName}</h2>
          <button className="close-modal" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        
        <div className="modal-body">
          {/* Case Info */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 'var(--space-16)', 
            marginBottom: 'var(--space-24)',
            padding: 'var(--space-16)',
            background: 'var(--color-bg-1)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div><strong>Patient:</strong> {caseData.patientName}</div>
            <div><strong>Image Type:</strong> {caseData.imageType}</div>
            <div><strong>Uploaded:</strong> {formatDateTime(caseData.uploadedAt)}</div>
            <div><strong>Status:</strong> <span className={`status-badge ${getStatusClass(caseData.status)}`}>{getStatusLabel(caseData.status)}</span></div>
          </div>

          {/* AI Findings Review */}
          <div style={{ marginBottom: 'var(--space-24)' }}>
            <h3 style={{ marginBottom: 'var(--space-16)' }}>AI Findings ({caseData.aiFindings.length})</h3>
            
            {findingsState.map((finding, index) => (
              <div key={finding.id} style={{
                padding: 'var(--space-16)',
                marginBottom: 'var(--space-12)',
                background: finding.action === 'accepted' ? '#D1FAE5' : 
                           finding.action === 'rejected' ? '#FEE2E2' : 
                           finding.action === 'modified' ? '#FEF3C7' : 'var(--color-bg-1)',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${finding.action === 'accepted' ? '#10B981' : 
                                    finding.action === 'rejected' ? '#EF4444' : 
                                    finding.action === 'modified' ? '#F59E0B' : 'var(--color-border)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-12)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)' }}>
                      Finding #{index + 1}: Tooth {finding.tooth}
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{finding.condition}</div>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    textTransform: 'uppercase',
                    background: finding.urgency === 'high' ? '#FEE2E2' : finding.urgency === 'medium' ? '#FEF3C7' : '#D1FAE5',
                    color: finding.urgency === 'high' ? '#B91C1C' : finding.urgency === 'medium' ? '#B45309' : '#047857'
                  }}>
                    {finding.urgency} priority
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-8)', marginBottom: 'var(--space-12)' }}>
                  <div><strong>Severity:</strong> {finding.severity}</div>
                  <div><strong>Confidence:</strong> {Math.round(finding.confidence * 100)}%</div>
                  <div><strong>ICD-10:</strong> {finding.icd10}</div>
                  <div><strong>CDT:</strong> {finding.cdt_code}</div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                  <button 
                    className={`btn btn--sm ${finding.action === 'accepted' ? 'btn--success' : 'btn--outline'}`}
                    onClick={() => handleFindingAction(finding.id, 'accepted')}
                  >
                    <Icon name="check-circle" /> Accept
                  </button>
                  <button 
                    className={`btn btn--sm ${finding.action === 'modified' ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => handleFindingAction(finding.id, 'modified')}
                  >
                    <Icon name="edit" /> Modify
                  </button>
                  <button 
                    className={`btn btn--sm ${finding.action === 'rejected' ? 'btn--danger' : 'btn--outline'}`}
                    onClick={() => handleFindingAction(finding.id, 'rejected')}
                  >
                    <Icon name="x-circle" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Patient Explanation */}
          <div style={{ marginBottom: 'var(--space-24)' }}>
            <h3 style={{ marginBottom: 'var(--space-12)' }}>Patient Explanation</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>
              Write a clear, easy-to-understand summary for the patient about the findings.
            </p>
            <textarea
              value={patientExplanation}
              onChange={(e) => setPatientExplanation(e.target.value)}
              placeholder="Explain the findings in patient-friendly language..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: 'var(--space-12)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-base)',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ 
          borderTop: '1px solid var(--color-border)', 
          padding: 'var(--space-16)', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: 'var(--color-text-secondary)' }}>
            {allReviewed ? '✓ All findings reviewed' : `${findingsState.filter(f => f.reviewed).length}/${findingsState.length} findings reviewed`}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
            <button
              className="btn btn--outline"
              onClick={() => {
                void onMarkReviewed(caseData.id, patientExplanation);
              }}
            >
              Save Draft
            </button>
            <button 
              className="btn btn--primary" 
              disabled={!allReviewed}
              onClick={() => {
                void onSendToPatient(caseData.id, patientExplanation);
              }}
            >
              <Icon name="send" /> Finalize & Send to Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DentistDashboard = () => {
  const [activeView, setActiveView] = useState('dentist-dashboard');
  const [activeInboxTab, setActiveInboxTab] = useState<InboxTab>('new-uploads');
  const [inboxDataSource, setInboxDataSource] = useState<'mock' | 'backend'>('mock');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(getAppointmentsByDentist(CURRENT_DENTIST_ID));
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render for dynamic data
  const [backendJobs, setBackendJobs] = useState<AIJobDto[]>([]);
  const [backendJobsLoading, setBackendJobsLoading] = useState(false);
  const [backendJobsError, setBackendJobsError] = useState<string | null>(null);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: database.dentistProfile.name,
    email: database.dentistProfile.email,
    phone: database.dentistProfile.phone,
    clinic: database.dentistProfile.clinic,
    specialization: database.dentistProfile.specialization,
    address: database.dentistProfile.address,
    availability: database.dentistProfile.availability
  });
  
  // Pending requests state (dynamic management)
  const [pendingRequestsState, setPendingRequestsState] = useState<AssignmentRequest[]>(
    getPendingRequestsByDentist(CURRENT_DENTIST_ID)
  );
  const [requestInfoModal, setRequestInfoModal] = useState<{ show: boolean; request: AssignmentRequest | null; message: string }>({
    show: false,
    request: null,
    message: ''
  });
  
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
    if (activeView !== 'dentist-inbox') {
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

  useEffect(() => {
    void loadJobs();
  }, [loadJobs, refreshKey]);

  useEffect(() => {
    if (activeView !== 'dentist-inbox') {
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

  // Get dynamic data from database
  const dentistCases = getCasesByDentist(CURRENT_DENTIST_ID);
  const myPatients = getPatientsByDentist(CURRENT_DENTIST_ID);
  const { dentistProfile } = database;
  const upcomingAppointments = getUpcomingAppointments(CURRENT_DENTIST_ID, 'dentist');
  const todaysAppointments = getTodaysAppointments(CURRENT_DENTIST_ID);

  const backendJobsById = useMemo(() => {
    const map = new Map<string, AIJobDto>();
    for (const job of backendJobs) {
      map.set(job.job_id, job);
    }
    return map;
  }, [backendJobs]);

  const resolvedDentistCases = useMemo(
    () =>
      dentistCases.map((caseItem) => {
        const linkedJob = caseItem.backendJobId ? backendJobsById.get(caseItem.backendJobId) : undefined;
        if (!linkedJob) {
          return caseItem;
        }

        return {
          ...caseItem,
          status: mapBackendJobToCaseStatus(linkedJob.status),
          uploadedAt: linkedJob.created_at || caseItem.uploadedAt,
          aiAnalyzedAt: linkedJob.updated_at || caseItem.aiAnalyzedAt,
          finalizedAt: linkedJob.completed_at || caseItem.finalizedAt,
          sentAt:
            linkedJob.status === 'finalized'
              ? linkedJob.completed_at || caseItem.sentAt || caseItem.finalizedAt
              : caseItem.sentAt,
          patientExplanation: caseItem.patientExplanation || linkedJob.draft_report || null,
        };
      }),
    [dentistCases, backendJobsById]
  );

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/dicom'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.dcm')) {
      return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or DICOM files.' };
    }
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 10MB.' };
    }
    return { valid: true };
  };

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

    const patient = myPatients.find(p => p.id === selectedPatientForUpload);
    if (!patient) return;

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

    await new Promise(resolve => setTimeout(resolve, 1500));
    clearInterval(uploadInterval);
    setUploadProgress(100);

    setUploadStatus('processing');

    try {
      const links = await fetchMyLinks();
      const activeLink = links[0];
      if (!activeLink) {
        throw new Error('No active patient links found for this dentist account.');
      }

      const uploaded = await uploadCTScan(
        activeLink.id,
        uploadedFile,
        `Dentist upload for ${patient.name}: ${uploadedFile.name}`
      );

      const createdCase = createCase(
        patient.id,
        patient.name,
        patient.email,
        CURRENT_DENTIST_ID,
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
      setRefreshKey(prev => prev + 1);

      addNotification({
        userId: CURRENT_DENTIST_ID,
        userRole: 'dentist',
        type: 'case',
        title: 'Scan Uploaded',
        message: 'Scan uploaded successfully. Draft report is ready for review.',
        actionUrl: 'dentist-inbox'
      });

      setTimeout(() => {
        setUploadedFile(null);
        setUploadPreview(null);
        setUploadProgress(0);
        setUploadStatus('idle');
        setSelectedPatientForUpload('');
        setActiveView('dentist-inbox');
      }, 2000);
    } catch (error) {
      console.error(error);
      setUploadStatus('error');
    }
  }, [uploadedFile, selectedPatientForUpload, myPatients]);

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
  const totalPatients = myPatients.length;
  const highRiskAlerts = resolvedDentistCases.filter(c => c.aiFindings.some(f => f.urgency === 'high') && c.status !== 'SENT_TO_PATIENT').length;
  const casesThisMonth = resolvedDentistCases.filter(c => {
    const caseDate = new Date(c.uploadedAt);
    const now = new Date();
    return caseDate.getMonth() === now.getMonth() && caseDate.getFullYear() === now.getFullYear();
  }).length;

  // Case filtering
  const newUploads = resolvedDentistCases.filter(c => c.status === 'AI_ANALYZED' || c.status === 'UPLOADED');
  const needsReview = resolvedDentistCases.filter(c => c.status === 'NEEDS_REVIEW');
  const finalized = resolvedDentistCases.filter(c => c.status === 'FINALIZED' || c.status === 'SENT_TO_PATIENT');

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

  const getCurrentTabCases = () => {
    switch (activeInboxTab) {
      case 'new-uploads': return newUploads;
      case 'needs-review': return needsReview;
      case 'finalized': return finalized;
      default: return newUploads;
    }
  };

  const getCurrentTabJobs = () => {
    switch (activeInboxTab) {
      case 'new-uploads': return backendNewUploads;
      case 'needs-review': return backendNeedsReview;
      case 'finalized': return backendFinalized;
      default: return backendNewUploads;
    }
  };

  // Pending request handlers
  const handleAcceptPatient = (requestId: string) => {
    setPendingRequestsState(prev => prev.filter(r => r.id !== requestId));
    setActionFeedback({ type: 'success', message: 'Patient accepted successfully! They will be notified.' });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleRejectPatient = (requestId: string) => {
    setPendingRequestsState(prev => prev.filter(r => r.id !== requestId));
    setActionFeedback({ type: 'info', message: 'Patient request has been declined.' });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleRequestInfo = (request: AssignmentRequest) => {
    setRequestInfoModal({ show: true, request, message: '' });
  };

  const sendInfoRequest = () => {
    if (requestInfoModal.request && requestInfoModal.message.trim()) {
      // Update request status to show info was requested
      setPendingRequestsState(prev => prev.map(r => 
        r.id === requestInfoModal.request!.id 
          ? { ...r, additionalInfo: 'Info requested: ' + requestInfoModal.message }
          : r
      ));
      setRequestInfoModal({ show: false, request: null, message: '' });
      setActionFeedback({ type: 'info', message: 'Information request sent to patient.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Profile handlers
  const handleProfileSave = () => {
    // In real app, this would save to backend
    Object.assign(database.dentistProfile, {
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      clinic: profileForm.clinic,
      specialization: profileForm.specialization,
      address: profileForm.address,
      availability: profileForm.availability
    });
    setIsEditingProfile(false);
    setActionFeedback({ type: 'success', message: 'Profile updated successfully!' });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleProfileCancel = () => {
    setProfileForm({
      name: database.dentistProfile.name,
      email: database.dentistProfile.email,
      phone: database.dentistProfile.phone,
      clinic: database.dentistProfile.clinic,
      specialization: database.dentistProfile.specialization,
      address: database.dentistProfile.address,
      availability: database.dentistProfile.availability
    });
    setIsEditingProfile(false);
  };

  // Handle review case
  const handleReviewCase = (caseItem: Case) => {
    const resolvedCase = caseItem.backendJobId ? resolvedDentistCases.find(c => c.id === caseItem.id) || caseItem : caseItem;
    setSelectedCase(resolvedCase);
    setShowReviewModal(true);
  };

  // Handle send to patient
  const handleMarkReviewed = async (caseId: string, dentistNotes: string) => {
    const targetCase = resolvedDentistCases.find(c => c.id === caseId) || dentistCases.find(c => c.id === caseId);
    if (!targetCase) {
      setActionFeedback({ type: 'error', message: 'Unable to find the selected case.' });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    try {
      if (targetCase.backendJobId) {
        await reviewJob(targetCase.backendJobId, 'reviewed', dentistNotes);
      }

      const caseRecord = (database.cases as Case[]).find(c => c.id === caseId);
      if (caseRecord) {
        caseRecord.status = 'FINALIZED';
        caseRecord.reviewedAt = new Date().toISOString();
        caseRecord.patientExplanation = dentistNotes || caseRecord.patientExplanation;
      }

      setShowReviewModal(false);
      setSelectedCase(null);
      setRefreshKey(prev => prev + 1);
      setActionFeedback({ type: 'success', message: 'Review saved and synced with backend.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (error) {
      console.error(error);
      setActionFeedback({ type: 'error', message: 'Failed to save reviewed state in backend.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleSendToPatient = async (caseId: string, dentistNotes: string) => {
    const targetCase = resolvedDentistCases.find(c => c.id === caseId) || dentistCases.find(c => c.id === caseId);
    if (!targetCase) {
      setActionFeedback({ type: 'error', message: 'Unable to find the selected case.' });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    try {
      if (targetCase.backendJobId) {
        await reviewJob(targetCase.backendJobId, 'finalized', dentistNotes || targetCase.patientExplanation || 'Finalized by dentist');
      }

      const caseRecord = (database.cases as Case[]).find(c => c.id === caseId);
      if (caseRecord) {
        caseRecord.status = 'SENT_TO_PATIENT';
        caseRecord.finalizedAt = caseRecord.finalizedAt || new Date().toISOString();
        caseRecord.sentAt = new Date().toISOString();
        caseRecord.patientExplanation = dentistNotes || caseRecord.patientExplanation;
      }

      setShowReviewModal(false);
      setSelectedCase(null);
      setRefreshKey(prev => prev + 1);
      setActionFeedback({ type: 'success', message: 'Case finalized and synced with backend.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (error) {
      console.error(error);
      setActionFeedback({ type: 'error', message: 'Failed to finalize case in backend.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Generate tooth data from cases for selected patient
  const generateToothData = (patientId: string) => {
    const toothData: Record<number, { surfaces?: Record<string, string>, status?: string, aiDetected?: boolean, condition?: string }> = {};
    
    const patientCases = dentistCases.filter(c => c.patientId === patientId);
    
    patientCases.forEach(caseItem => {
      caseItem.aiFindings.forEach(finding => {
        toothData[finding.tooth] = {
          surfaces: { O: 'finding' },
          aiDetected: true,
          condition: finding.condition
        };
      });
      caseItem.finalFindings.forEach(finding => {
        if (finding.status === 'accepted') {
          toothData[finding.tooth] = {
            surfaces: { O: 'completed' },
            aiDetected: false,
            condition: finding.condition
          };
        } else if (finding.status === 'modified') {
          toothData[finding.tooth] = {
            surfaces: { O: 'planned' },
            aiDetected: false,
            condition: finding.condition
          };
        }
      });
    });
    
    return toothData;
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
    const toothData = selectedChartingPatient ? generateToothData(selectedChartingPatient) : {};

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
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Patients</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-1)', color: '#2563EB' }}>
                    <Icon name="users" />
                  </div>
                </div>
                <div className="stat-value">{totalPatients}</div>
                <div className="stat-change positive">Active patients</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">High-Risk Alerts</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-4)', color: '#EF4444' }}>
                    <Icon name="alert-triangle" />
                  </div>
                </div>
                <div className="stat-value">{highRiskAlerts}</div>
                <div className="stat-change">Requires attention</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Pending Reviews</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-2)', color: '#F59E0B' }}>
                    <Icon name="clock" />
                  </div>
                </div>
                <div className="stat-value">{needsReview.length + newUploads.length}</div>
                <div className="stat-change">Cases awaiting review</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Cases This Month</span>
                  <div className="stat-icon" style={{ background: 'var(--color-bg-3)', color: '#10B981' }}>
                    <Icon name="activity" />
                  </div>
                </div>
                <div className="stat-value">{casesThisMonth}</div>
                <div className="stat-change">Avg {(casesThisMonth / 30).toFixed(1)}/day</div>
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
                  {dentistCases.slice(0, 5).map(caseItem => (
                    <div className="recent-case-item" key={caseItem.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-12)',
                      borderBottom: '1px solid var(--color-border)'
                    }}>
                      <div className="case-patient-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
                        <div className="case-patient-avatar" style={{
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
                          {caseItem.patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="case-patient-name" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{caseItem.patientName}</div>
                          <div className="case-type" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{caseItem.imageType}</div>
                        </div>
                      </div>
                      <div className="case-status" style={{ textAlign: 'right' }}>
                        <span className={`status-badge ${getStatusClass(caseItem.status)}`}>{getStatusLabel(caseItem.status)}</span>
                        <div className="case-date" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)' }}>
                          {formatDate(caseItem.uploadedAt)}
                        </div>
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
                    Review Pending Cases ({needsReview.length + newUploads.length})
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-appointments')}>
                    <Icon name="calendar" />
                    Appointments ({upcomingAppointments.length})
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-patients')}>
                    <Icon name="users" />
                    Patient Management
                  </button>
                  {pendingRequestsState.length > 0 && (
                    <button className="btn btn--outline btn--full" onClick={() => setActiveView('dentist-pending')} style={{ borderColor: '#F59E0B', color: '#B45309' }}>
                      <Icon name="user-plus" />
                      Pending Requests ({pendingRequestsState.length})
                    </button>
                  )}
                </div>

                {/* Today's Appointments Preview */}
                {todaysAppointments.length > 0 && (
                  <div style={{ 
                    marginTop: 'var(--space-16)', 
                    padding: 'var(--space-12)', 
                    background: '#FEF3C7', 
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid #F59E0B'
                  }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#B45309', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                      TODAY'S SCHEDULE
                    </div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
                      {todaysAppointments.length} Appointment{todaysAppointments.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      Next: {todaysAppointments[0].patientName} at {formatTime(todaysAppointments[0].time)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      // ============== DENTIST INBOX ==============
      case 'dentist-inbox':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Case Inbox</h2>
            
            <div className="inbox-tabs" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-24)', borderBottom: '2px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
              <button 
                className={`inbox-tab ${activeInboxTab === 'new-uploads' ? 'active' : ''}`}
                onClick={() => setActiveInboxTab('new-uploads')}
                style={{
                  padding: 'var(--space-12) var(--space-16)',
                  border: 'none',
                  background: activeInboxTab === 'new-uploads' ? 'var(--color-primary)' : 'transparent',
                  color: activeInboxTab === 'new-uploads' ? 'white' : 'var(--color-text)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  cursor: 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-8)'
                }}
              >
                New Uploads
                <span style={{ background: 'var(--color-bg-2)', padding: '2px 8px', borderRadius: '12px', fontSize: 'var(--font-size-xs)' }}>
                  {newUploads.length}/{backendNewUploads.length}
                </span>
              </button>
              <button 
                className={`inbox-tab ${activeInboxTab === 'needs-review' ? 'active' : ''}`}
                onClick={() => setActiveInboxTab('needs-review')}
                style={{
                  padding: 'var(--space-12) var(--space-16)',
                  border: 'none',
                  background: activeInboxTab === 'needs-review' ? 'var(--color-primary)' : 'transparent',
                  color: activeInboxTab === 'needs-review' ? 'white' : 'var(--color-text)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  cursor: 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-8)'
                }}
              >
                Needs Review
                <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: '12px', fontSize: 'var(--font-size-xs)' }}>
                  {needsReview.length}/{backendNeedsReview.length}
                </span>
              </button>
              <button 
                className={`inbox-tab ${activeInboxTab === 'finalized' ? 'active' : ''}`}
                onClick={() => setActiveInboxTab('finalized')}
                style={{
                  padding: 'var(--space-12) var(--space-16)',
                  border: 'none',
                  background: activeInboxTab === 'finalized' ? 'var(--color-primary)' : 'transparent',
                  color: activeInboxTab === 'finalized' ? 'white' : 'var(--color-text)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  cursor: 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-8)'
                }}
              >
                Finalized / Sent
                <span style={{ background: '#D1FAE5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontSize: 'var(--font-size-xs)' }}>
                  {finalized.length}/{backendFinalized.length}
                </span>
              </button>
            </div>

            <div className="inbox-content">
              <div className="card" style={{ marginBottom: 'var(--space-16)' }}>
                <div
                  className="card-header"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-12)', flexWrap: 'wrap' }}
                >
                  <div>
                    <h3 className="card-title" style={{ marginBottom: 'var(--space-8)' }}>Inbox Data Source</h3>
                    <div style={{ display: 'inline-flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <button
                        className="btn btn--sm"
                        onClick={() => setInboxDataSource('mock')}
                        style={{
                          border: 'none',
                          borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                          background: inboxDataSource === 'mock' ? 'var(--color-primary)' : 'transparent',
                          color: inboxDataSource === 'mock' ? '#FFFFFF' : 'var(--color-text)'
                        }}
                      >
                        Mock Cases
                      </button>
                      <button
                        className="btn btn--sm"
                        onClick={() => setInboxDataSource('backend')}
                        style={{
                          border: 'none',
                          borderLeft: '1px solid var(--color-border)',
                          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                          background: inboxDataSource === 'backend' ? 'var(--color-primary)' : 'transparent',
                          color: inboxDataSource === 'backend' ? '#FFFFFF' : 'var(--color-text)'
                        }}
                      >
                        Backend Jobs
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn btn--outline btn--sm"
                    onClick={() => setRefreshKey(prev => prev + 1)}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {inboxDataSource === 'backend' ? (
                backendJobsLoading ? (
                  <div className="empty-state card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
                    <h3>Loading backend jobs...</h3>
                  </div>
                ) : backendJobsError ? (
                  <div className="empty-state card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
                    <h3 style={{ color: '#B91C1C' }}>Unable to load backend jobs</h3>
                    <p>{backendJobsError}</p>
                  </div>
                ) : getCurrentTabJobs().length > 0 ? (
                  <div className="case-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-16)' }}>
                    {getCurrentTabJobs().map(job => (
                      <div className="case-card card" key={job.job_id}>
                        <div className="case-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-12)' }}>
                          <div>
                            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>Backend Job</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                              {job.job_id.slice(0, 12)}...
                            </div>
                          </div>
                          <span className="status-badge">{getBackendJobStatusLabel(job.status)}</span>
                        </div>

                        <div style={{ display: 'grid', gap: 'var(--space-8)', marginBottom: 'var(--space-12)' }}>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            CT Scan ID: {job.ct_scan_id}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            Created: {formatDate(job.created_at)}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            Fallback Mode: {job.is_fallback_mode ? 'Yes' : 'No'}
                          </div>
                        </div>

                        <div style={{
                          fontSize: 'var(--font-size-sm)',
                          padding: 'var(--space-10)',
                          background: 'var(--color-bg-1)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-secondary)',
                          minHeight: '72px'
                        }}>
                          {job.draft_report
                            ? `${job.draft_report.slice(0, 140)}${job.draft_report.length > 140 ? '...' : ''}`
                            : 'No draft text available yet for this job.'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state card" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
                    <Icon name="check-circle" />
                    <h3>All Caught Up!</h3>
                    <p>No backend jobs in this category.</p>
                  </div>
                )
              ) : getCurrentTabCases().length > 0 ? (
                <div className="case-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-16)' }}>
                  {getCurrentTabCases().map(caseItem => (
                    <div className={`case-card card ${caseItem.aiFindings.some(f => f.urgency === 'high') ? 'has-urgent' : ''}`} key={caseItem.id} style={{
                      borderLeft: caseItem.aiFindings.some(f => f.urgency === 'high') ? '4px solid #EF4444' : 'none'
                    }}>
                      <div className="case-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-12)' }}>
                        <div className="case-patient" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
                          <div className="case-avatar" style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'var(--font-weight-bold)'
                          }}>
                            {caseItem.patientName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="case-patient-name" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{caseItem.patientName}</div>
                            <div className="case-meta" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{caseItem.imageType}</div>
                          </div>
                        </div>
                        <span className={`status-badge ${getStatusClass(caseItem.status)}`}>{getStatusLabel(caseItem.status)}</span>
                      </div>
                      
                      <div className="case-card-body" style={{ marginBottom: 'var(--space-16)' }}>
                        <div className="case-stats" style={{ display: 'flex', gap: 'var(--space-16)', marginBottom: 'var(--space-12)' }}>
                          <div className="case-stat" style={{ textAlign: 'center' }}>
                            <span className="stat-number" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>{caseItem.aiFindings.length}</span>
                            <span className="stat-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>AI Findings</span>
                          </div>
                          {caseItem.aiFindings.filter(f => f.urgency === 'high').length > 0 && (
                            <div className="case-stat urgent" style={{ textAlign: 'center' }}>
                              <span className="stat-number" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: '#EF4444' }}>{caseItem.aiFindings.filter(f => f.urgency === 'high').length}</span>
                              <span className="stat-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>High Priority</span>
                            </div>
                          )}
                        </div>
                        <div className="case-date" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                          <Icon name="clock" /> Uploaded {formatDate(caseItem.uploadedAt)}
                        </div>
                      </div>
                      
                      <div className="case-card-actions">
                        {(caseItem.status === 'NEEDS_REVIEW' || caseItem.status === 'AI_ANALYZED') ? (
                          <button className="btn btn--primary btn--full" onClick={() => handleReviewCase(caseItem)}>
                            <Icon name="eye" /> Review Case
                          </button>
                        ) : caseItem.status === 'FINALIZED' ? (
                          <button className="btn btn--success btn--full" onClick={() => void handleSendToPatient(caseItem.id, caseItem.patientExplanation || '')}>
                            <Icon name="send" /> Send to Patient
                          </button>
                        ) : (
                          <button className="btn btn--outline btn--full" onClick={() => handleReviewCase(caseItem)}>
                            <Icon name="eye" /> View Details
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
            </div>
          </>
        );

      // ============== DENTIST UPLOAD (Panoramic Only) ==============
      case 'dentist-upload':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>New AI Analysis</h2>
            
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
                <span style={{ color: 'var(--color-text-secondary)' }}>This system is optimized for panoramic radiograph analysis.</span>
              </div>
            </div>

            {/* Status Messages */}
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
                  <strong>Upload Complete!</strong> Case created and AI analysis complete. Redirecting to inbox...
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: 'var(--space-24)' }}>
              <div className="card-header">
                <h3 className="card-title">Select Patient</h3>
              </div>
              <select 
                className="form-select" 
                style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                value={selectedPatientForUpload}
                onChange={(e) => setSelectedPatientForUpload(e.target.value)}
              >
                <option value="">-- Select Patient --</option>
                {myPatients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                ))}
              </select>
              {!selectedPatientForUpload && uploadedFile && (
                <div style={{ color: '#B45309', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-8)' }}>
                  ⚠️ Please select a patient before uploading
                </div>
              )}
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
                    Full mouth view • Optimized for AI analysis
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
                    {isDragging ? 'Drop your file here' : 'Drag and drop Panoramic X-ray here'}
                  </div>
                  <div className="upload-hint" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-16)' }}>
                    Formats: JPG, PNG, DICOM. Max: 10MB
                  </div>
                  <button className="btn btn--outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Browse Files
                  </button>
                </div>
              ) : (
                <div className="upload-preview" style={{ marginBottom: 'var(--space-16)' }}>
                  <div style={{
                    display: 'flex',
                    gap: 'var(--space-20)',
                    padding: 'var(--space-16)',
                    background: 'var(--color-bg-1)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-16)'
                  }}>
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
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-8)' }}>
                        {uploadedFile.name}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-12)' }}>
                        Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Type: {uploadedFile.type || 'DICOM'}
                      </div>
                      
                      {selectedPatientForUpload && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 'var(--space-8)', 
                          marginBottom: 'var(--space-12)',
                          padding: 'var(--space-8)',
                          background: 'var(--color-bg-2)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <Icon name="users" />
                          <span>{myPatients.find(p => p.id === selectedPatientForUpload)?.name}</span>
                        </div>
                      )}
                      
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
                              <span className="spinner"></span>
                              Detecting dental conditions using AI...
                            </div>
                          )}
                        </div>
                      )}
                      
                      {uploadStatus === 'idle' && (
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
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
                    {uploadStatus === 'idle' && (
                      <>
                        <button 
                          className="btn btn--primary" 
                          onClick={handleUpload}
                          style={{ flex: 1 }}
                          disabled={!selectedPatientForUpload}
                        >
                          <Icon name="upload" /> Upload & Analyze
                        </button>
                        <button className="btn btn--outline" onClick={clearUpload}>
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
            </div>
          </>
        );

      // ============== DENTIST PENDING PATIENTS ==============
      case 'dentist-pending':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>Pending Patient Requests</h2>
            
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
                <Icon name={actionFeedback.type === 'success' ? 'check-circle' : actionFeedback.type === 'error' ? 'x-circle' : 'info'} />
                <span>{actionFeedback.message}</span>
              </div>
            )}
            
            {pendingRequestsState.length > 0 && (
              <div className="alert info" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-12)', 
                padding: 'var(--space-16)', 
                background: 'var(--color-bg-1)', 
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-24)',
                borderLeft: '4px solid var(--color-primary)'
              }}>
                <Icon name="user-plus" />
                <span>You have <strong>{pendingRequestsState.length}</strong> pending patient request(s) awaiting your review.</span>
              </div>
            )}
            
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Approval Queue</h3>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {pendingRequestsState.length} request(s)
                </span>
              </div>
              
              {pendingRequestsState.length > 0 ? (
                <div className="pending-patients-list">
                  {pendingRequestsState.map(request => (
                    <div className="pending-patient-card" key={request.id} style={{
                      padding: 'var(--space-20)',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.2s ease'
                    }}>
                      <div className="pending-patient-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-16)', marginBottom: 'var(--space-16)' }}>
                        <div className="patient-avatar pending" style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                          color: '#B45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'var(--font-weight-bold)',
                          fontSize: 'var(--font-size-lg)',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
                        }}>
                          {request.patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="pending-patient-info" style={{ flex: 1 }}>
                          <div className="patient-name" style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{request.patientName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
                            <Icon name="mail" />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{request.patientEmail}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                            <Icon name="calendar" />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Requested: {request.requestedAt}</span>
                          </div>
                        </div>
                        <span className="status-badge pending" style={{ 
                          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', 
                          color: '#B45309', 
                          padding: '6px 14px', 
                          borderRadius: '20px', 
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-4)'
                        }}>
                          <Icon name="clock" /> Pending
                        </span>
                      </div>
                      
                      {request.message && (
                        <div className="patient-message" style={{ 
                          background: 'var(--color-bg-1)', 
                          padding: 'var(--space-16)', 
                          borderRadius: 'var(--radius-md)',
                          marginBottom: 'var(--space-16)',
                          borderLeft: '3px solid var(--color-primary)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
                            <Icon name="message-circle" />
                            <strong style={{ fontSize: 'var(--font-size-sm)' }}>Message from patient:</strong>
                          </div>
                          <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>{request.message}</p>
                        </div>
                      )}

                      {request.additionalInfo && (
                        <div style={{ 
                          background: '#DBEAFE', 
                          padding: 'var(--space-12)', 
                          borderRadius: 'var(--radius-md)',
                          marginBottom: 'var(--space-16)',
                          fontSize: 'var(--font-size-sm)',
                          color: '#1D4ED8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-8)'
                        }}>
                          <Icon name="info" />
                          <span>{request.additionalInfo}</span>
                        </div>
                      )}
                      
                      <div className="pending-actions" style={{ display: 'flex', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn--success btn--sm" 
                          onClick={() => handleAcceptPatient(request.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', padding: 'var(--space-8) var(--space-16)' }}
                        >
                          <Icon name="user-check" /> Accept Patient
                        </button>
                        <button 
                          className="btn btn--outline btn--sm"
                          onClick={() => handleRequestInfo(request)}
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', padding: 'var(--space-8) var(--space-16)' }}
                        >
                          <Icon name="message-circle" /> Request Info
                        </button>
                        <button 
                          className="btn btn--danger btn--sm"
                          onClick={() => handleRejectPatient(request.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', padding: 'var(--space-8) var(--space-16)' }}
                        >
                          <Icon name="user-x" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: '#D1FAE5', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto var(--space-16)',
                    color: '#10B981'
                  }}>
                    <Icon name="check-circle" />
                  </div>
                  <h3 style={{ marginBottom: 'var(--space-8)' }}>All Caught Up!</h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>No pending patient requests to review.</p>
                </div>
              )}
            </div>
          </>
        );

      // ============== DENTIST PATIENTS ==============
      case 'dentist-patients':
        return (
          <>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-24)' }}>My Patients</h2>
            
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Active Patients ({myPatients.length})</h3>
                <input type="text" className="form-input" placeholder="Search patients..." style={{ width: '250px', padding: 'var(--space-8) var(--space-12)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              
              {myPatients.length > 0 ? (
                <div className="patients-list">
                  {myPatients.map(patient => {
                    const patientCases = dentistCases.filter(c => c.patientId === patient.id);
                    return (
                      <div className="patient-card" key={patient.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 'var(--space-16)',
                        borderBottom: '1px solid var(--color-border)',
                        gap: 'var(--space-16)'
                      }}>
                        <div className="patient-avatar" style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'var(--font-weight-bold)'
                        }}>
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="patient-info" style={{ flex: 1 }}>
                          <div className="patient-name" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{patient.name}</div>
                          <div className="patient-meta" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{patient.email}</div>
                          <div className="patient-meta" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{patient.phone || 'No phone'}</div>
                        </div>
                        <div className="patient-stats" style={{ display: 'flex', gap: 'var(--space-24)' }}>
                          <div className="patient-stat" style={{ textAlign: 'center' }}>
                            <span className="stat-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Last Visit</span>
                            <span className="stat-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{patient.lastVisit}</span>
                          </div>
                          <div className="patient-stat" style={{ textAlign: 'center' }}>
                            <span className="stat-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Cases</span>
                            <span className="stat-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{patientCases.length}</span>
                          </div>
                        </div>
                        <div className="patient-actions" style={{ display: 'flex', gap: 'var(--space-8)' }}>
                          <button className="btn btn--primary btn--sm">
                            <Icon name="file-text" /> View Details
                          </button>
                          <button className="btn btn--outline btn--sm" onClick={() => setActiveView('dentist-upload')}>
                            <Icon name="upload" /> New Analysis
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: 'var(--space-48)' }}>
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

            <AppointmentList
              appointments={appointments}
              userRole="dentist"
              onRefresh={() => setAppointments(getAppointmentsByDentist(CURRENT_DENTIST_ID))}
              onScheduleNew={() => setShowScheduler(true)}
            />
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
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.name}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="mail" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.email}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="hash" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dentist Code</span>
                        <span className="profile-value code" style={{ fontWeight: 'var(--font-weight-bold)', fontFamily: 'monospace', background: 'var(--color-primary)', color: 'white', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>{dentistProfile.dentistCode}</span>
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
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.clinic}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="award" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Specialization</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.specialization}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="phone" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.phone}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="map-pin" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.address}</span>
                      </div>
                    </div>
                    <div className="profile-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}><Icon name="clock" /></div>
                      <div>
                        <span className="profile-label" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Availability</span>
                        <span className="profile-value" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dentistProfile.availability}</span>
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
                        <div><strong>Dentist Code:</strong> {dentistProfile.dentistCode}</div>
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
                    <span className="stat-number" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)', display: 'block' }}>{myPatients.length}</span>
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
        const chartingPatient = myPatients.find(p => p.id === selectedChartingPatient);
        const patientToothData = selectedChartingPatient ? generateToothData(selectedChartingPatient) : {};
        const patientConditions = selectedChartingPatient 
          ? dentistCases
              .filter(c => c.patientId === selectedChartingPatient)
              .flatMap(c => [...c.aiFindings.map(f => ({ tooth: f.tooth, condition: f.condition, source: 'AI' as const })),
                            ...c.finalFindings.filter(f => f.status !== 'rejected').map(f => ({ tooth: f.tooth, condition: f.condition, source: 'Dentist' as const }))])
          : [];
        
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
                  {myPatients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
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
                      {chartingPatient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{chartingPatient.name}</div>
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
              <div style={{ display: 'grid', gridTemplateColumns: selectedTooth ? '2fr 1fr' : '1fr', gap: 'var(--space-24)' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title"><Icon name="tooth" /> Dental Chart - {chartingPatient?.name}</h3>
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
              userId={CURRENT_DENTIST_ID}
              userName={dentistProfile.name}
              userRole="dentist"
            />
          </>
        );

      // ============== DENTIST TREATMENT PLANS ==============
      case 'dentist-treatment':
        return (
          <TreatmentPlanning
            userId={CURRENT_DENTIST_ID}
            userName={dentistProfile.name}
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
      userName={dentistProfile.name}
      userId={CURRENT_DENTIST_ID}
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {renderContent()}
      
      {/* Case Review Modal */}
      {showReviewModal && selectedCase && (
        <CaseReviewModal
          caseData={selectedCase}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedCase(null);
          }}
          onMarkReviewed={handleMarkReviewed}
          onSendToPatient={handleSendToPatient}
        />
      )}

      {/* Appointment Scheduler Modal */}
      {showScheduler && (
        <AppointmentScheduler
          userId={CURRENT_DENTIST_ID}
          userRole="dentist"
          dentistId={CURRENT_DENTIST_ID}
          onClose={() => setShowScheduler(false)}
          onSuccess={(appointment) => {
            setAppointments([...appointments, appointment]);
            setShowScheduler(false);
          }}
        />
      )}

      {/* Request Info Modal */}
      {requestInfoModal.show && requestInfoModal.request && (
        <div className="modal-container" style={{ display: 'flex' }}>
          <div className="modal-backdrop" onClick={() => setRequestInfoModal({ show: false, request: null, message: '' })}></div>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Request More Information</h2>
              <button className="close-modal" onClick={() => setRequestInfoModal({ show: false, request: null, message: '' })}>
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 'var(--space-16)', padding: 'var(--space-12)', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'var(--font-weight-bold)'
                  }}>
                    {requestInfoModal.request.patientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{requestInfoModal.request.patientName}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{requestInfoModal.request.patientEmail}</div>
                  </div>
                </div>
              </div>
              
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-8)' }}>
                What information do you need from this patient?
              </label>
              <textarea
                value={requestInfoModal.message}
                onChange={(e) => setRequestInfoModal(prev => ({ ...prev, message: e.target.value }))}
                placeholder="e.g., Please provide your medical history, previous dental records, or insurance information..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: 'var(--space-12)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  fontSize: 'var(--font-size-base)',
                  resize: 'vertical'
                }}
              />
            </div>
            <div className="modal-footer" style={{ 
              borderTop: '1px solid var(--color-border)', 
              padding: 'var(--space-16)', 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: 'var(--space-12)'
            }}>
              <button className="btn btn--outline" onClick={() => setRequestInfoModal({ show: false, request: null, message: '' })}>
                Cancel
              </button>
              <button 
                className="btn btn--primary" 
                onClick={sendInfoRequest}
                disabled={!requestInfoModal.message.trim()}
              >
                <Icon name="send" /> Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DentistDashboard;
