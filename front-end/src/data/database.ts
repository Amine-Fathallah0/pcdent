// ============================================
// DATABASE SIMULATION (Replace with real backend)
// ============================================

import type {
  User,
  Finding,
  Case,
  Notification,
  AssignmentRequest,
  Appointment,
  NotificationItem,
  Message,
  Conversation,
  TreatmentPlan,
  TreatmentProcedure,
} from '../types';

export type { User } from '../types';
export type { Finding } from '../types';
export type { Case } from '../types';
export type { Notification } from '../types';
export type { AssignmentRequest } from '../types';
export type { Appointment } from '../types';
export type { NotificationItem } from '../types';
export type { Message } from '../types';
export type { Conversation } from '../types';
export type { TreatmentPlan } from '../types';
export type { TreatmentProcedure } from '../types';

// ============================================
// DATABASE
// ============================================

export const database = {
  users: {
    'admin@dentalai.com': {
      id: 'admin-001',
      email: 'admin@dentalai.com',
      password: 'admin123',
      role: 'admin' as const,
      name: 'System Administrator',
      status: 'active' as const,
      createdAt: '2024-01-01'
    },
    'dr.johnson@clinic.com': {
      id: 'dentist-001',
      email: 'dr.johnson@clinic.com',
      password: 'dentist123',
      role: 'dentist' as const,
      name: 'Dr. Sarah Johnson',
      status: 'verified' as const,
      profile: {
        clinic: 'Downtown Dental Care',
        phone: '+1 (555) 123-4567',
        licenseNumber: 'DDS-2024-1234',
        specialization: 'General Dentistry',
        address: '123 Medical Plaza, Suite 100',
        availability: 'Mon-Fri 9AM-5PM',
        dentistCode: 'DJ001'
      },
      createdAt: '2024-01-15'
    },
    'john.smith@email.com': {
      id: 'patient-001',
      email: 'john.smith@email.com',
      password: 'patient123',
      role: 'patient' as const,
      name: 'John Smith',
      status: 'active' as const,
      assignedDentist: 'dentist-001',
      profile: {
        phone: '+1 (555) 111-2222',
        dateOfBirth: '1985-06-15',
        address: '789 Residential St',
        emergencyContact: 'Jane Smith - +1 (555) 333-4444',
        medicalHistory: 'No known allergies'
      },
      createdAt: '2024-06-01'
    }
  },

  patients: [
    { 
      id: 'patient-001', 
      name: 'John Smith', 
      email: 'john.smith@email.com', 
      phone: '+1 (555) 111-2222', 
      lastVisit: 'Nov 1, 2024', 
      activeCases: 2,
      assignedDentist: 'dentist-001'
    },
    { 
      id: 'patient-002', 
      name: 'Mary Davis', 
      email: 'mary.davis@email.com', 
      phone: '+1 (555) 222-3333', 
      lastVisit: 'Oct 15, 2024', 
      activeCases: 1,
      assignedDentist: 'dentist-001'
    },
    { 
      id: 'patient-003', 
      name: 'Robert Johnson', 
      email: 'robert.johnson@email.com', 
      phone: '+1 (555) 333-4444', 
      lastVisit: 'Oct 10, 2024', 
      activeCases: 0,
      assignedDentist: 'dentist-001'
    }
  ],

  dentists: [
    {
      id: 'dentist-001',
      name: 'Dr. Sarah Johnson',
      email: 'dr.johnson@clinic.com',
      phone: '+1 (555) 123-4567',
      clinic: 'Downtown Dental Care',
      licenseNumber: 'DDS-2024-1234',
      specialization: 'General Dentistry',
      status: 'active' as 'active' | 'pending' | 'suspended',
      dentistCode: 'DJ001',
      patientsCount: 3,
      createdAt: '2024-01-15'
    },
    {
      id: 'dentist-002',
      name: 'Dr. Michael Chen',
      email: 'dr.chen@clinic.com',
      phone: '+1 (555) 234-5678',
      clinic: 'Smile Dental Clinic',
      licenseNumber: 'DDS-2024-2345',
      specialization: 'Orthodontics',
      status: 'pending' as 'active' | 'pending' | 'suspended',
      dentistCode: 'MC002',
      patientsCount: 0,
      createdAt: '2024-11-28'
    },
    {
      id: 'dentist-003',
      name: 'Dr. Emily White',
      email: 'dr.white@clinic.com',
      phone: '+1 (555) 345-6789',
      clinic: 'Family Dental Center',
      licenseNumber: 'DDS-2024-3456',
      specialization: 'Pediatric Dentistry',
      status: 'pending' as 'active' | 'pending' | 'suspended',
      dentistCode: 'EW003',
      patientsCount: 0,
      createdAt: '2024-12-01'
    }
  ],

  assignmentRequests: [
    {
      id: 'req-001',
      patientId: 'patient-004',
      patientEmail: 'alice.brown@email.com',
      patientName: 'Alice Brown',
      dentistId: 'dentist-001',
      status: 'pending' as const,
      message: 'Looking for a new dentist after moving to the area.',
      requestedAt: '2024-12-01',
      additionalInfo: null
    },
    {
      id: 'req-002',
      patientId: 'patient-005',
      patientEmail: 'bob.wilson@email.com',
      patientName: 'Bob Wilson',
      dentistId: 'dentist-001',
      status: 'pending' as const,
      message: 'Referred by a friend. Looking for comprehensive dental care.',
      requestedAt: '2024-12-02',
      additionalInfo: null
    }
  ],

  cases: [
    {
      id: 'case-001',
      patientId: 'patient-001',
      patientEmail: 'john.smith@email.com',
      patientName: 'John Smith',
      dentistId: 'dentist-001',
      status: 'NEEDS_REVIEW' as const,
      imageType: 'Panoramic X-Ray' as const,
      uploadedAt: '2024-12-20T10:30:00',
      aiAnalyzedAt: '2024-12-20T10:31:00',
      reviewedAt: null,
      finalizedAt: null,
      sentAt: null,
      imageUrl: null,
      aiFindings: [
        {
          id: 'finding-001',
          tooth: 14,
          condition: 'Dental Caries',
          severity: 'Moderate' as const,
          confidence: 0.94,
          icd10: 'K02.1',
          cdt_code: 'D2391',
          urgency: 'medium' as const,
          bbox: { x: 120, y: 80, width: 40, height: 50 },
          status: 'pending' as const,
          dentistNotes: null
        },
        {
          id: 'finding-002',
          tooth: 36,
          condition: 'Periapical Abscess',
          severity: 'Severe' as const,
          confidence: 0.91,
          icd10: 'K04.7',
          cdt_code: 'D3310',
          urgency: 'high' as const,
          bbox: { x: 350, y: 150, width: 35, height: 45 },
          status: 'pending' as const,
          dentistNotes: null
        }
      ],
      dentistFindings: [],
      finalFindings: [],
      patientExplanation: null,
      reviewEvents: [],
      report: null
    },
    {
      id: 'case-002',
      patientId: 'patient-001',
      patientEmail: 'john.smith@email.com',
      patientName: 'John Smith',
      dentistId: 'dentist-001',
      status: 'FINALIZED' as const,
      imageType: 'Panoramic X-Ray' as const,
      uploadedAt: '2024-12-15T14:20:00',
      aiAnalyzedAt: '2024-12-15T14:21:00',
      reviewedAt: '2024-12-15T15:00:00',
      finalizedAt: '2024-12-15T15:30:00',
      sentAt: null,
      imageUrl: null,
      aiFindings: [
        {
          id: 'finding-003',
          tooth: 18,
          condition: 'Impacted Wisdom Tooth',
          severity: 'Moderate' as const,
          confidence: 0.88,
          icd10: 'K01.1',
          cdt_code: 'D7240',
          urgency: 'low' as const,
          bbox: { x: 450, y: 100, width: 50, height: 60 },
          status: 'accepted' as const,
          dentistNotes: 'Confirmed. Monitor for now, extraction if symptomatic.'
        }
      ],
      dentistFindings: [],
      finalFindings: [
        {
          id: 'finding-003',
          tooth: 18,
          condition: 'Impacted Wisdom Tooth',
          severity: 'Moderate' as const,
          confidence: 0.88,
          icd10: 'K01.1',
          cdt_code: 'D7240',
          urgency: 'low' as const,
          bbox: { x: 450, y: 100, width: 50, height: 60 },
          status: 'accepted' as const,
          dentistNotes: 'Confirmed. Monitor for now, extraction if symptomatic.'
        }
      ],
      patientExplanation: 'Your wisdom tooth on the upper right is growing at an angle. Currently, it is not causing problems, but we recommend monitoring it. If you experience pain or swelling, we may need to remove it.',
      reviewEvents: [
        { action: 'ACCEPTED', findingId: 'finding-003', timestamp: '2024-12-15T15:00:00', notes: 'Confirmed' }
      ],
      report: {
        generatedAt: '2024-12-15T15:30:00',
        findings: 1,
        recommendations: ['Monitor wisdom tooth', 'Return in 6 months for follow-up']
      }
    },
    {
      id: 'case-003',
      patientId: 'patient-001',
      patientEmail: 'john.smith@email.com',
      patientName: 'John Smith',
      dentistId: 'dentist-001',
      status: 'SENT_TO_PATIENT' as const,
      imageType: 'Panoramic X-Ray' as const,
      uploadedAt: '2024-11-01T09:00:00',
      aiAnalyzedAt: '2024-11-01T09:01:00',
      reviewedAt: '2024-11-01T10:00:00',
      finalizedAt: '2024-11-01T10:30:00',
      sentAt: '2024-11-01T11:00:00',
      imageUrl: null,
      aiFindings: [
        {
          id: 'finding-004',
          tooth: 21,
          condition: 'Enamel Demineralization',
          severity: 'Mild' as const,
          confidence: 0.82,
          icd10: 'K03.8',
          cdt_code: 'D1206',
          urgency: 'low' as const,
          status: 'accepted' as const,
          dentistNotes: 'Early stage, fluoride treatment recommended.'
        }
      ],
      dentistFindings: [],
      finalFindings: [
        {
          id: 'finding-004',
          tooth: 21,
          condition: 'Enamel Demineralization',
          severity: 'Mild' as const,
          confidence: 0.82,
          icd10: 'K03.8',
          cdt_code: 'D1206',
          urgency: 'low' as const,
          status: 'accepted' as const,
          dentistNotes: 'Early stage, fluoride treatment recommended.'
        }
      ],
      patientExplanation: 'We found a small area on your front tooth where the enamel is weakening. This is very early and can be reversed with fluoride treatment. We recommend using the prescribed fluoride toothpaste.',
      reviewEvents: [
        { action: 'ACCEPTED', findingId: 'finding-004', timestamp: '2024-11-01T10:00:00', notes: 'Confirmed' }
      ],
      report: {
        generatedAt: '2024-11-01T10:30:00',
        findings: 1,
        recommendations: ['Fluoride treatment', 'Improved oral hygiene', 'Follow-up in 3 months']
      }
    },
    {
      id: 'case-004',
      patientId: 'patient-002',
      patientEmail: 'mary.davis@email.com',
      patientName: 'Mary Davis',
      dentistId: 'dentist-001',
      status: 'AI_ANALYZED' as const,
      imageType: 'Panoramic X-Ray' as const,
      uploadedAt: new Date(Date.now() - 86400000).toISOString(),
      aiAnalyzedAt: new Date(Date.now() - 86400000 + 60000).toISOString(),
      reviewedAt: null,
      finalizedAt: null,
      sentAt: null,
      imageUrl: null,
      aiFindings: [
        {
          id: 'finding-005',
          tooth: 26,
          condition: 'Bone Loss',
          severity: 'Mild' as const,
          confidence: 0.85,
          icd10: 'K05.311',
          cdt_code: 'D4341',
          urgency: 'medium' as const,
          status: 'pending' as const,
          dentistNotes: null
        },
        {
          id: 'finding-006',
          tooth: 47,
          condition: 'Dental Caries',
          severity: 'Moderate' as const,
          confidence: 0.89,
          icd10: 'K02.1',
          cdt_code: 'D2391',
          urgency: 'medium' as const,
          status: 'pending' as const,
          dentistNotes: null
        }
      ],
      dentistFindings: [],
      finalFindings: [],
      patientExplanation: null,
      reviewEvents: [],
      report: null
    }
  ],

  notifications: [
    {
      id: 'notif-001',
      patientId: 'patient-001',
      caseId: 'case-003',
      type: 'RESULTS_READY' as const,
      message: 'Your dental analysis results are ready to view.',
      read: true,
      createdAt: '2024-11-01T11:00:00'
    }
  ],

  treatmentSuggestions: [
    { 
      treatment: 'Root Canal Therapy - Tooth 36', 
      cdt_code: 'D3310', 
      priority: 'High' as const, 
      estimated_cost: '$800-1200', 
      description: 'Endodontic therapy required due to periapical abscess' 
    },
    { 
      treatment: 'Composite Restoration - Tooth 14', 
      cdt_code: 'D2391', 
      priority: 'Medium' as const, 
      estimated_cost: '$150-250', 
      description: 'Resin-based composite filling for dental caries' 
    },
    { 
      treatment: 'Fluoride Treatment - Tooth 21', 
      cdt_code: 'D1206', 
      priority: 'Low' as const, 
      estimated_cost: '$30-50', 
      description: 'Topical fluoride varnish for enamel demineralization' 
    }
  ],

  dentistProfile: {
    name: 'Dr. Sarah Johnson',
    email: 'dr.johnson@clinic.com',
    dentistCode: 'DJ001',
    licenseNumber: 'DDS-2024-1234',
    clinic: 'Downtown Dental Care',
    specialization: 'General Dentistry',
    phone: '+1 (555) 123-4567',
    address: '123 Medical Plaza, Suite 100',
    availability: 'Mon-Fri 9AM-5PM',
    status: 'verified'
  },

  appointments: [
    {
      id: 'apt-001',
      patientId: 'patient-001',
      patientName: 'John Smith',
      patientEmail: 'john.smith@email.com',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      date: '2026-02-03',
      time: '09:00',
      duration: 30,
      type: 'checkup' as const,
      status: 'confirmed' as const,
      notes: 'Regular 6-month checkup',
      createdAt: '2026-01-20T10:00:00'
    },
    {
      id: 'apt-002',
      patientId: 'patient-001',
      patientName: 'John Smith',
      patientEmail: 'john.smith@email.com',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      date: '2026-02-10',
      time: '14:00',
      duration: 60,
      type: 'treatment' as const,
      status: 'confirmed' as const,
      notes: 'Root canal treatment - Tooth 36',
      createdAt: '2026-01-22T14:00:00'
    },
    {
      id: 'apt-003',
      patientId: 'patient-002',
      patientName: 'Mary Davis',
      patientEmail: 'mary.davis@email.com',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      date: '2026-02-05',
      time: '10:30',
      duration: 45,
      type: 'cleaning' as const,
      status: 'confirmed' as const,
      notes: 'Dental cleaning and scaling',
      createdAt: '2026-01-18T09:00:00'
    },
    {
      id: 'apt-004',
      patientId: 'patient-003',
      patientName: 'Robert Johnson',
      patientEmail: 'robert.johnson@email.com',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      date: '2026-01-28',
      time: '11:00',
      duration: 30,
      type: 'consultation' as const,
      status: 'completed' as const,
      notes: 'Initial consultation for orthodontic options',
      createdAt: '2026-01-15T11:00:00'
    },
    {
      id: 'apt-005',
      patientId: 'patient-001',
      patientName: 'John Smith',
      patientEmail: 'john.smith@email.com',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      date: '2026-01-25',
      time: '15:00',
      duration: 30,
      type: 'follow-up' as const,
      status: 'completed' as const,
      notes: 'Follow-up for previous treatment',
      createdAt: '2026-01-10T08:00:00'
    }
  ] as Appointment[],

  notificationItems: [
    {
      id: 'notif-p-001',
      userId: 'patient-001',
      userRole: 'patient' as const,
      type: 'appointment' as const,
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Sarah Johnson on Feb 3, 2026 at 9:00 AM has been confirmed.',
      read: false,
      actionUrl: 'patient-appointments',
      createdAt: '2026-01-28T10:00:00'
    },
    {
      id: 'notif-p-002',
      userId: 'patient-001',
      userRole: 'patient' as const,
      type: 'case' as const,
      title: 'Analysis Results Ready',
      message: 'Your dental X-ray analysis is complete. View your results now.',
      read: false,
      actionUrl: 'patient-results',
      createdAt: '2026-01-27T14:30:00'
    },
    {
      id: 'notif-p-003',
      userId: 'patient-001',
      userRole: 'patient' as const,
      type: 'reminder' as const,
      title: 'Upcoming Appointment',
      message: 'Reminder: You have an appointment tomorrow at 9:00 AM.',
      read: true,
      actionUrl: 'patient-appointments',
      createdAt: '2026-01-26T09:00:00'
    },
    {
      id: 'notif-d-001',
      userId: 'dentist-001',
      userRole: 'dentist' as const,
      type: 'case' as const,
      title: 'New Case Uploaded',
      message: 'A new X-ray from John Smith requires your review.',
      read: false,
      actionUrl: 'dentist-inbox',
      createdAt: '2026-01-28T11:00:00'
    },
    {
      id: 'notif-d-002',
      userId: 'dentist-001',
      userRole: 'dentist' as const,
      type: 'appointment' as const,
      title: 'New Appointment Request',
      message: 'Mary Davis has requested an appointment for dental cleaning.',
      read: false,
      actionUrl: 'dentist-appointments',
      createdAt: '2026-01-27T16:00:00'
    },
    {
      id: 'notif-d-003',
      userId: 'dentist-001',
      userRole: 'dentist' as const,
      type: 'message' as const,
      title: 'Patient Message',
      message: 'New message from patient regarding treatment questions.',
      read: true,
      actionUrl: 'dentist-inbox',
      createdAt: '2026-01-25T10:00:00'
    },
    {
      id: 'notif-d-004',
      userId: 'dentist-001',
      userRole: 'dentist' as const,
      type: 'system' as const,
      title: 'Weekly Summary',
      message: 'You have 5 cases pending review and 8 appointments this week.',
      read: true,
      createdAt: '2026-01-20T08:00:00'
    }
  ] as NotificationItem[],

  // Conversations for messaging
  conversations: [
    {
      id: 'conv-001',
      patientId: 'patient-001',
      patientName: 'John Smith',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      lastMessage: 'Thank you for the clarification about the root canal procedure.',
      lastMessageAt: '2026-01-28T15:30:00',
      unreadCount: 1,
      createdAt: '2026-01-20T10:00:00'
    },
    {
      id: 'conv-002',
      patientId: 'patient-002',
      patientName: 'Mary Davis',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      lastMessage: 'Your cleaning appointment is confirmed for next week.',
      lastMessageAt: '2026-01-27T11:00:00',
      unreadCount: 0,
      createdAt: '2026-01-15T09:00:00'
    }
  ] as Conversation[],

  messages: [
    {
      id: 'msg-001',
      conversationId: 'conv-001',
      senderId: 'patient-001',
      senderName: 'John Smith',
      senderRole: 'patient' as const,
      recipientId: 'dentist-001',
      recipientName: 'Dr. Sarah Johnson',
      content: 'Hi Dr. Johnson, I have a question about the root canal treatment you recommended.',
      read: true,
      createdAt: '2026-01-28T14:00:00'
    },
    {
      id: 'msg-002',
      conversationId: 'conv-001',
      senderId: 'dentist-001',
      senderName: 'Dr. Sarah Johnson',
      senderRole: 'dentist' as const,
      recipientId: 'patient-001',
      recipientName: 'John Smith',
      content: 'Hi John, of course! What would you like to know about the procedure?',
      read: true,
      createdAt: '2026-01-28T14:30:00'
    },
    {
      id: 'msg-003',
      conversationId: 'conv-001',
      senderId: 'patient-001',
      senderName: 'John Smith',
      senderRole: 'patient' as const,
      recipientId: 'dentist-001',
      recipientName: 'Dr. Sarah Johnson',
      content: 'How long is the recovery time after the procedure?',
      read: true,
      createdAt: '2026-01-28T15:00:00'
    },
    {
      id: 'msg-004',
      conversationId: 'conv-001',
      senderId: 'dentist-001',
      senderName: 'Dr. Sarah Johnson',
      senderRole: 'dentist' as const,
      recipientId: 'patient-001',
      recipientName: 'John Smith',
      content: 'Most patients recover within 1-2 days. You may experience some mild discomfort, but it should subside quickly. I recommend taking ibuprofen if needed and avoiding hard foods for 24 hours.',
      read: false,
      createdAt: '2026-01-28T15:15:00'
    },
    {
      id: 'msg-005',
      conversationId: 'conv-001',
      senderId: 'patient-001',
      senderName: 'John Smith',
      senderRole: 'patient' as const,
      recipientId: 'dentist-001',
      recipientName: 'Dr. Sarah Johnson',
      content: 'Thank you for the clarification about the root canal procedure.',
      read: true,
      createdAt: '2026-01-28T15:30:00'
    },
    {
      id: 'msg-006',
      conversationId: 'conv-002',
      senderId: 'dentist-001',
      senderName: 'Dr. Sarah Johnson',
      senderRole: 'dentist' as const,
      recipientId: 'patient-002',
      recipientName: 'Mary Davis',
      content: 'Your cleaning appointment is confirmed for next week.',
      read: true,
      createdAt: '2026-01-27T11:00:00'
    }
  ] as Message[],

  // Treatment Plans
  treatmentPlans: [
    {
      id: 'tp-001',
      patientId: 'patient-001',
      patientName: 'John Smith',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      title: 'Comprehensive Treatment Plan - Q1 2026',
      status: 'accepted' as const,
      createdAt: '2026-01-15T10:00:00',
      updatedAt: '2026-01-20T14:00:00',
      validUntil: '2026-04-15',
      procedures: [
        {
          id: 'proc-001',
          tooth: 36,
          code: 'D3310',
          description: 'Root Canal Therapy - Molar',
          priority: 'urgent' as const,
          status: 'confirmed' as const,
          estimatedCost: 1000,
          insuranceCoverage: 600,
          scheduledDate: '2026-02-10',
          completedDate: null,
          notes: 'Periapical abscess detected'
        },
        {
          id: 'proc-002',
          tooth: 14,
          code: 'D2391',
          description: 'Composite Restoration - 1 surface',
          priority: 'high' as const,
          status: 'pending' as const,
          estimatedCost: 200,
          insuranceCoverage: 160,
          scheduledDate: null,
          completedDate: null,
          notes: 'Dental caries - moderate'
        },
        {
          id: 'proc-003',
          tooth: 21,
          code: 'D1206',
          description: 'Fluoride Varnish Application',
          priority: 'low' as const,
          status: 'completed' as const,
          estimatedCost: 40,
          insuranceCoverage: 40,
          scheduledDate: '2026-01-25',
          completedDate: '2026-01-25',
          notes: 'Enamel demineralization prevention'
        }
      ],
      totalCost: 1240,
      insuranceCoverage: 800,
      patientResponsibility: 440,
      notes: 'Priority: Address root canal first due to risk of infection spreading.',
      patientConsent: true,
      consentDate: '2026-01-20'
    },
    {
      id: 'tp-002',
      patientId: 'patient-002',
      patientName: 'Mary Davis',
      dentistId: 'dentist-001',
      dentistName: 'Dr. Sarah Johnson',
      title: 'Preventive Care Plan',
      status: 'proposed' as const,
      createdAt: '2026-01-25T11:00:00',
      updatedAt: '2026-01-25T11:00:00',
      validUntil: '2026-04-25',
      procedures: [
        {
          id: 'proc-004',
          tooth: null,
          code: 'D1110',
          description: 'Prophylaxis - Adult Cleaning',
          priority: 'medium' as const,
          status: 'scheduled' as const,
          estimatedCost: 120,
          insuranceCoverage: 120,
          scheduledDate: '2026-02-05',
          completedDate: null,
          notes: 'Regular 6-month cleaning'
        },
        {
          id: 'proc-005',
          tooth: null,
          code: 'D0274',
          description: 'Bitewing X-rays - 4 films',
          priority: 'medium' as const,
          status: 'pending' as const,
          estimatedCost: 60,
          insuranceCoverage: 60,
          scheduledDate: null,
          completedDate: null,
          notes: 'Annual bitewing radiographs'
        }
      ],
      totalCost: 180,
      insuranceCoverage: 180,
      patientResponsibility: 0,
      notes: 'Standard preventive care package.',
      patientConsent: false,
      consentDate: null
    }
  ] as TreatmentPlan[],

  // Admin analytics data
  analytics: {
    monthlyStats: [
      { month: 'Aug 2025', cases: 45, patients: 38, revenue: 28500 },
      { month: 'Sep 2025', cases: 52, patients: 42, revenue: 32100 },
      { month: 'Oct 2025', cases: 48, patients: 40, revenue: 29800 },
      { month: 'Nov 2025', cases: 58, patients: 48, revenue: 35400 },
      { month: 'Dec 2025', cases: 41, patients: 35, revenue: 25200 },
      { month: 'Jan 2026', cases: 62, patients: 52, revenue: 38500 }
    ],
    aiAccuracy: {
      overall: 92.3,
      byCondition: [
        { condition: 'Dental Caries', accuracy: 94.5, count: 156 },
        { condition: 'Periapical Abscess', accuracy: 91.2, count: 42 },
        { condition: 'Periodontal Disease', accuracy: 89.8, count: 78 },
        { condition: 'Enamel Demineralization', accuracy: 93.1, count: 65 }
      ]
    },
    topConditions: [
      { condition: 'Dental Caries', count: 156, percentage: 45.6 },
      { condition: 'Periodontal Disease', count: 78, percentage: 22.8 },
      { condition: 'Enamel Issues', count: 65, percentage: 19.0 },
      { condition: 'Periapical Abscess', count: 42, percentage: 12.6 }
    ]
  }
};

