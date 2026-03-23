import { 
  useState, 
  useCallback, 
  useMemo, 
  memo,
  type ReactNode 
} from 'react';
import {
  getTreatmentPlansByPatient,
  getTreatmentPlansByDentist,
  getTreatmentPlanById,
  updateTreatmentPlan,
  updateProcedureStatus,
  formatDate,
  type TreatmentPlan,
  type TreatmentProcedure
} from '../data/database';
import { Icon, Badge, EmptyState, Modal } from './ui';
import './TreatmentPlanning.css';

interface TreatmentPlanningProps {
  userId: string;
  userName: string;
  userRole: 'patient' | 'dentist';
  patientId?: string;
  patientName?: string;
}

// Status configuration with proper typing
const STATUS_CONFIG = {
  draft: { variant: 'default', label: 'Draft' },
  proposed: { variant: 'info', label: 'Proposed' },
  accepted: { variant: 'success', label: 'Accepted' },
  'in-progress': { variant: 'warning', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
} as const;

const PRIORITY_CONFIG = {
  urgent: { variant: 'danger', label: 'Urgent' },
  high: { variant: 'warning', label: 'High' },
  medium: { variant: 'default', label: 'Medium' },
  low: { variant: 'success', label: 'Low' },
} as const;

// Currency formatter - created once
const currencyFormatter = new Intl.NumberFormat('en-US', { 
  style: 'currency', 
  currency: 'USD' 
});

// Extracted Components
const ProgressRing = memo(({ 
  percentage, 
  size = 60, 
  strokeWidth = 6 
}: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg className="progress-ring" width={size} height={size}>
      <circle
        className="progress-ring__background"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <circle
        className="progress-ring__progress"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        className="progress-ring__text"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {percentage}%
      </text>
    </svg>
  );
});

ProgressRing.displayName = 'ProgressRing';

