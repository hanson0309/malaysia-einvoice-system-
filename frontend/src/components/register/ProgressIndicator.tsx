interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  // Input validation
  const validTotalSteps = Math.max(1, totalSteps);
  const validCurrentStep = Math.max(1, Math.min(currentStep, validTotalSteps));
  const progress = (validCurrentStep / validTotalSteps) * 100;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        color: 'var(--gray)',
        fontSize: '0.875rem'
      }}>
        <span>Step {validCurrentStep} of {validTotalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={validCurrentStep}
        aria-valuemin={1}
        aria-valuemax={validTotalSteps}
        aria-label={`Registration progress: step ${validCurrentStep} of ${validTotalSteps}`}
        style={{
          width: '100%',
          height: '4px',
          background: 'var(--navy-mid)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--gold-dark), var(--gold))',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}