// Helper functions
export const getCasesByPatient = (patientId: string): Case[] => {
  return database.cases.filter(c => c.patientId === patientId);
};

export const getCasesByDentist = (dentistId: string): Case[] => {
  return database.cases.filter(c => c.dentistId === dentistId);
};

export const getPatientsByDentist = (dentistId: string) => {
  return database.patients.filter(p => p.assignedDentist === dentistId);
};

export const getPendingRequestsByDentist = (dentistId: string) => {
  return database.assignmentRequests.filter(r => r.dentistId === dentistId && r.status === 'pending');
};

export const getCaseById = (caseId: string): Case | undefined => {
  return database.cases.find(c => c.id === caseId);
};

export const getPatientResults = (patientId: string): Case[] => {
  return database.cases.filter(c => c.patientId === patientId && c.status === 'SENT_TO_PATIENT');
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const getStatusLabel = (status: Case['status']): string => {
  const labels: Record<Case['status'], string> = {
    'UPLOADED': 'Uploaded',
    'AI_ANALYZED': 'AI Analyzed',
    'NEEDS_REVIEW': 'Needs Review',
    'FINALIZED': 'Finalized',
    'SENT_TO_PATIENT': 'Results Sent'
  };
  return labels[status];
};

export const getStatusClass = (status: Case['status']): string => {
  return status.toLowerCase().replace('_', '-');
};

// Appointment helper functions
export const getAppointmentsByPatient = (patientId: string): Appointment[] => {
  return database.appointments.filter(a => a.patientId === patientId);
};

export const getAppointmentsByDentist = (dentistId: string): Appointment[] => {
  return database.appointments.filter(a => a.dentistId === dentistId);
};

export const getUpcomingAppointments = (userId: string, role: 'patient' | 'dentist'): Appointment[] => {
  const today = new Date().toISOString().split('T')[0];
  return database.appointments
    .filter(a => {
      const isUser = role === 'patient' ? a.patientId === userId : a.dentistId === userId;
      return isUser && a.date >= today && (a.status === 'pending_dentist' || a.status === 'pending_patient' || a.status === 'confirmed');
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
};

export const getPastAppointments = (userId: string, role: 'patient' | 'dentist'): Appointment[] => {
  const today = new Date().toISOString().split('T')[0];
  return database.appointments
    .filter(a => {
      const isUser = role === 'patient' ? a.patientId === userId : a.dentistId === userId;
      return isUser && (a.date < today || a.status === 'completed' || a.status === 'cancelled');
    })
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
};

export const getTodaysAppointments = (dentistId: string): Appointment[] => {
  const today = new Date().toISOString().split('T')[0];
  return database.appointments
    .filter(a => a.dentistId === dentistId && a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
};

export const addAppointment = (appointment: Omit<Appointment, 'id' | 'createdAt'>): Appointment => {
  const newAppointment: Appointment = {
    ...appointment,
    id: `apt-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  database.appointments.push(newAppointment);
  return newAppointment;
};

export const updateAppointmentStatus = (appointmentId: string, status: Appointment['status']): boolean => {
  const appointment = database.appointments.find(a => a.id === appointmentId);
  if (appointment) {
    appointment.status = status;
    return true;
  }
  return false;
};

// Notification helper functions
export const getNotificationsByUser = (userId: string): NotificationItem[] => {
  return database.notificationItems
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getUnreadNotificationCount = (userId: string): number => {
  return database.notificationItems.filter(n => n.userId === userId && !n.read).length;
};

export const markNotificationAsRead = (notificationId: string): boolean => {
  const notification = database.notificationItems.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
};

export const markAllNotificationsAsRead = (userId: string): void => {
  database.notificationItems
    .filter(n => n.userId === userId)
    .forEach(n => n.read = true);
};

export const addNotification = (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): NotificationItem => {
  const newNotification: NotificationItem = {
    ...notification,
    id: `notif-${Date.now()}`,
    read: false,
    createdAt: new Date().toISOString()
  };
  database.notificationItems.push(newNotification);
  return newNotification;
};

export const getAppointmentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'checkup': 'Check-up',
    'cleaning': 'Cleaning',
    'treatment': 'Treatment',
    'consultation': 'Consultation',
    'follow-up': 'Follow-up',
    'emergency': 'Emergency'
  };
  return labels[type] ?? (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Appointment');
};

export const getAppointmentStatusClass = (status: Appointment['status']): string => {
  const classes: Record<Appointment['status'], string> = {
    'pending_dentist': 'status-pending',
    'pending_patient': 'status-pending',
    'confirmed': 'status-confirmed',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled',
    'no-show': 'status-noshow'
  };
  return classes[status];
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const getDayName = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
};

export const getRelativeDate = (dateString: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  if (targetDate.getTime() === today.getTime()) return 'Today';
  if (targetDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  
  return formatDate(dateString);
};

// ============================================
// CASE MANAGEMENT FUNCTIONS
// ============================================

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

// Generate simulated AI findings based on random dental conditions
const generateSimulatedAIFindings = (): Finding[] => {
  const conditions = [
    { condition: 'Dental Caries', severity: 'Moderate' as const, icd10: 'K02.9', cdt: 'D2391', urgency: 'medium' as const },
    { condition: 'Periodontal Disease', severity: 'Mild' as const, icd10: 'K05.1', cdt: 'D4341', urgency: 'low' as const },
    { condition: 'Periapical Abscess', severity: 'Severe' as const, icd10: 'K04.7', cdt: 'D3310', urgency: 'high' as const },
    { condition: 'Impacted Tooth', severity: 'Moderate' as const, icd10: 'K01.1', cdt: 'D7240', urgency: 'medium' as const },
    { condition: 'Dental Calculus', severity: 'Mild' as const, icd10: 'K03.6', cdt: 'D1110', urgency: 'low' as const },
    { condition: 'Root Resorption', severity: 'Moderate' as const, icd10: 'K03.3', cdt: 'D3348', urgency: 'medium' as const },
    { condition: 'Bone Loss', severity: 'Severe' as const, icd10: 'M85.8', cdt: 'D4263', urgency: 'high' as const },
    { condition: 'Enamel Hypoplasia', severity: 'Mild' as const, icd10: 'K00.4', cdt: 'D2950', urgency: 'low' as const }
  ];

  // Generate 2-5 random findings
  const numFindings = Math.floor(Math.random() * 4) + 2;
  const usedTeeth = new Set<number>();
  const findings: Finding[] = [];

  for (let i = 0; i < numFindings; i++) {
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    let tooth: number;
    do {
      tooth = Math.floor(Math.random() * 32) + 1;
    } while (usedTeeth.has(tooth));
    usedTeeth.add(tooth);

    findings.push({
      id: `finding-${Date.now()}-${i}`,
      tooth,
      condition: condition.condition,
      severity: condition.severity,
      confidence: Math.floor(Math.random() * 15) + 85, // 85-99%
      icd10: condition.icd10,
      cdt_code: condition.cdt,
      urgency: condition.urgency,
      status: 'pending',
      dentistNotes: null
    });
  }

  return findings;
};

// Create a new case from uploaded image
export const createCase = (
  patientId: string,
  patientName: string,
  patientEmail: string,
  dentistId: string,
  imageUrl: string | null,
  backendLink?: {
    backendJobId?: string | null;
    ctScanId?: number | null;
  }
): Case => {
  const newCase: Case = {
    id: `case-${Date.now()}`,
    backendJobId: backendLink?.backendJobId ?? null,
    ctScanId: backendLink?.ctScanId ?? null,
    patientId,
    patientEmail,
    patientName,
    dentistId,
    status: 'UPLOADED',
    imageType: 'Panoramic X-Ray',
    uploadedAt: new Date().toISOString(),
    aiAnalyzedAt: null,
    reviewedAt: null,
    finalizedAt: null,
    sentAt: null,
    imageUrl,
    aiFindings: [],
    dentistFindings: [],
    finalFindings: [],
    patientExplanation: null,
    reviewEvents: [],
    report: null
  };

  (database.cases as Case[]).push(newCase);
  return newCase;
};

// Simulate AI analysis on a case
export const simulateAIAnalysis = (caseId: string): Promise<Case | null> => {
  return new Promise((resolve) => {
    // Simulate AI processing time (2-4 seconds)
    const processingTime = Math.floor(Math.random() * 2000) + 2000;
    
    setTimeout(() => {
      const caseItem = (database.cases as Case[]).find(c => c.id === caseId);
      if (!caseItem) {
        resolve(null);
        return;
      }

      // Generate AI findings
      caseItem.aiFindings = generateSimulatedAIFindings();
      caseItem.status = 'AI_ANALYZED';
      caseItem.aiAnalyzedAt = new Date().toISOString();

      // Create notification for the dentist
      addNotification({
        userId: caseItem.dentistId,
        userRole: 'dentist',
        type: 'case',
        title: 'New Case Ready for Review',
        message: `AI analysis complete for ${caseItem.patientName}. ${caseItem.aiFindings.length} findings detected.`,
        actionUrl: 'dentist-inbox'
      });

      resolve(caseItem);
    }, processingTime);
  });
};

// Update case status
export const updateCaseStatus = (caseId: string, status: Case['status']): Case | null => {
  const caseItem = (database.cases as Case[]).find(c => c.id === caseId);
  if (!caseItem) return null;
  
  caseItem.status = status;
  
  if (status === 'NEEDS_REVIEW') {
    caseItem.reviewedAt = new Date().toISOString();
  } else if (status === 'FINALIZED') {
    caseItem.finalizedAt = new Date().toISOString();
  } else if (status === 'SENT_TO_PATIENT') {
    caseItem.sentAt = new Date().toISOString();
    
    // Notify patient
    addNotification({
      userId: caseItem.patientId,
      userRole: 'patient',
      type: 'case',
      title: 'Results Ready',
      message: `Your dental analysis results are now available. ${caseItem.finalFindings.length} findings to review.`,
      actionUrl: 'patient-results'
    });
  }
  
  return caseItem;
};

// Get patient info by ID
export const getPatientById = (patientId: string) => {
  return database.patients.find(p => p.id === patientId);
};

// Get dentist info by ID
export const getDentistById = (dentistId: string) => {
  return database.dentists.find(d => d.id === dentistId);
};

// Get all active dentists (for patient selection)
export const getActiveDentists = () => {
  return database.dentists.filter(d => d.status === 'active');
};

// Refresh/get all cases (for dynamic updates)
export const getAllCases = (): Case[] => {
  return [...database.cases];
};

// Get case count for a patient
export const getPatientCaseCount = (patientId: string): number => {
  return database.cases.filter(c => c.patientId === patientId).length;
};

// Calculate patient stats
export const getPatientStats = (patientId: string) => {
  const cases = getCasesByPatient(patientId);
  const appointments = getAppointmentsByPatient(patientId);
  const upcomingApts = appointments.filter(a => new Date(a.date) >= new Date() && a.status !== 'cancelled');
  
  return {
    totalVisits: cases.length,
    completedResults: cases.filter(c => c.status === 'SENT_TO_PATIENT').length,
    pendingResults: cases.filter(c => c.status !== 'SENT_TO_PATIENT').length,
    upcomingAppointments: upcomingApts.length,
    lastVisit: cases.length > 0 
      ? cases.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0].uploadedAt 
      : null
  };
};

// Calculate dentist stats
export const getDentistStats = (dentistId: string) => {
  const cases = getCasesByDentist(dentistId);
  const patients = getPatientsByDentist(dentistId);
  const todayAppointments = getTodaysAppointments(dentistId);
  const pendingRequests = getPendingRequestsByDentist(dentistId);
  
  return {
    totalPatients: patients.length,
    totalCases: cases.length,
    pendingReview: cases.filter(c => c.status === 'AI_ANALYZED' || c.status === 'NEEDS_REVIEW').length,
    completedToday: cases.filter(c => {
      const caseDate = c.finalizedAt || c.sentAt;
      if (!caseDate) return false;
      return new Date(caseDate).toDateString() === new Date().toDateString();
    }).length,
    todayAppointments: todayAppointments.length,
    pendingRequests: pendingRequests.length
  };
};

// ============================================
// MESSAGING FUNCTIONS
// ============================================

export const getConversationsByUser = (userId: string, role: 'patient' | 'dentist'): Conversation[] => {
  if (role === 'patient') {
    return database.conversations.filter(c => c.patientId === userId);
  }
  return database.conversations.filter(c => c.dentistId === userId);
};

export const getMessagesByConversation = (conversationId: string): Message[] => {
  return database.messages
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const sendMessage = (
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: 'patient' | 'dentist',
  recipientId: string,
  recipientName: string,
  content: string
): Message => {
  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId,
    senderName,
    senderRole,
    recipientId,
    recipientName,
    content,
    read: false,
    createdAt: new Date().toISOString()
  };
  
  database.messages.push(newMessage);
  
  // Update conversation
  const conversation = database.conversations.find(c => c.id === conversationId);
  if (conversation) {
    conversation.lastMessage = content;
    conversation.lastMessageAt = newMessage.createdAt;
    conversation.unreadCount += 1;
  }
  
  // Notify recipient
  addNotification({
    userId: recipientId,
    userRole: senderRole === 'patient' ? 'dentist' : 'patient',
    type: 'message',
    title: 'New Message',
    message: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
    actionUrl: senderRole === 'patient' ? 'dentist-messages' : 'patient-messages'
  });
  
  return newMessage;
};

export const markMessagesAsRead = (conversationId: string, userId: string): void => {
  database.messages
    .filter(m => m.conversationId === conversationId && m.recipientId === userId)
    .forEach(m => m.read = true);
  
  const conversation = database.conversations.find(c => c.id === conversationId);
  if (conversation) {
    conversation.unreadCount = 0;
  }
};

export const getUnreadMessageCount = (userId: string): number => {
  return database.messages.filter(m => m.recipientId === userId && !m.read).length;
};

export const createConversation = (
  patientId: string,
  patientName: string,
  dentistId: string,
  dentistName: string
): Conversation => {
  // Check if conversation already exists
  const existing = database.conversations.find(
    c => c.patientId === patientId && c.dentistId === dentistId
  );
  if (existing) return existing;
  
  const newConversation: Conversation = {
    id: `conv-${Date.now()}`,
    patientId,
    patientName,
    dentistId,
    dentistName,
    lastMessage: '',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    createdAt: new Date().toISOString()
  };
  
  database.conversations.push(newConversation);
  return newConversation;
};

// ============================================
// TREATMENT PLAN FUNCTIONS
// ============================================

export const getTreatmentPlansByPatient = (patientId: string): TreatmentPlan[] => {
  return database.treatmentPlans.filter(tp => tp.patientId === patientId);
};

export const getTreatmentPlansByDentist = (dentistId: string): TreatmentPlan[] => {
  return database.treatmentPlans.filter(tp => tp.dentistId === dentistId);
};

export const getTreatmentPlanById = (planId: string): TreatmentPlan | undefined => {
  return database.treatmentPlans.find(tp => tp.id === planId);
};

export const createTreatmentPlan = (plan: Omit<TreatmentPlan, 'id' | 'createdAt' | 'updatedAt'>): TreatmentPlan => {
  const newPlan: TreatmentPlan = {
    ...plan,
    id: `tp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  database.treatmentPlans.push(newPlan);
  
  // Notify patient
  addNotification({
    userId: plan.patientId,
    userRole: 'patient',
    type: 'case',
    title: 'New Treatment Plan',
    message: `Dr. ${plan.dentistName.replace('Dr. ', '')} has created a treatment plan for you.`,
    actionUrl: 'patient-treatment'
  });
  
  return newPlan;
};

export const updateTreatmentPlan = (planId: string, updates: Partial<TreatmentPlan>): TreatmentPlan | null => {
  const plan = database.treatmentPlans.find(tp => tp.id === planId);
  if (!plan) return null;
  
  Object.assign(plan, updates, { updatedAt: new Date().toISOString() });
  return plan;
};

export const updateProcedureStatus = (
  planId: string,
  procedureId: string,
  status: TreatmentProcedure['status'],
  completedDate?: string
): TreatmentPlan | null => {
  const plan = database.treatmentPlans.find(tp => tp.id === planId);
  if (!plan) return null;
  
  const procedure = plan.procedures.find(p => p.id === procedureId);
  if (!procedure) return null;
  
  procedure.status = status;
  if (status === 'completed' && completedDate) {
    procedure.completedDate = completedDate;
  }
  
  plan.updatedAt = new Date().toISOString();
  return plan;
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

export const getAdminStats = () => {
  const allCases = database.cases;
  const allPatients = database.patients;
  const allDentists = database.dentists;
  
  return {
    totalDentists: allDentists.length,
    activeDentists: allDentists.filter(d => d.status === 'active').length,
    pendingDentists: allDentists.filter(d => d.status === 'pending').length,
    totalPatients: allPatients.length,
    totalCases: allCases.length,
    casesThisMonth: allCases.filter(c => {
      const date = new Date(c.uploadedAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    highRiskCases: allCases.filter(c => 
      c.aiFindings.some(f => f.urgency === 'high') && c.status !== 'SENT_TO_PATIENT'
    ).length,
    aiAccuracy: database.analytics.aiAccuracy.overall,
    monthlyStats: database.analytics.monthlyStats,
    topConditions: database.analytics.topConditions
  };
};

export const getAllDentists = () => {
  return database.dentists;
};

export const getAllPatients = () => {
  return database.patients;
};

export const updateDentistStatus = (dentistId: string, status: 'active' | 'pending' | 'suspended'): boolean => {
  const dentist = database.dentists.find(d => d.id === dentistId);
  if (!dentist) return false;
  
  dentist.status = status;
  
  if (status === 'active') {
    addNotification({
      userId: dentistId,
      userRole: 'dentist',
      type: 'system',
      title: 'Account Verified',
      message: 'Your dentist account has been verified. You can now start accepting patients.'
    });
  }
  
  return true;
};

// ============================================
// PDF EXPORT HELPER (returns data for PDF generation)
// ============================================

export const getTreatmentPlanForExport = (planId: string) => {
  const plan = getTreatmentPlanById(planId);
  if (!plan) return null;
  
  return {
    title: plan.title,
    patientName: plan.patientName,
    dentistName: plan.dentistName,
    createdAt: formatDate(plan.createdAt),
    validUntil: formatDate(plan.validUntil),
    procedures: plan.procedures.map(p => ({
      code: p.code,
      description: p.description,
      tooth: p.tooth,
      priority: p.priority,
      cost: p.estimatedCost,
      insurance: p.insuranceCoverage,
      patientCost: p.estimatedCost - p.insuranceCoverage
    })),
    totalCost: plan.totalCost,
    insuranceCoverage: plan.insuranceCoverage,
    patientResponsibility: plan.patientResponsibility,
    notes: plan.notes
  };
};

export const getCaseReportForExport = (caseId: string) => {
  const caseItem = database.cases.find(c => c.id === caseId);
  if (!caseItem) return null;
  
  return {
    caseId: caseItem.id,
    patientName: caseItem.patientName,
    uploadedAt: formatDate(caseItem.uploadedAt),
    analyzedAt: caseItem.aiAnalyzedAt ? formatDate(caseItem.aiAnalyzedAt) : null,
    findings: caseItem.finalFindings.length > 0 ? caseItem.finalFindings : caseItem.aiFindings,
    status: caseItem.status,
    patientExplanation: caseItem.patientExplanation
  };
};
