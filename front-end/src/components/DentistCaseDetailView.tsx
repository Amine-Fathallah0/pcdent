import { useState, type ReactNode } from 'react';
import AuthenticatedScanImage from './AuthenticatedScanImage';
import AuthenticatedScanOverlay from './AuthenticatedScanOverlay';
import { Icon } from './ui';
import { getBackendJobStatusLabel } from '../lib/jobUtils';
import { formatDate } from '../data/database';
import type { AIJobDto } from '../lib/backendApi';
import './DentistCaseDetailView.css';

interface DentistCaseDetailViewProps {
  job: AIJobDto;
  reviewNotes: string;
  onNotesChange: (v: string) => void;
  onBack: () => void;
  onGenerateDraft: (job: AIJobDto) => Promise<void>;
  onReview: (decision: 'reviewed' | 'finalized') => Promise<void>;
  loading: boolean;
}

function statusPillClass(status: AIJobDto['status']): string {
  switch (status) {
    case 'draft_ready':
    case 'failed':
      return 'cdv-pill--amber';
    case 'dentist_reviewed':
    case 'finalized':
      return 'cdv-pill--green';
    default:
      return 'cdv-pill--sky';
  }
}

function formatReportText(text: string): ReactNode {
  const lines = text.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let keyCounter = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    nodes.push(
      <ul key={`ul-${keyCounter++}`} className="cdv-report-bullets">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="cdv-report-bullet">{b}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      continue;
    }

    if (/^\d[a-z]?\.\s+/i.test(trimmed)) {
      flushBullets();
      nodes.push(
        <h5 key={`h-${keyCounter++}`} className="cdv-report-header">
          {trimmed}
        </h5>
      );
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      bulletBuffer.push(trimmed.replace(/^[-•]\s+/, ''));
      continue;
    }

    flushBullets();
    nodes.push(
      <p key={`p-${keyCounter++}`} className="cdv-report-para">
        {trimmed}
      </p>
    );
  }

  flushBullets();
  return <>{nodes}</>;
}

const DentistCaseDetailView = ({
  job,
  reviewNotes,
  onNotesChange,
  onBack,
  onGenerateDraft,
  onReview,
  loading,
}: DentistCaseDetailViewProps) => {
  const [notesOpen, setNotesOpen] = useState(false);

  const baseImageUrl = job.scan_file_url;
  const overlayUrl = job.mask_image_url;
  const annotatedFallbackUrl = job.annotated_image_url || null;
  const canGenerateDraft = ['queued', 'segmentation_pending', 'report_requested', 'failed'].includes(job.status);
  const canReview = job.status === 'draft_ready' || job.status === 'dentist_reviewed';
  const canFinalize = job.status === 'draft_ready' || job.status === 'dentist_reviewed';

  const legendEntries =
    job.mask_label_map && Object.keys(job.mask_label_map).length > 0
      ? [...new Set(Object.values(job.mask_label_map as Record<string, string>))].map(
          (label, idx) => {
            const c = idx + 1;
            return { label, color: `rgb(${(c * 59) % 255},${(c * 97) % 255},${(c * 149) % 255})` };
          }
        )
      : [];

  return (
    <div className="cdv-root">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="cdv-topbar">
        <button className="cdv-back" onClick={onBack}>
          <Icon name="chevron-left" size={15} />
          Back to Patients
        </button>

        <div className="cdv-meta">
          <h2 className="cdv-meta__title">Scan #{job.ct_scan_id}</h2>
          <div className="cdv-meta__sub">
            {job.patient_name || 'Unknown Patient'} · Uploaded {formatDate(job.created_at)}
          </div>
        </div>

        <span className={`cdv-pill ${statusPillClass(job.status)}`}>
          {getBackendJobStatusLabel(job.status)}
        </span>
      </div>

      {/* ── Two-column layout ───────────────────────────────── */}
      <div className="cdv-layout">
        {/* LEFT — scan viewer */}
        <div className="cdv-viewer">
          {legendEntries.length > 0 && (
            <div className="cdv-legend">
              {legendEntries.map(({ label, color }) => (
                <span key={label} className="cdv-legend-chip">
                  <span className="cdv-legend-swatch" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="cdv-canvas-wrap">
            {baseImageUrl ? (
              overlayUrl ? (
                <AuthenticatedScanOverlay
                  baseSrc={baseImageUrl}
                  maskSrc={overlayUrl}
                  alt="Dental Scan"
                  labelMap={job.mask_label_map}
                  style={{ width: '100%', display: 'block' }}
                />
              ) : (
                <AuthenticatedScanImage
                  src={annotatedFallbackUrl || baseImageUrl}
                  alt="Dental Scan"
                  style={{ width: '100%', display: 'block', background: '#000' }}
                />
              )
            ) : (
              <div className="cdv-no-scan">
                <Icon name="activity" size={32} />
                <p>Scan image will appear here once processed.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — frosted glass panel */}
        <div className="cdv-panel">
          {/* AI Draft Report + inline action buttons */}
          <div className="cdv-section">
            <div className="cdv-report-head">
              <span className="cdv-section__label">AI Draft Report</span>

              <div className="cdv-report-actions">
                {/* Dentist Notes toggle */}
                <button
                  className={`cdv-icon-btn cdv-icon-btn--notes${notesOpen ? ' is-active' : ''}`}
                  onClick={() => setNotesOpen(o => !o)}
                  title="Dentist Notes"
                >
                  <Icon name="edit" size={13} />
                  <span className="cdv-icon-btn__label">Dentist Notes</span>
                </button>

                {/* Mark Reviewed */}
                {canReview && (
                  <button
                    className="cdv-icon-btn cdv-icon-btn--review"
                    onClick={() => void onReview('reviewed')}
                    disabled={loading}
                    title="Mark Reviewed"
                  >
                    <Icon name="check-circle" size={13} />
                    <span className="cdv-icon-btn__label">Mark Reviewed</span>
                  </button>
                )}

                {/* Finalize & Send */}
                {canFinalize && (
                  <button
                    className="cdv-icon-btn cdv-icon-btn--send"
                    onClick={() => void onReview('finalized')}
                    disabled={loading}
                    title="Finalize & Send"
                  >
                    <Icon name="send" size={13} />
                    <span className="cdv-icon-btn__label">Finalize &amp; Send</span>
                  </button>
                )}
              </div>
            </div>

            {/* Report body — collapses when notes are open */}
            {job.draft_report ? (
              <div className={`cdv-report${notesOpen ? ' cdv-report--collapsed' : ''}`}>
                {formatReportText(job.draft_report)}
              </div>
            ) : (
              <p className="cdv-report-empty">
                {canGenerateDraft
                  ? 'No report yet — generate a draft below.'
                  : 'Report not available.'}
              </p>
            )}

            {/* Notes drawer — slides in below the report */}
            <div className={`cdv-notes-drawer${notesOpen ? ' is-open' : ''}`}>
              <textarea
                id="cdv-notes"
                className="cdv-notes"
                value={reviewNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add your notes before sending to the patient…"
              />
            </div>
          </div>

          {/* Generate Draft — only shown when job needs it */}
          {canGenerateDraft && (
            <div className="cdv-actions">
              <button
                className="cdv-btn cdv-btn--ghost cdv-btn--full"
                onClick={() => void onGenerateDraft(job)}
                disabled={loading}
              >
                <Icon name="activity" size={15} />
                Generate Draft
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DentistCaseDetailView;
