import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { productApi } from '../lib/api';
import '../styles/elegant-theme.css';

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    classificationCode: '',
    barcode: '',
    stock_quantity: '',
    reorder_level: '',
    unit: '',
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
      const product = response.data;

      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: (product.unit_price || product.price || 0).toString(),
        classificationCode: product.classificationCode || '',
        barcode: product.barcode || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        reorder_level: product.reorder_level?.toString() || '',
        unit: product.unit || '',
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
        unit_price: Number(formData.price),
        stock_quantity: formData.stock_quantity ? Number(formData.stock_quantity) : undefined,
        reorder_level: formData.reorder_level ? Number(formData.reorder_level) : undefined,
      };
      // Remove the price field since API expects unit_price
      delete (payload as any).price;

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
      <div className="elegant-loading">
        <motion.div
          className="elegant-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="elegant-page">
      {/* Header */}
      <motion.div
        className="elegant-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="elegant-header-content">
          <div className="elegant-header-text">
            <motion.button
              onClick={() => navigate('/dashboard/products')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--elegant-overlay)',
                border: '1px solid var(--elegant-border)',
                borderRadius: 'var(--radius-sharp)',
                color: 'var(--elegant-text-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                marginBottom: '1rem',
                transition: 'all 0.3s ease',
              }}
              whileHover={{ x: -4, borderColor: 'var(--elegant-border-hover)' }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeft size={16} />
              <span>Back to Products</span>
            </motion.button>
            <motion.h1
              className="elegant-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {isEdit ? 'Edit Product' : 'New Product'}
            </motion.h1>
            <motion.p
              className="elegant-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {isEdit ? 'Update product information' : 'Add a new product to your catalog'}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Form Card */}
      <motion.div
        className="elegant-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        <div className="elegant-card-body" style={{ padding: '2.5rem' }}>
          <form onSubmit={handleSubmit}>
            {errors.submit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sharp)',
                  color: 'var(--elegant-accent-red-light)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {errors.submit}
              </motion.div>
            )}

            <div className="elegant-form-group">
              <label htmlFor="name" className="elegant-form-label">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="elegant-form-input"
                placeholder="Professional Services"
              />
              {errors.name && <p className="elegant-form-error">{errors.name}</p>}
            </div>

            <div className="elegant-form-group">
              <label htmlFor="description" className="elegant-form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="elegant-form-textarea"
                placeholder="Detailed description of the product or service"
              />
            </div>

            <div className="elegant-form-group">
              <label htmlFor="price" className="elegant-form-label">
                Price (MYR) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="elegant-form-input"
                placeholder="100.00"
                step="0.01"
                min="0"
              />
              {errors.price && <p className="elegant-form-error">{errors.price}</p>}
            </div>

            <div className="elegant-form-group">
              <label htmlFor="classificationCode" className="elegant-form-label">
                Classification Code *
              </label>
              <input
                type="text"
                id="classificationCode"
                name="classificationCode"
                value={formData.classificationCode}
                onChange={handleChange}
                className="elegant-form-input"
                placeholder="001"
              />
              {errors.classificationCode && <p className="elegant-form-error">{errors.classificationCode}</p>}
            </div>

            {/* POS Fields Section */}
            <div
              style={{
                marginTop: '2rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--elegant-border)',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: 'var(--elegant-text-primary)',
                  marginBottom: '1.5rem',
                  letterSpacing: '-0.01em',
                }}
              >
                POS & Inventory Settings
              </h3>

              <div className="elegant-form-group">
                <label htmlFor="barcode" className="elegant-form-label">
                  Barcode
                </label>
                <input
                  type="text"
                  id="barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="elegant-form-input"
                  placeholder="1234567890123"
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                <div className="elegant-form-group">
                  <label htmlFor="stock_quantity" className="elegant-form-label">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    id="stock_quantity"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleChange}
                    className="elegant-form-input"
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="elegant-form-group">
                  <label htmlFor="reorder_level" className="elegant-form-label">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    id="reorder_level"
                    name="reorder_level"
                    value={formData.reorder_level}
                    onChange={handleChange}
                    className="elegant-form-input"
                    placeholder="10"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="elegant-form-group">
                  <label htmlFor="unit" className="elegant-form-label">
                    Unit
                  </label>
                  <input
                    type="text"
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="elegant-form-input"
                    placeholder="pcs, kg, box, etc."
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2.5rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--elegant-border)',
              }}
            >
              <motion.button
                type="button"
                onClick={() => navigate('/dashboard/products')}
                className="elegant-btn elegant-btn-secondary"
                style={{ flex: 1 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                disabled={isLoading}
                className="elegant-btn elegant-btn-primary"
                style={{ flex: 1 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
