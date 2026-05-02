import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AIJobDto, ActivePatientDto, PendingLinkDto } from '../lib/backendApi';
import './PatientsHub.css';

type StatusBucket = 'new-uploads' | 'needs-review' | 'finalized';

const getJobBucket = (status: AIJobDto['status']): StatusBucket => {
  switch (status) {
    case 'queued':
    case 'segmentation_pending':
    case 'report_requested':
      return 'new-uploads';
    case 'draft_ready':
    case 'failed':
      return 'needs-review';
    case 'dentist_reviewed':
    case 'finalized':
      return 'finalized';
    default:
      return 'new-uploads';
  }
};

const getJobStatusLabel = (status: AIJobDto['status']): string => {
  switch (status) {
    case 'queued': return 'Queued';
    case 'segmentation_pending': return 'Processing';
    case 'report_requested': return 'Report Requested';
    case 'draft_ready': return 'Draft Ready';
    case 'dentist_reviewed': return 'Reviewed';
    case 'finalized': return 'Finalized';
    case 'failed': return 'Failed';
    default: return 'Unknown';
  }
};

const bucketLabels: Record<StatusBucket, string> = {
  'new-uploads': 'New Uploads',
  'needs-review': 'Needs Review',
  'finalized': 'Finalized',
};

interface PatientRow {
  name: string;
  linked: ActivePatientDto | null;
  jobs: AIJobDto[];
  counts: Record<StatusBucket, number>;
}

