import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { productApi } from '../lib/api';
import '../styles/dashboard.css';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  classificationCode?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productApi.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productApi.delete(id);
      setProducts(products.filter((p) => p._id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(price);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <Link to="/dashboard/products/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Product
          </Link>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>No products found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Classification Code</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <motion.tr
                    key={product._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="table-row"
                  >
                    <td className="font-medium">{product.name}</td>
                    <td className="text-gray-600">
                      {product.description
                        ? product.description.length > 50
                          ? product.description.substring(0, 50) + '...'
                          : product.description
                        : '-'}
                    </td>
                    <td className="price-cell">{formatPrice(product.price)}</td>
                    <td>{product.classificationCode || '-'}</td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <Link
                          to={`/dashboard/products/${product._id}/edit`}
                          className="action-btn edit-btn"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="action-btn delete-btn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
