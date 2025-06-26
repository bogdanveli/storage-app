import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

interface Product {
  id: number;
  title: string;
  description: string;
  quantity: number;
  price_cny: number;
  product_id: string;
  category: string;
  supplier: string;
  image_url?: string;
}

interface ProductFormData {
  title: string;
  description: string;
  quantity: string;
  price_cny: string;
  product_id: string;
  category: string;
  supplier: string;
  image?: File;
}

interface FilterState {
  search: string;
  category: string;
  supplier: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
}

interface CurrencyRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  last_updated: string;
}

const PAGE_SIZE_OPTIONS = [36, 48, 60, 100, -1]; // -1 means "All"

const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(36);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    supplier: '',
    minPrice: '',
    maxPrice: '',
    inStock: false
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    quantity: '',
    price_cny: '',
    product_id: '',
    category: '',
    supplier: ''
  });
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Extract unique categories and suppliers when products change
  useEffect(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    const uniqueSuppliers = Array.from(new Set(products.map(p => p.supplier))).filter(Boolean);
    setCategories(uniqueCategories);
    setSuppliers(uniqueSuppliers);
  }, [products]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  // Add this to your existing useEffect
  useEffect(() => {
    const fetchCurrencyRates = async () => {
      try {
        const response = await axios.get('/api/settings/currency-rates');
        setCurrencyRates(response.data);
      } catch (error) {
        console.error('Error fetching currency rates:', error);
      }
    };

    fetchCurrencyRates();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products', {
        params: {
          limit: pageSize === -1 ? 'all' : pageSize // Use 'all' instead of -1
        }
      });
      const productsWithNumberPrice = response.data.products.map((product: any) => ({
        ...product,
        price: Number(product.price)
      }));
      setProducts(productsWithNumberPrice);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  // Filter and search logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !filters.search || 
        product.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.product_id.toLowerCase().includes(filters.search.toLowerCase());

      const matchesCategory = !filters.category || product.category === filters.category;
      const matchesSupplier = !filters.supplier || product.supplier === filters.supplier;
      
      const matchesPrice = (!filters.minPrice || product.price_cny >= Number(filters.minPrice)) &&
        (!filters.maxPrice || product.price_cny <= Number(filters.maxPrice));
      
      const matchesStock = !filters.inStock || product.quantity > 0;

      return matchesSearch && matchesCategory && matchesSupplier && matchesPrice && matchesStock;
    });
  }, [products, filters]);

  // Pagination logic
  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return filteredProducts;
    
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === -1) return 1;
    return Math.ceil(filteredProducts.length / pageSize);
  }, [filteredProducts.length, pageSize]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      supplier: '',
      minPrice: '',
      maxPrice: '',
      inStock: false
    });
    setCurrentPage(1);
  };

  const handleSelectProduct = (productId: number, e?: React.MouseEvent) => {
    // If clicked on a button (edit/delete), don't select the row
    if (e?.target instanceof HTMLButtonElement) {
      return;
    }
    
    setSelectedProducts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(productId)) {
        newSelection.delete(productId);
      } else {
        newSelection.add(productId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedProducts(new Set(products.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleGenerateInvoice = () => {
    const selectedProductsData = products.filter(p => selectedProducts.has(p.id));
    navigate('/invoices', { state: { selectedProducts: selectedProductsData } });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        image: e.target.files![0]
      }));
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      quantity: product.quantity.toString(),
      price_cny: product.price_cny.toString(),
      product_id: product.product_id,
      category: product.category,
      supplier: product.supplier
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (productId: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/products/${productId}`);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'image' && value) {
          formDataToSend.append('image', value);
        } else if (value !== undefined && value !== null) {
          formDataToSend.append(key, value.toString());
        }
      });

      await axios.post('/api/products', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Product added successfully');
      setIsAddModalOpen(false);
      fetchProducts();
      setFormData({
        title: '',
        description: '',
        quantity: '',
        price_cny: '',
        product_id: '',
        category: '',
        supplier: ''
      });
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.response?.data?.error || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'image' && value) {
          formDataToSend.append('image', value);
        } else if (value !== undefined && value !== null) {
          formDataToSend.append(key, value.toString());
        }
      });

      await axios.put(`/api/products/${selectedProduct.id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Product updated successfully');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      setFormData({
        title: '',
        description: '',
        quantity: '',
        price_cny: '',
        product_id: '',
        category: '',
        supplier: ''
      });
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.error || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const getConvertedPrice = (price: number, fromCurrency: string, toCurrency: string) => {
    const rate = currencyRates.find(r => r.from_currency === fromCurrency && r.to_currency === toCurrency);
    if (!rate) return null;
    return (price * rate.rate).toFixed(2);
  };

  // Calculate CNY price from MKD
  const getCNYFromMKD = (usdPrice: number) => {
    const usdToMkd = currencyRates.find(r => r.from_currency === 'USD' && r.to_currency === 'MKD');
    const mkdToCny = currencyRates.find(r => r.from_currency === 'MKD' && r.to_currency === 'CNY');
    
    if (!usdToMkd || !mkdToCny) return null;
    
    const mkdPrice = usdPrice * usdToMkd.rate;
    return (mkdPrice * mkdToCny.rate).toFixed(2);
  };

  // Add getMKDPrice function before the return statement
  const getMKDPrice = (priceCNY: number) => {
    const cnyToMkd = currencyRates.find(r => r.from_currency === 'CNY' && r.to_currency === 'MKD');
    if (!cnyToMkd) return '0.00';
    return (priceCNY * cnyToMkd.rate).toFixed(2);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Product
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              name="search"
              placeholder="Search products..."
              className="input"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          
          <div>
            <select
              name="category"
              className="input"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              name="supplier"
              className="input"
              value={filters.supplier}
              onChange={handleFilterChange}
            >
              <option value="">All Suppliers</option>
              {suppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              name="minPrice"
              placeholder="Min Price"
              className="input"
              value={filters.minPrice}
              onChange={handleFilterChange}
            />
            <input
              type="number"
              name="maxPrice"
              placeholder="Max Price"
              className="input"
              value={filters.maxPrice}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="inStock"
              id="inStock"
              checked={filters.inStock}
              onChange={handleFilterChange}
              className="rounded border-gray-300"
            />
            <label htmlFor="inStock">In Stock Only</label>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="btn btn-secondary"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
            
            <select
              className="input w-auto"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  {size === -1 ? 'All' : `${size} per page`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {pageSize === -1 ? 'all' : `${paginatedProducts.length} of ${filteredProducts.length}`} products
      </div>

      {paginatedProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No products found. Try adjusting your filters or add a new product.</p>
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-12 px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      onChange={handleSelectAll}
                      checked={selectedProducts.size === paginatedProducts.length}
                    />
                  </th>
                  <th scope="col" className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th scope="col" className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product ID
                  </th>
                  <th scope="col" className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price (USD)
                  </th>
                  <th scope="col" className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price (MKD)
                  </th>
                  <th scope="col" className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price (CNY)
                  </th>
                  <th scope="col" className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th scope="col" className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map(product => (
                  <tr 
                    key={product.id}
                    className={`hover:bg-gray-50 ${selectedProducts.has(product.id) ? 'bg-blue-50' : ''}`}
                    onClick={(e) => handleSelectProduct(product.id, e)}
                  >
                    <td className="px-3 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {product.image_url && (
                        <img 
                          src={`http://localhost:3001${product.image_url}`} 
                          alt={product.title}
                          className="h-12 w-12 object-cover rounded"
                        />
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.product_id}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.title}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="truncate max-w-xs" title={product.description}>
                        {product.description}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.quantity}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{product.price_cny.toFixed(2)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      ден{getMKDPrice(product.price_cny)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.supplier}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(product);
                          }}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product.id);
                          }}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pageSize !== -1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Floating Invoice Button */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <button
            className="btn btn-primary"
            onClick={handleGenerateInvoice}
          >
            Generate Invoice ({selectedProducts.size} items)
          </button>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Product</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product ID</label>
                  <input
                    type="text"
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (CNY)</label>
                  <input
                    type="number"
                    name="price_cny"
                    value={formData.price_cny}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input
                    type="file"
                    name="image"
                    onChange={handleFileChange}
                    className="mt-1 block w-full"
                    accept="image/*"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Product</h2>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product ID</label>
                  <input
                    type="text"
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (CNY)</label>
                  <input
                    type="number"
                    name="price_cny"
                    value={formData.price_cny}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Image (optional)</label>
                  <input
                    type="file"
                    name="image"
                    onChange={handleFileChange}
                    className="mt-1 block w-full"
                    accept="image/*"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Products;