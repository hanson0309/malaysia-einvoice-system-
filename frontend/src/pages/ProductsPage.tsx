import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { productApi } from '../lib/api';
import * as XLSX from 'xlsx';
import '../styles/dashboard.css';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  classificationCode?: string;
  barcode?: string;
  stock_quantity?: number;
  reorder_level?: number;
  unit?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productApi.getAll();
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productApi.delete(id);
      setProducts(products.filter((p) => p._id !== id));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
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

  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredProducts.map((product) => ({
        Name: product.name,
        Description: product.description || '',
        Price: product.price,
        Barcode: product.barcode || '',
        Stock: product.stock_quantity || 0,
        'Reorder Level': product.reorder_level || 0,
        Unit: product.unit || '',
        'Classification Code': product.classificationCode || '',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Name
        { wch: 30 }, // Description
        { wch: 12 }, // Price
        { wch: 15 }, // Barcode
        { wch: 10 }, // Stock
        { wch: 15 }, // Reorder Level
        { wch: 10 }, // Unit
        { wch: 20 }, // Classification Code
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `products_export_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      toast.success('Products exported successfully');
    } catch (error) {
      console.error('Failed to export products:', error);
      toast.error('Failed to export products');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      // Create template with sample data and instructions
      const templateData = [
        {
          Name: 'Sample Product',
          Description: 'Product description here',
          Price: 100.00,
          Barcode: '1234567890',
          Stock: 50,
          'Reorder Level': 10,
          Unit: 'pcs',
          'Classification Code': '001',
        },
        {
          Name: '',
          Description: '',
          Price: 0,
          Barcode: '',
          Stock: 0,
          'Reorder Level': 0,
          Unit: '',
          'Classification Code': '',
        },
      ];

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(templateData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Name
        { wch: 30 }, // Description
        { wch: 12 }, // Price
        { wch: 15 }, // Barcode
        { wch: 10 }, // Stock
        { wch: 15 }, // Reorder Level
        { wch: 10 }, // Unit
        { wch: 20 }, // Classification Code
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products Template');

      // Add instructions sheet
      const instructions = [
        { Field: 'Name', Required: 'Yes', Description: 'Product name (max 200 characters)' },
        { Field: 'Description', Required: 'No', Description: 'Product description' },
        { Field: 'Price', Required: 'Yes', Description: 'Unit price in MYR' },
        { Field: 'Barcode', Required: 'No', Description: 'Product barcode (max 50 characters)' },
        { Field: 'Stock', Required: 'No', Description: 'Current stock quantity' },
        { Field: 'Reorder Level', Required: 'No', Description: 'Minimum stock level before reorder' },
        { Field: 'Unit', Required: 'No', Description: 'Unit of measurement (e.g., pcs, kg, box)' },
        { Field: 'Classification Code', Required: 'No', Description: 'Product classification code' },
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      wsInstructions['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      // Save file
      XLSX.writeFile(wb, 'products_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Failed to download template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading('Importing products...');

    try {
      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('No data found in Excel file', { id: toastId });
        return;
      }

      // Validate and transform data
      const productsToImport = [];
      const errors = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const rowNum = i + 2; // +2 because Excel rows start at 1 and we have a header

        // Skip empty rows
        if (!row.Name && !row.Price) continue;

        // Validate required fields
        if (!row.Name || row.Name.toString().trim() === '') {
          errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }

        if (!row.Price || isNaN(Number(row.Price)) || Number(row.Price) <= 0) {
          errors.push(`Row ${rowNum}: Valid price is required`);
          continue;
        }

        // Transform data to match API format
        const product = {
          name: row.Name.toString().trim(),
          description: row.Description?.toString().trim() || '',
          price: Number(row.Price),
          barcode: row.Barcode?.toString().trim() || '',
          stock_quantity: row.Stock ? Number(row.Stock) : 0,
          reorder_level: row['Reorder Level'] ? Number(row['Reorder Level']) : 0,
          unit: row.Unit?.toString().trim() || '',
          classificationCode: row['Classification Code']?.toString().trim() || '',
        };

        productsToImport.push(product);
      }

      // Show validation errors if any
      if (errors.length > 0) {
        toast.error(`Found ${errors.length} error(s). Check console for details.`, { id: toastId });
        console.error('Import validation errors:', errors);
        return;
      }

      if (productsToImport.length === 0) {
        toast.error('No valid products found to import', { id: toastId });
        return;
      }

      // Import products one by one
      let successCount = 0;
      let failCount = 0;
      const importErrors = [];

      for (let i = 0; i < productsToImport.length; i++) {
        try {
          await productApi.create(productsToImport[i]);
          successCount++;
        } catch (error: any) {
          failCount++;
          const rowNum = i + 2;
          importErrors.push(`Row ${rowNum}: ${error.response?.data?.message || error.message}`);
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} product(s)`, { id: toastId });
        loadProducts(); // Reload products list
      }

      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} product(s). Check console for details.`, { id: toastId });
        console.error('Import errors:', importErrors);
      }

    } catch (error: any) {
      console.error('Failed to import products:', error);
      toast.error(error.message || 'Failed to import products', { id: toastId });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <motion.button
              onClick={handleDownloadTemplate}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#a78bfa',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Template
            </motion.button>

            <motion.button
              onClick={handleImportClick}
              disabled={isImporting}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                background: isImporting ? 'rgba(148, 163, 184, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                border: `1px solid ${isImporting ? 'rgba(148, 163, 184, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                color: isImporting ? '#94a3b8' : '#60a5fa',
                fontWeight: 600,
                cursor: isImporting ? 'not-allowed' : 'pointer',
              }}
              whileHover={!isImporting ? { scale: 1.02 } : {}}
              whileTap={!isImporting ? { scale: 0.98 } : {}}
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import Excel'}
            </motion.button>

            <motion.button
              onClick={handleExportExcel}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              Export Excel
            </motion.button>

            <Link
              to="/dashboard/products/new"
              className="btn-primary"
              style={{ color: '#ffffff' }}
            >
              <Plus className="w-4 h-4" />
              New Product
            </Link>
          </div>
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
                  <th>Barcode</th>
                  <th>Stock</th>
                  <th>Unit</th>
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
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {product.barcode || '-'}
                    </td>
                    <td>
                      {product.stock_quantity !== undefined ? (
                        <span style={{
                          color: (product.reorder_level && product.stock_quantity <= product.reorder_level)
                            ? '#f87171'
                            : '#34d399'
                        }}>
                          {product.stock_quantity}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{product.unit || '-'}</td>
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