const PlanCard = memo(({ 
  plan, 
  onView 
}: { 
  plan: TreatmentPlan; 
  onView: () => void;
}) => {
  const statusConfig = STATUS_CONFIG[plan.status];
  const completionPercentage = useMemo(() => {
    if (plan.procedures.length === 0) return 0;
    const completed = plan.procedures.filter(p => p.status === 'completed').length;
    return Math.round((completed / plan.procedures.length) * 100);
  }, [plan.procedures]);

  return (
    <div className="plan-card" onClick={onView} role="button" tabIndex={0}>
      <div className="plan-card__header">
        <div className="plan-card__info">
          <h3 className="plan-card__title">{plan.title}</h3>
          <p className="plan-card__patient">{plan.patientName}</p>
        </div>
        <Badge variant={statusConfig.variant as any}>{statusConfig.label}</Badge>
      </div>
      
      <div className="plan-card__body">
        <div className="plan-card__progress">
          <ProgressRing percentage={completionPercentage} size={56} />
        </div>
        <div className="plan-card__details">
          <div className="plan-card__stat">
            <Icon name="file-text" size={16} />
            <span>{plan.procedures.length} procedures</span>
          </div>
          <div className="plan-card__stat">
            <Icon name="dollar-sign" size={16} />
            <span>{currencyFormatter.format(plan.patientResponsibility)}</span>
          </div>
          <div className="plan-card__stat">
            <Icon name="calendar" size={16} />
            <span>{formatDate(plan.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

PlanCard.displayName = 'PlanCard';

const CostSummary = memo(({ plan }: { plan: TreatmentPlan }) => (
  <div className="cost-summary">
    <h4 className="cost-summary__title">Cost Breakdown</h4>
    <div className="cost-summary__grid">
      <div className="cost-summary__item">
        <span className="cost-summary__label">Total Cost</span>
        <span className="cost-summary__value">{currencyFormatter.format(plan.totalCost)}</span>
      </div>
      <div className="cost-summary__item cost-summary__item--success">
        <span className="cost-summary__label">Insurance Coverage</span>
        <span className="cost-summary__value">-{currencyFormatter.format(plan.insuranceCoverage)}</span>
      </div>
      <div className="cost-summary__divider" />
      <div className="cost-summary__item cost-summary__item--primary">
        <span className="cost-summary__label">Your Responsibility</span>
        <span className="cost-summary__value cost-summary__value--large">
          {currencyFormatter.format(plan.patientResponsibility)}
        </span>
      </div>
    </div>
  </div>
));

CostSummary.displayName = 'CostSummary';

const ProcedureRow = memo(({ 
  procedure,
  canComplete,
  onComplete
}: { 
  procedure: TreatmentProcedure;
  canComplete: boolean;
  onComplete: () => void;
}) => {
  const priorityConfig = PRIORITY_CONFIG[procedure.priority];
  const statusConfig = STATUS_CONFIG[procedure.status as keyof typeof STATUS_CONFIG] || 
    { variant: 'default', label: procedure.status };

  return (
    <tr className="procedure-row">
      <td>
        <div className="procedure-row__code">
          <span className="procedure-row__code-badge">{procedure.code}</span>
          <span className="procedure-row__tooth">Tooth #{procedure.tooth}</span>
        </div>
      </td>
      <td>{procedure.description}</td>
      <td>
        <Badge variant={priorityConfig.variant as any} size="sm">
          {priorityConfig.label}
        </Badge>
      </td>
      <td>
        <Badge variant={statusConfig.variant as any} size="sm">
          {statusConfig.label}
        </Badge>
      </td>
      <td className="procedure-row__cost">{currencyFormatter.format(procedure.estimatedCost)}</td>
      <td className="procedure-row__actions">
        {canComplete && procedure.status !== 'completed' && (
          <button 
            className="btn btn--sm btn--success"
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
          >
            <Icon name="check-circle" size={14} />
            Complete
          </button>
        )}
        {procedure.status === 'completed' && procedure.completedDate && (
          <span className="procedure-row__completed-date">
            <Icon name="check-circle" size={14} />
            {formatDate(procedure.completedDate)}
          </span>
        )}
      </td>
    </tr>
  );
});

ProcedureRow.displayName = 'ProcedureRow';

// Main Component
const TreatmentPlanning = ({ 
  userId, 
  userName, 
  userRole, 
  patientId, 
  patientName 
}: TreatmentPlanningProps) => {
  const [plans, setPlans] = useState<TreatmentPlan[]>(() => {
    return userRole === 'patient'
      ? getTreatmentPlansByPatient(userId)
      : getTreatmentPlansByDentist(userId);
  });
  
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [showExportModal, setShowExportModal] = useState(false);

  // Callbacks
  const refreshPlans = useCallback(() => {
    const newPlans = userRole === 'patient'
      ? getTreatmentPlansByPatient(userId)
      : getTreatmentPlansByDentist(userId);
    setPlans(newPlans);
  }, [userId, userRole]);

  const handleViewPlan = useCallback((plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    setViewMode('detail');
  }, []);

  const handleAcceptPlan = useCallback((planId: string) => {
    updateTreatmentPlan(planId, { 
      status: 'accepted', 
      patientConsent: true, 
      consentDate: new Date().toISOString() 
    });
    refreshPlans();
    setSelectedPlan(getTreatmentPlanById(planId) || null);
  }, [refreshPlans]);

  const handleProcedureComplete = useCallback((planId: string, procedureId: string) => {
    updateProcedureStatus(planId, procedureId, 'completed', new Date().toISOString());
    refreshPlans();
    setSelectedPlan(getTreatmentPlanById(planId) || null);
  }, [refreshPlans]);

  const handleExportPDF = useCallback(() => {
    if (!selectedPlan) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Treatment Plan - ${selectedPlan.patientName}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: system-ui, sans-serif; padding: 40px; color: #1f2937; }
            h1 { color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 12px; }
            h2 { color: #374151; margin-top: 32px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background: #f9fafb; font-weight: 600; }
            .header { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
            .summary { background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; }
            .total { font-size: 24px; font-weight: bold; color: #2563EB; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; }
            .badge--urgent { background: #fee2e2; color: #dc2626; }
            .badge--high { background: #fed7aa; color: #c2410c; }
            .badge--medium { background: #fef3c7; color: #d97706; }
            .badge--low { background: #d1fae5; color: #047857; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Treatment Plan</h1>
          <div class="header">
            <div>
              <p><strong>Patient:</strong> ${selectedPlan.patientName}</p>
              <p><strong>Dentist:</strong> ${selectedPlan.dentistName}</p>
            </div>
            <div>
              <p><strong>Created:</strong> ${formatDate(selectedPlan.createdAt)}</p>
              <p><strong>Status:</strong> ${STATUS_CONFIG[selectedPlan.status].label}</p>
            </div>
          </div>
          
          <h2>Procedures</h2>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Tooth</th>
                <th>Description</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${selectedPlan.procedures.map(p => `
                <tr>
                  <td>${p.code}</td>
                  <td>${p.tooth}</td>
                  <td>${p.description}</td>
                  <td><span class="badge badge--${p.priority}">${p.priority}</span></td>
                  <td>${p.status}</td>
                  <td>${currencyFormatter.format(p.estimatedCost)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <h2 style="margin-top: 0">Cost Summary</h2>
            <p>Total Cost: ${currencyFormatter.format(selectedPlan.totalCost)}</p>
            <p>Insurance Coverage: -${currencyFormatter.format(selectedPlan.insuranceCoverage)}</p>
            <p class="total">Your Responsibility: ${currencyFormatter.format(selectedPlan.patientResponsibility)}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    setShowExportModal(false);
  }, [selectedPlan]);

  // Computed values
  const completionPercentage = useMemo(() => {
    if (!selectedPlan || selectedPlan.procedures.length === 0) return 0;
    const completed = selectedPlan.procedures.filter(p => p.status === 'completed').length;
    return Math.round((completed / selectedPlan.procedures.length) * 100);
  }, [selectedPlan]);

  return (
    <div className="treatment-planning">
      {viewMode === 'list' && (
        <>
          <header className="treatment-planning__header">
            <div>
              <h2 className="treatment-planning__title">Treatment Plans</h2>
              <p className="treatment-planning__subtitle">
                {userRole === 'patient' 
                  ? 'View and manage your treatment plans'
                  : 'Manage patient treatment plans'
                }
              </p>
            </div>
            {userRole === 'dentist' && (
              <button className="btn btn--primary">
                <Icon name="plus" size={18} />
                New Plan
              </button>
            )}
          </header>

          <div className="plan-grid">
            {plans.length > 0 ? (
              plans.map(plan => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  onView={() => handleViewPlan(plan)} 
                />
              ))
            ) : (
              <EmptyState
                icon="file-text"
                title="No treatment plans"
                description={
                  userRole === 'patient'
                    ? "You don't have any treatment plans yet"
                    : "No treatment plans created yet"
                }
              />
            )}
          </div>
        </>
      )}

      {viewMode === 'detail' && selectedPlan && (
        <>
          <header className="treatment-planning__header">
            <button 
              className="btn btn--ghost"
              onClick={() => { setViewMode('list'); setSelectedPlan(null); }}
            >
              <Icon name="chevron-left" size={18} />
              Back to Plans
            </button>
            <div className="treatment-planning__actions">
              <button 
                className="btn btn--secondary"
                onClick={() => setShowExportModal(true)}
              >
                <Icon name="printer" size={18} />
                Export PDF
              </button>
              {userRole === 'patient' && selectedPlan.status === 'proposed' && (
                <button 
                  className="btn btn--primary"
                  onClick={() => handleAcceptPlan(selectedPlan.id)}
                >
                  <Icon name="check-circle" size={18} />
                  Accept Plan
                </button>
              )}
            </div>
          </header>

          <div className="plan-detail">
            <div className="plan-detail__header">
              <div className="plan-detail__info">
                <h2 className="plan-detail__title">{selectedPlan.title}</h2>
                <p className="plan-detail__meta">
                  Created {formatDate(selectedPlan.createdAt)} • {selectedPlan.dentistName}
                </p>
              </div>
              <div className="plan-detail__status">
                <Badge 
                  variant={STATUS_CONFIG[selectedPlan.status].variant as any} 
                  size="md"
                >
                  {STATUS_CONFIG[selectedPlan.status].label}
                </Badge>
                <ProgressRing percentage={completionPercentage} />
              </div>
            </div>

            <div className="plan-detail__content">
              <div className="plan-detail__main">
                <h3>Procedures</h3>
                <div className="procedures-table-wrapper">
                  <table className="procedures-table">
                    <thead>
                      <tr>
                        <th>Procedure</th>
                        <th>Description</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlan.procedures.map(procedure => (
                        <ProcedureRow
                          key={procedure.id}
                          procedure={procedure}
                          canComplete={userRole === 'dentist'}
                          onComplete={() => handleProcedureComplete(selectedPlan.id, procedure.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="plan-detail__sidebar">
                <CostSummary plan={selectedPlan} />
                
                {selectedPlan.patientConsent && (
                  <div className="consent-badge">
                    <Icon name="check-circle" size={18} />
                    <div>
                      <span className="consent-badge__label">Patient Consent</span>
                      <span className="consent-badge__date">
                        {selectedPlan.consentDate && formatDate(selectedPlan.consentDate)}
                      </span>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Treatment Plan"
        size="sm"
      >
        <div className="export-options">
          <p>Choose an export format:</p>
          <button className="export-option" onClick={handleExportPDF}>
            <Icon name="printer" size={24} />
            <div>
              <span className="export-option__title">Print / PDF</span>
              <span className="export-option__desc">Open in print dialog for PDF or printing</span>
            </div>
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default memo(TreatmentPlanning);