export interface PatientsHubProps {
  backendJobs: AIJobDto[];
  activePatients: ActivePatientDto[];
  pendingLinks: PendingLinkDto[];
  loading: boolean;
  onOpenCase: (job: AIJobDto) => void;
  onAcceptPatient: (id: string) => Promise<void>;
  onRejectPatient: (id: string) => Promise<void>;
  onRefresh: () => void;
}

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export default function PatientsHub({
  backendJobs,
  activePatients,
  pendingLinks,
  loading,
  onOpenCase,
  onAcceptPatient,
  onRejectPatient,
  onRefresh,
}: PatientsHubProps) {
  const [sel, setSel] = useState<{ name: string; bucket: StatusBucket } | null>(null);
  const [actionId, setActionId] = useState<{ id: string; act: 'accept' | 'reject' } | null>(null);

  const rows = useMemo((): PatientRow[] => {
    const nameSet = new Set<string>();
    for (const p of activePatients) nameSet.add(p.patient_name);
    for (const j of backendJobs) if (j.patient_name) nameSet.add(j.patient_name);

    return Array.from(nameSet)
      .sort()
      .map(name => {
        const jobs = backendJobs.filter(j => j.patient_name === name);
        const counts: Record<StatusBucket, number> = {
          'new-uploads': 0,
          'needs-review': 0,
          'finalized': 0,
        };
        for (const job of jobs) counts[getJobBucket(job.status)]++;
        return {
          name,
          linked: activePatients.find(p => p.patient_name === name) ?? null,
          jobs,
          counts,
        };
      });
  }, [backendJobs, activePatients]);

  const toggleBadge = (name: string, bucket: StatusBucket) => {
    setSel(prev =>
      prev?.name === name && prev.bucket === bucket ? null : { name, bucket }
    );
  };

  const handleAccept = async (id: string) => {
    setActionId({ id, act: 'accept' });
    try { await onAcceptPatient(id); } finally { setActionId(null); }
  };

  const handleReject = async (id: string) => {
    setActionId({ id, act: 'reject' });
    try { await onRejectPatient(id); } finally { setActionId(null); }
  };

  const selectedJobs = sel
    ? (rows.find(r => r.name === sel.name)?.jobs.filter(j => getJobBucket(j.status) === sel.bucket) ?? [])
    : [];

  const visibleRows = sel ? rows.filter(r => r.name === sel.name) : rows;
  const collapsedCount = sel ? rows.length - 1 : 0;

  return (
    <div className="ph-root">
      {/* ── Main column ──────────────────────────────────── */}
      <div className="ph-main">
        <div className="ph-topbar">
          <h2 className="ph-heading">Patients</h2>
          <button className="ph-refresh" onClick={onRefresh} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="ph-list">
          <AnimatePresence mode="sync" initial={false}>
            {sel && collapsedCount > 0 && (
              <motion.button
                key="__summary"
                className="ph-summary"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                onClick={() => setSel(null)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                {collapsedCount} other patient{collapsedCount !== 1 ? 's' : ''} — show all
              </motion.button>
            )}

            {visibleRows.map((row, idx) => (
              <motion.div
                key={row.name}
                className={`ph-row${sel?.name === row.name ? ' ph-row--active' : ''}`}
                layout="position"
                initial={{ opacity: 0, y: 14 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: sel ? 0 : idx * 0.04,
                    duration: 0.22,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  },
                }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              >
                <div className="ph-row__info">
                  <div className="ph-avatar">{initials(row.name)}</div>
                  <div>
                    <div className="ph-row__name">{row.name}</div>
                    {row.linked && (
                      <div className="ph-row__email">{row.linked.patient_email}</div>
                    )}
                  </div>
                </div>

                <div className="ph-badges">
                  {(['new-uploads', 'needs-review', 'finalized'] as StatusBucket[]).map(bucket => {
                    const count = row.counts[bucket];
                    const isActive = sel?.name === row.name && sel.bucket === bucket;
                    return (
                      <button
                        key={bucket}
                        className={`ph-badge ph-badge--${bucket}${isActive ? ' is-active' : ''}${count === 0 ? ' is-empty' : ''}`}
                        onClick={() => count > 0 && toggleBadge(row.name, bucket)}
                        disabled={count === 0}
                        title={`${bucketLabels[bucket]}: ${count}`}
                      >
                        <span className="ph-badge__n">{count}</span>
                        <span className="ph-badge__lbl">{bucketLabels[bucket]}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Detail panel slides in below the selected row */}
          <AnimatePresence>
            {sel && (
              <motion.div
                key={`${sel.name}::${sel.bucket}`}
                className="ph-detail"
                initial={{ opacity: 0, scaleY: 0.9, y: -10 }}
                animate={{
                  opacity: 1,
                  scaleY: 1,
                  y: 0,
                  transition: { type: 'spring', damping: 26, stiffness: 280, mass: 0.7 },
                }}
                exit={{ opacity: 0, scaleY: 0.92, y: -6, transition: { duration: 0.18 } }}
                style={{ transformOrigin: 'top center' }}
              >
                <div className="ph-detail__hd">
                  <span className="ph-detail__title">
                    {sel.name}
                    <span className={`ph-detail__chip ph-detail__chip--${sel.bucket}`}>
                      {bucketLabels[sel.bucket]}
                    </span>
                  </span>
                  <button className="ph-detail__close" onClick={() => setSel(null)} aria-label="Close panel">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                {selectedJobs.length === 0 ? (
                  <p className="ph-detail__none">No cases in this category.</p>
                ) : (
                  <div className="ph-cases">
                    {selectedJobs.map((job, ji) => (
                      <motion.div
                        key={job.job_id}
                        className="ph-case"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          transition: { delay: ji * 0.06, duration: 0.2 },
                        }}
                      >
                        <div className="ph-case__info">
                          <span className="ph-case__scan">Scan #{job.ct_scan_id}</span>
                          <span className="ph-case__date">
                            {new Date(job.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span className={`ph-case__status ph-case__status--${getJobBucket(job.status)}`}>
                          {getJobStatusLabel(job.status)}
                        </span>
                        <button className="ph-case__open" onClick={() => onOpenCase(job)}>
                          Open →
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {rows.length === 0 && !loading && (
            <div className="ph-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <p>No patients yet. Approve invite requests to get started.</p>
            </div>
          )}

          {loading && rows.length === 0 && (
            <p className="ph-loading">Loading patients…</p>
          )}
        </div>
      </div>

      {/* ── Aside: pending invites ────────────────────────── */}
      <aside className="ph-aside">
        <div className="ph-aside__hd">
          <span className="ph-aside__title">Pending Invites</span>
          {pendingLinks.length > 0 && (
            <span className="ph-aside__count">{pendingLinks.length}</span>
          )}
        </div>

        {pendingLinks.length === 0 ? (
          <p className="ph-aside__none">No pending requests.</p>
        ) : (
          <AnimatePresence initial={false}>
            {pendingLinks.map((link, li) => (
              <motion.div
                key={link.id}
                className="ph-invite"
                initial={{ opacity: 0, x: 16 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: { delay: li * 0.05, duration: 0.22 },
                }}
                exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
                layout
              >
                <div className="ph-invite__av">{initials(link.patient_name)}</div>
                <div className="ph-invite__info">
                  <div className="ph-invite__name">{link.patient_name}</div>
                  <div className="ph-invite__email">{link.patient_email}</div>
                </div>
                <div className="ph-invite__btns">
                  <button
                    className="ph-invite__accept"
                    onClick={() => handleAccept(String(link.id))}
                    disabled={!!actionId}
                    aria-label={`Accept ${link.patient_name}`}
                  >
                    {actionId?.id === String(link.id) && actionId.act === 'accept' ? (
                      '…'
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                  <button
                    className="ph-invite__reject"
                    onClick={() => handleReject(String(link.id))}
                    disabled={!!actionId}
                    aria-label={`Reject ${link.patient_name}`}
                  >
                    {actionId?.id === String(link.id) && actionId.act === 'reject' ? (
                      '…'
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </aside>
    </div>
  );
}
