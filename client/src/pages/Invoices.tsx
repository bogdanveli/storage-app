import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { toast } from 'react-toastify';
import axios from 'axios';

interface Product {
  id: number;
  title: string;
  quantity: number;
  price: number;
  product_id: string;
}

interface InvoiceProduct extends Product {
  selectedQuantity: number;
}

interface InvoiceFormData {
  customerName: string;
  customerEmail: string;
  products: InvoiceProduct[];
}

const Invoices: React.FC = () => {
  const location = useLocation();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    customerName: '',
    customerEmail: '',
    products: []
  });

  useEffect(() => {
    // Handle products passed from the Products page
    if (location.state?.selectedProducts) {
      const selectedProducts = location.state.selectedProducts.map((product: Product) => ({
        ...product,
        selectedQuantity: 1 // Default selected quantity
      }));
      setFormData(prev => ({
        ...prev,
        products: selectedProducts
      }));
      setIsGenerateModalOpen(true);
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === productId 
          ? { ...p, selectedQuantity: Math.min(quantity, p.quantity) }
          : p
      )
    }));
  };

  const calculateTotal = () => {
    return formData.products.reduce((total, product) => 
      total + (product.price * product.selectedQuantity), 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First generate invoice preview
      const previewResponse = await axios.post('/api/invoices/preview', {
        selectedProducts: formData.products.map(p => ({
          id: p.id,
          quantity: p.selectedQuantity
        })),
        customerName: formData.customerName,
        customerEmail: formData.customerEmail
      });

      // Generate PDF
      const pdfResponse = await axios.post('/api/invoices/generate-pdf', {
        selectedProducts: formData.products.map(p => ({
          id: p.id,
          quantity: p.selectedQuantity
        })),
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        invoiceNumber: previewResponse.data.invoice.invoiceNumber
      });

      // Confirm invoice and update inventory
      await axios.post('/api/invoices/confirm', {
        selectedProducts: formData.products.map(p => ({
          id: p.id,
          quantity: p.selectedQuantity
        })),
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        invoiceNumber: previewResponse.data.invoice.invoiceNumber
      });

      toast.success('Invoice generated successfully');
      
      // Open PDF in new tab
      window.open(`http://localhost:3001${pdfResponse.data.downloadUrl}`, '_blank');
      
      setIsGenerateModalOpen(false);
      setFormData({
        customerName: '',
        customerEmail: '',
        products: []
      });
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error(error.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setIsGenerateModalOpen(true)}
        >
          Generate Invoice
        </button>
      </div>

      {/* Generate Invoice Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Generate Invoice</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Selected Products</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.products.map(product => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap">{product.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap">${product.price.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{product.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                min="1"
                                max={product.quantity}
                                value={product.selectedQuantity}
                                onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value))}
                                className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              ${(product.price * product.selectedQuantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-right font-medium">Total:</td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold">
                            ${calculateTotal().toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || formData.products.length === 0}
                >
                  {loading ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Invoices; 