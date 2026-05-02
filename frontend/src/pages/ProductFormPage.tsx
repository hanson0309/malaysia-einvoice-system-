import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { productApi } from '../lib/api';
import '../styles/forms.css';

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    classificationCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit && id) {
      loadProduct(id);
    }
  }, [id, isEdit]);

  const loadProduct = async (productId: string) => {
    try {
      const response = await productApi.getById(productId);
      setFormData({
        ...response.data,
        price: response.data.price.toString(),
      });
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Price must be a positive number';
    }

    if (!formData.classificationCode.trim()) {
      newErrors.classificationCode = 'Classification code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
      };

      if (isEdit && id) {
        await productApi.update(id, payload);
      } else {
        await productApi.create(payload);
      }
      navigate('/dashboard/products');
    } catch (error: any) {
      console.error('Failed to save product:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to save product' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{
            borderColor: 'var(--navy-mid)',
            borderTopColor: 'var(--gold)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="form-page-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="form-page-header"
      >
        <h1 className="form-page-title">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
        <p className="form-page-subtitle">
          {isEdit ? 'Update product information' : 'Add a new product to your catalog'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="form-card"
      >
        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              color: 'var(--error)',
              fontSize: '0.875rem'
            }}>
              {errors.submit}
            </div>
          )}

          <div className={`form-field ${errors.name ? 'error' : ''}`}>
            <label htmlFor="name" className="form-field-label">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-field-input"
              placeholder="Professional Services"
            />
            {errors.name && <p className="form-field-error">{errors.name}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="description" className="form-field-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-field-input form-field-textarea"
              placeholder="Detailed description of the product or service"
            />
          </div>

          <div className={`form-field ${errors.price ? 'error' : ''}`}>
            <label htmlFor="price" className="form-field-label">
              Price (MYR) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="form-field-input"
              placeholder="100.00"
              step="0.01"
              min="0"
            />
            {errors.price && <p className="form-field-error">{errors.price}</p>}
          </div>

          <div className={`form-field ${errors.classificationCode ? 'error' : ''}`}>
            <label htmlFor="classificationCode" className="form-field-label">
              Classification Code *
            </label>
            <input
              type="text"
              id="classificationCode"
              name="classificationCode"
              value={formData.classificationCode}
              onChange={handleChange}
              className="form-field-input"
              placeholder="001"
            />
            {errors.classificationCode && <p className="form-field-error">{errors.classificationCode}</p>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard/products')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary-form"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
