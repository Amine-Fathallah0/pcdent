export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'dentist' | 'patient';
  name: string;
  status: 'active' | 'pending' | 'verified' | 'rejected' | 'suspended';
  profile?: Record<string, string>;
  assignedDentist?: string;
  createdAt: string;
}

export interface Finding {
  id: string;
  tooth: number;
  condition: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  confidence: number;
  icd10: string;
  cdt_code: string;
  urgency: 'low' | 'medium' | 'high';
  bbox?: { x: number; y: number; width: number; height: number };
  status: 'pending' | 'accepted' | 'modified' | 'rejected';
  dentistNotes: string | null;
}

export interface Case {
  id: string;
  backendJobId?: string | null;
  ctScanId?: number | null;
  patientId: string;
  patientEmail: string;
  patientName: string;
  dentistId: string;
  status: 'UPLOADED' | 'AI_ANALYZED' | 'NEEDS_REVIEW' | 'FINALIZED' | 'SENT_TO_PATIENT';
  imageType: 'Panoramic X-Ray';
  uploadedAt: string;
  aiAnalyzedAt: string | null;
  reviewedAt: string | null;
  finalizedAt: string | null;
  sentAt: string | null;
  imageUrl: string | null;
  aiFindings: Finding[];
  dentistFindings: Finding[];
  finalFindings: Finding[];
  patientExplanation: string | null;
  reviewEvents: Array<{ action: string; findingId: string; timestamp: string; notes: string }>;
  report: {
    generatedAt: string;
    findings: number;
    recommendations: string[];
  } | null;
}

export interface Notification {
  id: string;
  patientId: string;
  caseId: string;
  type: 'RESULTS_READY' | 'NEW_CASE' | 'REVIEW_COMPLETE';
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AssignmentRequest {
  id: string;
  patientId: string;
  patientEmail: string;
  patientName: string;
  dentistId: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string;
  requestedAt: string;
  additionalInfo: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  dentistId: string;
  dentistName: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: string;
  status: 'pending_dentist' | 'pending_patient' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  userRole: 'patient' | 'dentist' | 'admin';
  type: 'appointment' | 'case' | 'message' | 'system' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// Message interface for Patient-Dentist communication
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'dentist';
  recipientId: string;
  recipientName: string;
  content: string;
  read: boolean;
  createdAt: string;
  attachments?: { name: string; url: string; type: string }[];
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

// Treatment Plan interface
export interface TreatmentPlan {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  title: string;
  status: 'draft' | 'proposed' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  procedures: TreatmentProcedure[];
  totalCost: number;
  insuranceCoverage: number;
  patientResponsibility: number;
  notes: string;
  patientConsent: boolean;
  consentDate: string | null;
}

export interface TreatmentProcedure {
  id: string;
  tooth: number | null;
  code: string; // CDT code
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  estimatedCost: number;
  insuranceCoverage: number;
  scheduledDate: string | null;
  completedDate: string | null;
  notes: string;
}
