import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoiceTemplateApi } from '../lib/api';

interface InvoiceTemplate {
  _id: string;
  name: string;
  description?: string;
  invoice_type: '01' | '02' | '03' | '04';
  payment_method?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_type: string;
    tax_rate: number;
    product_id?: string;
  }>;
  notes?: string;
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: InvoiceTemplate) => void;
  onSaveAsTemplate?: (templateData: { name: string; description: string }) => void;
  mode: 'load' | 'save';
}

export default function TemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onSaveAsTemplate,
  mode
}: TemplateModalProps) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    if (isOpen && mode === 'load') {
      loadTemplates();
    }
  }, [isOpen, mode]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await invoiceTemplateApi.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      await invoiceTemplateApi.delete(id);
      await loadTemplates();
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (onSaveAsTemplate) {
      onSaveAsTemplate({
        name: templateName.trim(),
        description: templateDescription.trim()
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '1.5rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
                borderRadius: '0.75rem'
              }}>
                <FileText style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#f1f5f9'
              }}>
                {mode === 'load' ? 'Load Template' : 'Save as Template'}
              </h2>
            </div>
            <motion.button
              onClick={onClose}
              style={{
                padding: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.5rem',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }}
              whileTap={{ scale: 0.9 }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </motion.button>
          </div>

          {/* Content */}
          {mode === 'save' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '0.5rem'
                }}>
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Monthly Service Invoice"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#f1f5f9',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '0.5rem'
                }}>
                  Description (Optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#f1f5f9',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <motion.button
                onClick={handleSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '0.75rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
                whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)' }}
                whileTap={{ scale: 0.98 }}
              >
                <Save style={{ width: '18px', height: '18px' }} />
                Save Template
              </motion.button>
            </div>
          ) : (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No templates found. Create one by saving your current invoice as a template.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {templates.map((template) => (
                    <motion.div
                      key={template._id}
                      style={{
                        padding: '1rem',
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      whileHover={{ background: 'rgba(30, 41, 59, 0.8)', scale: 1.02 }}
                      onClick={() => onSelectTemplate(template)}
                    >
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#f1f5f9',
                          marginBottom: '0.25rem'
                        }}>
                          {template.name}
                        </h3>
                        {template.description && (
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#94a3b8',
                            marginBottom: '0.5rem'
                          }}>
                            {template.description}
                          </p>
                        )}
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {template.items.length} item(s)
                        </p>
                      </div>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template._id);
                        }}
                        style={{
                          padding: '0.5rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '0.5rem',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
