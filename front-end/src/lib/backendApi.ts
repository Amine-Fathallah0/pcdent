import api from './api';

export interface MeDto {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  is_dentist: boolean;
  location: string | null;
  contact_number: string | null;
  dentist_code: string | null;
}

export const fetchMe = async (): Promise<MeDto> => {
  const response = await api.get<MeDto>('me/');
  return response.data;
};

export interface DentistPatientLinkDto {
  id: number;
  dentist: string;
  patient: string;
  connection_code: string;
  is_active: boolean;
  connected_at: string;
  deactivated_at: string | null;
}

export interface CTScanDto {
  id: number;
  dentist_patient_link: number;
  uploaded_by_user: string | null;
  uploaded_at: string;
  file: string;
  description: string;
}

export interface AIJobDto {
  job_id: string;
  ct_scan_id: number;
  patient_name: string;
  dentist_name: string;
  scan_file_url: string | null;
  status:
    | 'queued'
    | 'segmentation_pending'
    | 'report_requested'
    | 'draft_ready'
    | 'dentist_reviewed'
    | 'finalized'
    | 'failed';
  is_fallback_mode: boolean;
  annotated_image_url: string;
  draft_report: string;
  dentist_notes: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface UploadScanResponse {
  scan: CTScanDto;
  job: AIJobDto;
}

export type JobReviewDecision = 'reviewed' | 'finalized';

export const fetchMyLinks = async (): Promise<DentistPatientLinkDto[]> => {
  const response = await api.get<DentistPatientLinkDto[]>('links/');
  return response.data;
};

export const uploadCTScan = async (
  dentistPatientLinkId: number,
  file: File,
  description = ''
): Promise<UploadScanResponse> => {
  const form = new FormData();
  form.append('dentist_patient_link', String(dentistPatientLinkId));
  form.append('file', file);
  form.append('description', description);

  const response = await api.post<UploadScanResponse>('ct-scans/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const fetchJob = async (jobId: string): Promise<AIJobDto> => {
  const response = await api.get<AIJobDto>(`jobs/${jobId}/`);
  return response.data;
};

export const fetchJobs = async (): Promise<AIJobDto[]> => {
  const response = await api.get<AIJobDto[]>('jobs/');
  return response.data;
};

export const generateDraft = async (jobId: string): Promise<AIJobDto> => {
  const response = await api.post<AIJobDto>(`jobs/${jobId}/generate-draft/`);
  return response.data;
};

export interface ActivePatientDto {
  id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  connected_at: string;
}

export const fetchActivePatients = async (): Promise<ActivePatientDto[]> => {
  const response = await api.get<ActivePatientDto[]>('links/active/');
  return response.data;
};

export interface PendingLinkDto {
  id: number;
  patient_name: string;
  patient_email: string;
  connected_at: string;
}

export const fetchPendingLinks = async (): Promise<PendingLinkDto[]> => {
  const response = await api.get<PendingLinkDto[]>('links/pending/');
  return response.data;
};

export const approveLink = async (id: number): Promise<void> => {
  await api.post(`links/${id}/approve/`);
};

export const rejectLink = async (id: number): Promise<void> => {
  await api.post(`links/${id}/reject/`);
};

export const requestDentistLink = async (dentistCode: string): Promise<DentistPatientLinkDto> => {
  const response = await api.post<DentistPatientLinkDto>('links/request/', { dentist_code: dentistCode });
  return response.data;
};

export const reviewJob = async (
  jobId: string,
  decision: JobReviewDecision,
  dentistNotes = ''
): Promise<AIJobDto> => {
  const response = await api.post<AIJobDto>(`jobs/${jobId}/review/`, {
    decision,
    dentist_notes: dentistNotes,
  });
  return response.data;
};
