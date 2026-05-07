import { useState } from 'react';

interface RegisterStep0Props {
  formData: {
    entity_type: 'individual' | 'company' | '';
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

export default function RegisterStep0({ formData, onChange, onNext }: RegisterStep0Props) {
  const [error, setError] = useState<string>('');

  const handleSelect = (type: 'individual' | 'company') => {
    onChange('entity_type', type);
    setError('');
  };

  const handleNext = () => {
    if (!formData.entity_type) {
      setError('Please select whether you are registering as an individual or company');
      return;
    }
    onNext();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: 'var(--white)'
        }}>
          Select Entity Type
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--gray)',
          marginBottom: '1.5rem'
        }}>
          Choose whether you're registering as an individual or a company
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <button
          type="button"
          onClick={() => handleSelect('individual')}
          style={{
            padding: '1.5rem',
            border: `2px solid ${formData.entity_type === 'individual' ? 'var(--gold)' : 'var(--navy-mid)'}`,
            borderRadius: '8px',
            background: formData.entity_type === 'individual' ? 'rgba(212, 175, 55, 0.1)' : 'var(--navy-dark)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--white)', marginBottom: '0.25rem' }}>
            Individual
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>
            For sole proprietors and freelancers
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('company')}
          style={{
            padding: '1.5rem',
            border: `2px solid ${formData.entity_type === 'company' ? 'var(--gold)' : 'var(--navy-mid)'}`,
            borderRadius: '8px',
            background: formData.entity_type === 'company' ? 'rgba(212, 175, 55, 0.1)' : 'var(--navy-dark)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--white)', marginBottom: '0.25rem' }}>
            Company
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>
            For registered businesses
          </div>
        </button>
      </div>

      {error && (
        <div className="field-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
}
