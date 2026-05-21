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
  dentist_name?: string;
  patient_name?: string;
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

export type AppointmentStatus =
  | 'pending_dentist'
  | 'pending_patient'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export interface AppointmentActor {
  user_id: string;
  full_name: string;
}

export interface AppointmentDto {
  id: number;
  dentist_patient_link: number;
  patient: AppointmentPatientDto;
  dentist: AppointmentDentistDto;
  appointment_date: string;
  status: AppointmentStatus;
  appointment_type: string;
  duration: number;
  notes: string;
  proposal_note: string;
  counter_proposal_count: number;
  last_proposed_by: AppointmentActor | null;
  cancelled_by: AppointmentActor | null;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentPayload {
  dentist_patient_link: number;
  appointment_date: string;
  appointment_type?: string;
  duration?: number;
  notes?: string | null;
  proposal_note?: string | null;
  force_override?: boolean;
}

export interface UpdateAppointmentPayload {
  appointment_date?: string;
  appointment_type?: string;
  duration?: number;
  notes?: string | null;
}

export interface CounterProposePayload {
  appointment_date: string;
  duration?: number;
  proposal_note?: string;
  force_override?: boolean;
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

// ─── Appointment workflow actions ─────────────────────────────────────────────

export const acceptAppointment = async (id: number, forceOverride = false): Promise<AppointmentDto> => {
  const response = await api.post<AppointmentDto>(`appointments/${id}/accept/`, { force_override: forceOverride });
  return response.data;
};

export const declineAppointment = async (id: number, reason = ''): Promise<AppointmentDto> => {
  const response = await api.post<AppointmentDto>(`appointments/${id}/decline/`, { reason });
  return response.data;
};

export const cancelAppointment = async (id: number, reason = ''): Promise<AppointmentDto> => {
  const response = await api.post<AppointmentDto>(`appointments/${id}/cancel/`, { reason });
  return response.data;
};

export const counterProposeAppointment = async (
  id: number,
  payload: CounterProposePayload,
): Promise<AppointmentDto> => {
  const response = await api.post<AppointmentDto>(`appointments/${id}/counter-propose/`, payload);
  return response.data;
};

export const completeAppointment = async (id: number): Promise<AppointmentDto> => {
  const response = await api.post<AppointmentDto>(`appointments/${id}/complete/`);
  return response.data;
};

export const markAppointmentNoShow = async (id: number): Promise<AppointmentDto> => {
  const response = await api.post<AppointmentDto>(`appointments/${id}/mark-no-show/`);
  return response.data;
};

// ─── Dentist availability ─────────────────────────────────────────────────────

export interface DentistScheduleEntry {
  id?: number;
  weekday: number;        // 0 = Monday, 6 = Sunday
  start_time: string;     // "HH:MM:SS" or "HH:MM"
  end_time: string;
}

export interface DentistAvailabilityOverrideDto {
  id: number;
  date: string;           // ISO date
  start_time: string | null;
  end_time: string | null;
  is_blocked: boolean;
  reason: string;
}

export const fetchDentistSchedule = async (): Promise<DentistScheduleEntry[]> => {
  const response = await api.get<DentistScheduleEntry[]>('dentists/me/schedule/');
  return response.data;
};

export const replaceDentistSchedule = async (
  entries: DentistScheduleEntry[],
): Promise<DentistScheduleEntry[]> => {
  const response = await api.put<DentistScheduleEntry[]>('dentists/me/schedule/', entries);
  return response.data;
};

export const fetchDentistOverrides = async (): Promise<DentistAvailabilityOverrideDto[]> => {
  const response = await api.get<DentistAvailabilityOverrideDto[]>('dentists/me/overrides/');
  return response.data;
};

export const createDentistOverride = async (
  payload: Omit<DentistAvailabilityOverrideDto, 'id'>,
): Promise<DentistAvailabilityOverrideDto> => {
  const response = await api.post<DentistAvailabilityOverrideDto>('dentists/me/overrides/', payload);
  return response.data;
};

export const deleteDentistOverride = async (id: number): Promise<void> => {
  await api.delete(`dentists/me/overrides/${id}/`);
};

export interface AvailableSlotsResponse {
  dentist_id: string;
  duration: number;
  min_lead_hours: number;
  max_horizon_days: number;
  slots: Record<string, string[]>;  // ISO date → ["09:00", "09:30", ...]
}

export const fetchAvailableSlots = async (
  dentistId: string,
  startDate: string,
  endDate: string,
  duration = 30,
): Promise<AvailableSlotsResponse> => {
  const response = await api.get<AvailableSlotsResponse>(
    `dentists/${dentistId}/available-slots/`,
    { params: { start_date: startDate, end_date: endDate, duration } },
  );
  return response.data;
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'appointment_requested'
  | 'appointment_counter_proposed'
  | 'appointment_accepted'
  | 'appointment_declined'
  | 'appointment_cancelled'
  | 'appointment_modified';

export interface NotificationDto {
  id: number;
  notification_type: NotificationType;
  related_appointment: number | null;
  appointment_detail?: AppointmentDto | null;
  appointment_summary: {
    id: number;
    appointment_date: string;
    duration: number;
    appointment_type: string;
    status: AppointmentStatus;
    dentist_name: string;
    patient_name: string;
    cancelled_by_role: 'dentist' | 'patient' | null;
    cancelled_by_name: string | null;
  } | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export const fetchNotifications = async (unreadOnly = false): Promise<NotificationDto[]> => {
  const response = await api.get<NotificationDto[]>('notifications/', {
    params: unreadOnly ? { unread: 'true' } : undefined,
  });
  return response.data;
};

export const markNotificationRead = async (id: number): Promise<NotificationDto> => {
  const response = await api.post<NotificationDto>(`notifications/${id}/read/`);
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post('notifications/read-all/');
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStatsDto {
  total_dentists: number;
  verified_dentists: number;
  pending_dentists: number;
  total_patients: number;
  total_appointments: number;
  total_ai_jobs: number;
}

export interface AdminDentistDto {
  id: string;
  full_name: string;
  email: string;
  location: string;
  contact_number: string;
  dentist_code: string;
  is_verified: boolean;
  patient_count: number;
}

export interface AdminPatientDto {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  date_of_birth: string;
  appointment_count: number;
}

export const fetchAdminStats = async (): Promise<AdminStatsDto> => {
  const response = await api.get<AdminStatsDto>('platform-admin/stats/');
  return response.data;
};

export const fetchAdminDentists = async (): Promise<AdminDentistDto[]> => {
  const response = await api.get<AdminDentistDto[]>('platform-admin/dentists/');
  return response.data;
};

export const verifyDentist = async (dentistId: string): Promise<void> => {
  await api.post(`platform-platform-admin/dentists/${dentistId}/verify/`);
};

export const suspendDentist = async (dentistId: string): Promise<void> => {
  await api.post(`platform-platform-admin/dentists/${dentistId}/suspend/`);
};

export const fetchAdminPatients = async (): Promise<AdminPatientDto[]> => {
  const response = await api.get<AdminPatientDto[]>('platform-admin/patients/');
  return response.data;
};
