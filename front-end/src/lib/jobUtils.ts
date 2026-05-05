import type { AIJobDto } from './backendApi';

export const getBackendJobStatusLabel = (status: AIJobDto['status']): string => {
  switch (status) {
    case 'queued': return 'Queued';
    case 'segmentation_pending': return 'Segmentation Pending';
    case 'report_requested': return 'Report Requested';
    case 'draft_ready': return 'Draft Ready for Review';
    case 'dentist_reviewed': return 'Dentist Reviewed';
    case 'finalized': return 'Finalized';
    case 'failed': return 'Processing Failed';
    default: return 'Unknown Status';
  }
};

export const getBackendJobStatusClass = (status: AIJobDto['status']): string => {
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
