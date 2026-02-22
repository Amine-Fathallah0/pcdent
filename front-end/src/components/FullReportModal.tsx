import { memo, type JSX } from 'react';
import { Icon } from '../components/ui';
import { formatDate, formatDateTime, type Case, type Finding } from '../data/database';
import './FullReportModal.css';

// Types
interface FullReportModalProps {
  caseData: Case;
  onClose: () => void;
}

// Constants for confidence levels
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.8,
} as const;

const getConfidenceClass = (confidence: number): string => {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'finding-row__confidence--high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'finding-row__confidence--medium';
  return 'finding-row__confidence--low';
};

const getUrgencyClass = (urgency: string): string => `urgency-badge urgency-badge--${urgency}`;

// Sub-components with memo for performance
const SummaryStat = memo<{
  value: number;
  label: string;
  variant: 'primary' | 'danger' | 'success';
}>(({ value, label, variant }) => (
  <div className={`summary-stat summary-stat--${variant}`}>
    <div className={`summary-stat__value summary-stat__value--${variant}`}>
      {value}
    </div>
    <div className="summary-stat__label">{label}</div>
  </div>
));

SummaryStat.displayName = 'SummaryStat';

const FindingRow = memo<{
  finding: Finding;
  index: number;
}>(({ finding, index }) => (
  <div className={`finding-row ${index % 2 === 0 ? 'finding-row--even' : ''}`}>
    <div className="finding-row__tooth">#{finding.tooth}</div>
    <div>
      <div className="finding-row__condition">{finding.condition}</div>
      <div className="finding-row__details">
        Severity: {finding.severity} | ICD-10: {finding.icd10} | CDT: {finding.cdt_code}
      </div>
      {finding.dentistNotes && (
        <div className="finding-row__note">
          <em>Note: {finding.dentistNotes}</em>
        </div>
      )}
    </div>
    <div>
      <div className={`finding-row__confidence ${getConfidenceClass(finding.confidence)}`}>
        {Math.round(finding.confidence * 100)}% conf.
      </div>
    </div>
    <div>
      <span className={getUrgencyClass(finding.urgency)}>
        {finding.urgency}
      </span>
    </div>
  </div>
));

FindingRow.displayName = 'FindingRow';

const TimelineItem = memo<{
  event: { action: string; timestamp: string; notes?: string };
  isLast: boolean;
}>(({ event, isLast }) => (
  <div className={`timeline-item ${!isLast ? 'timeline-item--bordered' : ''}`}>
    <div className="timeline-item__marker">
      <Icon name="check" size={12} />
    </div>
    <div>
      <div className="timeline-item__action">{event.action}</div>
      <div className="timeline-item__details">
        {formatDateTime(event.timestamp)} {event.notes && `- ${event.notes}`}
      </div>
    </div>
  </div>
));

TimelineItem.displayName = 'TimelineItem';

// Main Component
const FullReportModal = memo<FullReportModalProps>(({ caseData, onClose }) => {
  const highPriorityCount = caseData.finalFindings.filter(f => f.urgency === 'high').length;
  const recommendationsCount = caseData.report?.recommendations?.length || 0;

  return (
    <div className="report-modal-container">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal report-modal">
        <div className="modal-header">
          <h2 className="modal-title">Full Dental Analysis Report</h2>
          <button className="close-modal" onClick={onClose} aria-label="Close modal">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {/* Report Header */}
          <div className="report-header">
            <div className="report-header__content">
              <div>
                <h3 className="report-header__title">Dental AI Assistant</h3>
                <p className="report-header__subtitle">AI-Assisted Dental Analysis Report</p>
              </div>
              <div className="report-header__meta">
                <div className="report-header__id">Report #{caseData.id}</div>
                <div className="report-header__date">
                  Generated: {caseData.report?.generatedAt ? formatDateTime(caseData.report.generatedAt) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <section className="report-section">
            <h4 className="report-section__title">Patient Information</h4>
            <div className="report-section__grid">
              <div><strong>Name:</strong> {caseData.patientName}</div>
              <div><strong>Patient ID:</strong> {caseData.patientId}</div>
              <div><strong>Image Type:</strong> {caseData.imageType}</div>
              <div><strong>Analysis Date:</strong> {formatDate(caseData.uploadedAt)}</div>
            </div>
          </section>

          {/* Summary Section */}
          <section className="report-section">
            <h4 className="report-section__title">Summary</h4>
            <div className="summary-stats">
              <SummaryStat 
                value={caseData.finalFindings.length} 
                label="Total Findings" 
                variant="primary" 
              />
              <SummaryStat 
                value={highPriorityCount} 
                label="High Priority" 
                variant="danger" 
              />
              <SummaryStat 
                value={recommendationsCount} 
                label="Recommendations" 
                variant="success" 
              />
            </div>
          </section>

          {/* Dentist's Summary */}
          {caseData.patientExplanation && (
            <section className="report-section">
              <h4 className="report-section__title">Your Dentist's Summary</h4>
              <div className="dentist-summary">{caseData.patientExplanation}</div>
            </section>
          )}

          {/* Detailed Findings */}
          <section className="report-section">
            <h4 className="report-section__title">Detailed Findings</h4>
            {caseData.finalFindings.length > 0 ? (
              <div className="findings-table">
                {caseData.finalFindings.map((finding, index) => (
                  <FindingRow key={finding.id} finding={finding} index={index} />
                ))}
              </div>
            ) : (
              <p className="no-findings">No findings to display.</p>
            )}
          </section>

          {/* Recommendations */}
          {caseData.report?.recommendations && caseData.report.recommendations.length > 0 && (
            <section className="report-section">
              <h4 className="report-section__title">Recommendations</h4>
              <ul className="recommendations-list">
                {caseData.report.recommendations.map((rec, idx) => (
                  <li key={idx} className="recommendations-list__item">
                    <Icon name="check-circle" /> {rec}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Review Timeline */}
          {caseData.reviewEvents.length > 0 && (
            <section className="report-section">
              <h4 className="report-section__title">Review History</h4>
              <div className="review-timeline">
                {caseData.reviewEvents.map((event, idx) => (
                  <TimelineItem 
                    key={idx} 
                    event={event} 
                    isLast={idx === caseData.reviewEvents.length - 1} 
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="report-modal-footer">
          <button className="btn btn--outline" onClick={() => window.print()}>
            <Icon name="download" /> Download PDF
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
});

FullReportModal.displayName = 'FullReportModal';

export default FullReportModal;
