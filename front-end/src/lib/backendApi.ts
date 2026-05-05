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
  mask_image_url?: string | null;
  mask_label_map?: Record<string, string> | null;
  draft_report: string;
  dentist_notes: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AppointmentUserDto {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
}

export interface AppointmentPatientDto {
  user: AppointmentUserDto;
  date_of_birth?: string;
  contact_number?: string;
  address?: string;
}

export interface AppointmentDentistDto {
  user: AppointmentUserDto;
  location?: string;
  contact_number?: string;
}

export interface AppointmentDto {
  id: number;
  dentist_patient_link: number;
  patient: AppointmentPatientDto;
  dentist: AppointmentDentistDto;
  appointment_date: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  appointment_type: string;
  duration: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentPayload {
  dentist_patient_link: number;
  appointment_date: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  appointment_type?: string;
  duration?: number;
  notes?: string | null;
}

export interface UpdateAppointmentPayload {
  appointment_date?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  appointment_type?: string;
  duration?: number;
  notes?: string | null;
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

export const fetchAppointments = async (): Promise<AppointmentDto[]> => {
  const response = await api.get<AppointmentDto[]>('appointments/');
  return response.data;
};

export const createAppointment = async (payload: CreateAppointmentPayload): Promise<AppointmentDto> => {
  const response = await api.post<AppointmentDto>('appointments/', payload);
  return response.data;
};

export const updateAppointment = async (id: number, payload: UpdateAppointmentPayload): Promise<AppointmentDto> => {
  const response = await api.patch<AppointmentDto>(`appointments/${id}/`, payload);
  return response.data;
};

export const fetchAppointmentTypeSuggestions = async (): Promise<string[]> => {
  const response = await api.get<string[]>('appointments/type-suggestions/');
  return response.data;
};

export interface ActivePatientDto {
  id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_user_id: string;
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

export interface ConversationDto {
  id: number;
  dentist_patient_link: number;
  other_user_id: string;
  other_user_name: string;
  other_user_role: 'dentist' | 'patient';
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

export interface MessageDto {
  id: number;
  conversation: number;
  sender_id: string | null;
  sender_name: string;
  content: string;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

export const fetchConversations = async (): Promise<ConversationDto[]> => {
  const response = await api.get<ConversationDto[]>('conversations/');
  return response.data;
};

export const fetchConversationMessages = async (conversationId: number): Promise<MessageDto[]> => {
  const response = await api.get<MessageDto[]>(`conversations/${conversationId}/messages/`);
  return response.data;
};

export const sendConversationMessage = async (
  conversationId: number,
  content: string,
): Promise<MessageDto> => {
  const response = await api.post<MessageDto>(`conversations/${conversationId}/messages/`, { content });
  return response.data;
};

export const markConversationRead = async (conversationId: number): Promise<void> => {
  await api.post(`conversations/${conversationId}/read/`);
};
