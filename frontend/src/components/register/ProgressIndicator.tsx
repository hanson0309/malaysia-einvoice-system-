import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        color: 'var(--gray)',
        fontSize: '0.875rem'
      }}>
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div style={{
        width: '100%',
        height: '4px',
        background: 'var(--navy-mid)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
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
