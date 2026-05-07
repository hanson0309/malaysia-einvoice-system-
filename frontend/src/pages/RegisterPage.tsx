import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import ProgressIndicator from '../components/register/ProgressIndicator';
import RegisterStep0 from '../components/register/RegisterStep0';
import RegisterStep1 from '../components/register/RegisterStep1';
import RegisterStep2 from '../components/register/RegisterStep2';
import RegisterStep3 from '../components/register/RegisterStep3';
import '../styles/login.css';

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Entity type
    entity_type: '' as 'individual' | 'company' | '',

    // Step 1
    company_name: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Step 2
    company_registration_no: '',
    tin_number: '',
    business_activity_code: '',
    sst_registration_no: '',

    // Step 3
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    state_code: '',
    country_code: 'MY'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Panel - Branding */}
      <motion.div
        className="brand-panel"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="geometric-pattern"></div>

        <motion.div
          className="logo-section"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="logo">
            <span className="logo-accent">MyInvois</span>
          </h1>
          <p className="tagline">Invoice Management System</p>
        </motion.div>

        <motion.div
          className="brand-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h2 className="brand-title">
            Start your journey to<br />effortless invoicing
          </h2>
          <p className="brand-description">
            Join professionals who trust our platform to manage their invoicing with precision, security, and elegance.
          </p>

          <div className="features">
            <div className="feature">
              <div className="feature-icon"></div>
              <span>Secure</span>
            </div>
            <div className="feature">
              <div className="feature-icon"></div>
              <span>Compliant</span>
            </div>
            <div className="feature">
              <div className="feature-icon"></div>
              <span>Professional</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="form-panel">
        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="form-header">
            <h2 className="form-title">Create Account</h2>
            <p className="form-subtitle">Start managing your invoices professionally</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="error-message"
              >
                {error}
              </motion.div>
            )}

            <ProgressIndicator currentStep={currentStep} totalSteps={4} />

            {currentStep === 0 && (
              <RegisterStep0
                formData={{
                  entity_type: formData.entity_type
                }}
                onChange={handleFieldChange}
                onNext={handleNext}
              />
            )}

            {currentStep === 1 && (
              <RegisterStep1
                formData={{
                  company_name: formData.company_name,
                  email: formData.email,
                  password: formData.password,
                  confirmPassword: formData.confirmPassword
                }}
                entity_type={formData.entity_type}
                onChange={handleFieldChange}
                onNext={handleNext}
              />
            )}

            {currentStep === 2 && (
              <RegisterStep2
                formData={{
                  company_registration_no: formData.company_registration_no,
                  tin_number: formData.tin_number,
                  business_activity_code: formData.business_activity_code,
                  sst_registration_no: formData.sst_registration_no
                }}
                onChange={handleFieldChange}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <RegisterStep3
                formData={{
                  phone: formData.phone,
                  address_line1: formData.address_line1,
                  address_line2: formData.address_line2,
                  city: formData.city,
                  postcode: formData.postcode,
                  state_code: formData.state_code
                }}
                onChange={handleFieldChange}
                onSubmit={handleSubmit}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}
          </form>

          <div className="form-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>

          <div className="security-badge">
            <div className="badge-item">
              <div className="badge-dot"></div>
              <span>Secure</span>
            </div>
            <div className="badge-item">
              <div className="badge-dot"></div>
              <span>Compliant</span>
            </div>
            <div className="badge-item">
              <div className="badge-dot"></div>
              <span>Professional</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
