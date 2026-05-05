import AuthenticatedScanImage from './AuthenticatedScanImage';
import AuthenticatedScanOverlay from './AuthenticatedScanOverlay';
import { Icon } from './ui';
import { getBackendJobStatusLabel, getBackendJobStatusClass } from '../lib/jobUtils';
import { formatDate } from '../data/database';
import type { AIJobDto } from '../lib/backendApi';

interface PatientCaseDetailViewProps {
  job: AIJobDto;
  onBack: () => void;
}

const PatientCaseDetailView = ({ job, onBack }: PatientCaseDetailViewProps) => {
  const baseImageUrl = job.scan_file_url;
  const overlayUrl = job.mask_image_url;
  const annotatedFallbackUrl = job.annotated_image_url || null;
  const reportText = job.draft_report;
  const notesText = job.dentist_notes;
  const isFinalized = job.status === 'finalized';
  const isReviewed = job.status === 'dentist_reviewed' || job.status === 'finalized';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)', marginBottom: 'var(--space-24)' }}>
        <button
          className="btn btn--outline btn--sm"
          onClick={onBack}
        >
          <Icon name="chevron-left" /> Back to Results
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="patient-view-title" style={{ margin: 0 }}>
            Scan #{job.ct_scan_id}
          </h2>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Uploaded {formatDate(job.created_at)}
            {job.dentist_name && <> · Dr. {job.dentist_name}</>}
          </div>
        </div>
        <span className={`status-badge ${getBackendJobStatusClass(job.status)}`} style={{ fontSize: 'var(--font-size-sm)', padding: '6px 14px' }}>
          {getBackendJobStatusLabel(job.status)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-24)', alignItems: 'start' }}>
        {/* LEFT — Scan viewer */}
        <div className="card" style={{ padding: 'var(--space-20)' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-16)' }}>
            Your Scan
            {(overlayUrl || annotatedFallbackUrl) && (
              <span style={{ marginLeft: 'var(--space-8)', fontSize: 'var(--font-size-xs)', color: '#047857', background: '#D1FAE5', padding: '2px 8px', borderRadius: '12px' }}>
                AI Annotated
              </span>
            )}
          </h3>
          {job.mask_label_map && Object.keys(job.mask_label_map).length > 0 && (() => {
            const uniqueLabels = [...new Set(Object.values(job.mask_label_map as Record<string, string>))];
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)', marginBottom: 'var(--space-12)' }}>
                {uniqueLabels.map((label, idx) => {
                  const colorIdx = idx + 1;
                  const r = (colorIdx * 59) % 255, g = (colorIdx * 97) % 255, b = (colorIdx * 149) % 255;
                  return (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', background: 'var(--color-bg-1)', padding: '3px 8px', borderRadius: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: `rgb(${r},${g},${b})`, flexShrink: 0, display: 'inline-block' }} />
                      {label}
                    </span>
                  );
                })}
              </div>
            );
          })()}
          {baseImageUrl ? (
            overlayUrl ? (
              <AuthenticatedScanOverlay
                baseSrc={baseImageUrl}
                maskSrc={overlayUrl}
                alt="Dental Scan"
                labelMap={job.mask_label_map}
                style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block', background: '#000' }}
              />
            ) : (
              <AuthenticatedScanImage
                src={annotatedFallbackUrl || baseImageUrl}
                alt="Dental Scan"
                style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block', background: '#000' }}
              />
            )
          ) : (
            <div style={{ width: '100%', aspectRatio: '1', background: '#0F172A', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', gap: 'var(--space-12)' }}>
              <Icon name="activity" />
              <div style={{ fontSize: 'var(--font-size-sm)', textAlign: 'center', maxWidth: '220px', lineHeight: 1.5 }}>
                Scan image will appear here once it has been processed.
              </div>
            </div>
          )}
          {!overlayUrl && !annotatedFallbackUrl && baseImageUrl && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-8)', textAlign: 'center' }}>
              Showing original scan. AI markup will be added once available.
            </p>
          )}
        </div>

        {/* RIGHT — Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          {!isReviewed && (
            <div className="alert info" style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-12)',
              padding: 'var(--space-14)',
              background: 'var(--color-bg-1)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-primary)',
            }}>
              <Icon name="info" />
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                Your report is still being prepared. Your dentist will review the AI draft and share final notes here once ready.
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 'var(--space-20)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-12)' }}>
              AI Draft Report
            </h3>
            {reportText ? (
              <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: '1.8', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-14)', maxHeight: '260px', overflowY: 'auto' }}>
                {reportText}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                Report not available yet.
              </p>
            )}
          </div>

          <div className="card" style={{ padding: 'var(--space-20)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-12)' }}>
              Dentist's Notes
            </h3>
            {notesText ? (
              <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: '1.7', whiteSpace: 'pre-wrap', background: 'var(--color-bg-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-14)', color: 'var(--color-text)' }}>
                {notesText}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                {isReviewed ? 'No notes were added by your dentist.' : 'Your dentist has not added notes yet.'}
              </p>
            )}
          </div>

          {isFinalized && (
            <div style={{ padding: 'var(--space-12)', background: '#D1FAE5', color: '#047857', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
              <Icon name="check-circle" /> Report finalized on {job.completed_at ? formatDate(job.completed_at) : '—'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PatientCaseDetailView;
