import api from './api';

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
