import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';

interface AppSettings {
  companyName: string;
  email: string;
  address: string;
  phone: string;
  currency: string;
  lowStockThreshold: number;
}

interface CurrencyRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  last_updated: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    companyName: '',
    email: '',
    address: '',
    phone: '',
    currency: 'USD',
    lowStockThreshold: 10
  });

  const [isEditing, setIsEditing] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrencyRates();
  }, []);

  const fetchCurrencyRates = async () => {
    try {
      const response = await axios.get('/api/settings/currency-rates');
      setCurrencyRates(response.data);
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      toast.error('Failed to fetch currency rates');
    }
  };

  const handleRateChange = async (id: number, newRate: number) => {
    try {
      setLoading(true);
      await axios.put(`/api/settings/currency-rates/${id}`, { rate: newRate });
      toast.success('Currency rate updated successfully');
      fetchCurrencyRates(); // Refresh rates
    } catch (error) {
      console.error('Error updating currency rate:', error);
      toast.error('Failed to update currency rate');
    } finally {
      setLoading(false);
    }
  };

  const mkdToCnyRate = currencyRates.find(r => r.from_currency === 'MKD' && r.to_currency === 'CNY');
  const otherRates = currencyRates.filter(r => !(r.from_currency === 'MKD' && r.to_currency === 'CNY'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement settings update
    setIsEditing(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Currency Settings</h2>

        {/* MKD to CNY Conversion Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">MKD to CNY Conversion Rate</h3>
            {mkdToCnyRate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      1 MKD = {mkdToCnyRate.rate} CNY
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Last updated: {new Date(mkdToCnyRate.last_updated).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-32 input"
                        value={mkdToCnyRate.rate}
                        onChange={(e) => handleRateChange(mkdToCnyRate.id, parseFloat(e.target.value))}
                        step="0.0001"
                        min="0"
                        disabled={loading}
                      />
                      <span className="text-sm font-medium text-gray-700">CNY</span>
                    </div>
                    <button
                      className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => handleRateChange(mkdToCnyRate.id, mkdToCnyRate.rate)}
                      disabled={loading}
                    >
                      Update Rate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Other Currency Rates */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Currency Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherRates.map((rate) => (
                <div key={rate.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        1 {rate.from_currency} = {rate.rate} {rate.to_currency}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last updated: {new Date(rate.last_updated).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 input"
                        value={rate.rate}
                        onChange={(e) => handleRateChange(rate.id, parseFloat(e.target.value))}
                        step="0.0001"
                        min="0"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-600">{rate.to_currency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <button 
            className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Settings'}
          </button>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={e => setSettings({...settings, companyName: e.target.value})}
                  disabled={!isEditing}
                  className="input"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  disabled={!isEditing}
                  className="input"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  disabled={!isEditing}
                  className="input"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={e => setSettings({...settings, currency: e.target.value})}
                  disabled={!isEditing}
                  className="input"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="MKD">MKD (ден)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  disabled={!isEditing}
                  className="input"
                  rows={3}
                  placeholder="Enter company address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={e => setSettings({...settings, lowStockThreshold: parseInt(e.target.value)})}
                  disabled={!isEditing}
                  className="input"
                  min="0"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end mt-6">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Settings; 