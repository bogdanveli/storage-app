import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

interface DashboardStats {
  totalProducts: number;
  totalInvoices: number;
  lowStockCount: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalInvoices: 0,
    lowStockCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    navigate('/products', { state: { openAddModal: true } });
  };

  const handleGenerateInvoice = () => {
    navigate('/products', { state: { openInvoiceModal: true } });
  };

  const handleViewReports = () => {
    navigate('/invoices');
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Products Overview</h2>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {loading ? <div className="spinner" /> : stats.totalProducts}
          </div>
          <p className="text-gray-600">Total Products</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
          <div className="text-4xl font-bold text-green-600 mb-2">
            {loading ? <div className="spinner" /> : stats.totalInvoices}
          </div>
          <p className="text-gray-600">Invoices Generated</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
          <div className="text-4xl font-bold text-red-600 mb-2">
            {loading ? <div className="spinner" /> : stats.lowStockCount}
          </div>
          <p className="text-gray-600">Products Low in Stock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-gray-600">No recent activity</div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button 
              className="btn btn-primary w-full flex items-center justify-center"
              onClick={handleAddProduct}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Product
            </button>
            
            <button 
              className="btn btn-secondary w-full flex items-center justify-center"
              onClick={handleGenerateInvoice}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Invoice
            </button>
            
            <button 
              className="btn btn-secondary w-full flex items-center justify-center"
              onClick={handleViewReports}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Reports
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;