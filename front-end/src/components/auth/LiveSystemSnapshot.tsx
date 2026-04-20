import { useEffect, useRef, useState } from 'react';
import TextType from '../ui/TextType';

type LaneId = 'patient' | 'dentist';

interface LaneStep {
  label: string;
  text: string;
}

interface LaneConfig {
  title: string;
  subtitle: string;
  badge: string;
  meta: [string, string];
}

const LANE_CONFIG: Record<LaneId, LaneConfig> = {
  patient: {
    title: 'Patient POV',
    subtitle: 'Portal journey',
    badge: 'Patient stream',
    meta: ['Portal updates: live', 'Reminders active']
  },
  dentist: {
    title: 'Dentist POV',
    subtitle: 'Clinic workflow',
    badge: 'Dentist stream',
    meta: ['Queue sync: live', 'SLA monitor on']
  }
};

const LANE_STEPS: Record<LaneId, LaneStep[]> = {
  patient: [
    { label: 'Scan upload', text: 'Patient uploads scan from portal.' },
    { label: 'Context', text: 'Patient confirms symptoms and history.' },
    { label: 'AI response', text: 'AI findings and risk summary are delivered.' },
    { label: 'Dentist feedback', text: 'Patient receives dentist-reviewed notes.' },
    { label: 'Decision', text: 'Patient chooses appointment or advice path.' }
  ],
  dentist: [
    { label: 'Queue signal', text: 'AI triage pushes case to dentist queue.' },
    { label: 'Report review', text: 'Dentist opens AI findings and annotations.' },
    { label: 'History match', text: 'Dentist checks medical history with scan data.' },
    { label: 'Clinical judgment', text: 'Dentist validates findings and adds context.' },
    { label: 'Decision split', text: 'Dentist selects booking or advice direction.' }
  ]
};

const STEP_DURATIONS: Record<LaneId, number[]> = {
  patient: [1450, 1550, 1750, 1750, 1600],
  dentist: [1500, 1750, 1800, 1800, 1600]
};

const BRANCH_HOLD_DURATION = 2800;

const LiveSystemSnapshot = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedLane, setSelectedLane] = useState<LaneId>('patient');
  const [activeStep, setActiveStep] = useState(-1);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let isCancelled = false;
    const durations = STEP_DURATIONS[selectedLane];
    const steps = LANE_STEPS[selectedLane];

    const runStage = (stepIndex: number) => {
      if (isCancelled) return;

      setActiveStep(stepIndex);

      if (stepIndex < steps.length) {
        timeoutId = setTimeout(() => {
          runStage(stepIndex + 1);
        }, durations[stepIndex]);
        return;
      }

      timeoutId = setTimeout(() => {
        setCycle(prev => prev + 1);
        runStage(0);
      }, BRANCH_HOLD_DURATION);
    };

    runStage(0);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isVisible, selectedLane]);

  const renderLane = (lane: LaneId, laneActiveStep: number, isActiveFace: boolean) => {
    const config = LANE_CONFIG[lane];
    const steps = LANE_STEPS[lane];

    return (
      <section className={`snapshot-lane snapshot-lane--${lane} panel-card`} aria-label={config.title}>
        <div className="snapshot-lane-head">
          <div>
            <p className="snapshot-lane-kicker">{config.subtitle}</p>
            <h4 className="snapshot-lane-title">{config.title}</h4>
          </div>
          <span className="snapshot-lane-head-badge">{config.badge}</span>
        </div>

        <div className="snapshot-lane-steps">
          {steps.map((step, index) => {
            const isReached = laneActiveStep >= index;
            const isTyping = isActiveFace && laneActiveStep === index;

            return (
              <div
                key={`${lane}-${step.label}`}
                className={`snapshot-lane-step ${isReached ? 'snapshot-lane-step--reached' : ''} ${isTyping ? 'snapshot-lane-step--typing' : ''}`}
              >
                <span className="snapshot-lane-dot" aria-hidden="true" />
                <div>
                  <p className="snapshot-lane-step-label">{step.label}</p>

                  {isTyping ? (
                    <TextType
                      key={`${cycle}-${lane}-${index}`}
                      as="p"
                      className="snapshot-lane-step-text"
                      text={step.text}
                      typingSpeed={17}
                      initialDelay={70}
                      loop={false}
                      pauseDuration={0}
                      deletingSpeed={0}
                      showCursor
                    />
                  ) : (
                    <p className="snapshot-lane-step-text">{step.text}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="snapshot-lane-meta" aria-hidden="true">
          <span className="snapshot-lane-meta-chip">{config.meta[0]}</span>
          <span className="snapshot-lane-meta-chip">{config.meta[1]}</span>
        </div>
      </section>
    );
  };

  return (
    <div ref={containerRef} className={`snapshot-flip ${selectedLane === 'dentist' ? 'snapshot-flip--dentist' : ''}`} aria-live="polite">
      <div className="snapshot-flip-controls" role="tablist" aria-label="Live snapshot point of view">
        <button
          type="button"
          role="tab"
          aria-selected={selectedLane === 'patient'}
          className={`snapshot-flip-tab ${selectedLane === 'patient' ? 'snapshot-flip-tab--active' : ''}`}
          onClick={() => setSelectedLane('patient')}
        >
          Patient POV
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedLane === 'dentist'}
          className={`snapshot-flip-tab ${selectedLane === 'dentist' ? 'snapshot-flip-tab--active' : ''}`}
          onClick={() => setSelectedLane('dentist')}
        >
          Dentist POV
        </button>
      </div>

      <button
        type="button"
        className="snapshot-flip-stage"
        onClick={() => setSelectedLane(prev => (prev === 'patient' ? 'dentist' : 'patient'))}
        aria-label="Flip card to switch point of view"
      >
        <div className="snapshot-flip-card" aria-hidden="true">
          <div className="snapshot-flip-face snapshot-flip-face--patient">
            {renderLane('patient', selectedLane === 'patient' ? activeStep : -1, selectedLane === 'patient')}
          </div>
          <div className="snapshot-flip-face snapshot-flip-face--dentist">
            {renderLane('dentist', selectedLane === 'dentist' ? activeStep : -1, selectedLane === 'dentist')}
          </div>
        </div>
      </button>

      <p className="snapshot-flip-hint">Tap card to flip between patient and dentist view.</p>
    </div>
  );
};

export default LiveSystemSnapshot;