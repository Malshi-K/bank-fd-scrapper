import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, RefreshCw, Trash2, CheckCircle, Loader2, Building2, TrendingUp, Calendar, Phone, Mail, MapPin } from 'lucide-react';
import Logo from "../logo.png";

const API_BASE_URL = 'http://localhost:5000/api';

export default function BankFDRatesApp() {
  const [banks, setBanks] = useState({
    'HDFC': { url: 'https://www.hdfc.lk' },
    'NSB': { url: 'https://www.nsb.lk' },
    'RDB': { url: 'https://www.rdb.lk' },
    'SDB': { url: 'https://www.sdb.lk' },
    'SMIB': { url: 'https://www.smib.lk' }
  });
  const [selectedBanks, setSelectedBanks] = useState(new Set());
  const [fetchedData, setFetchedData] = useState({});
  const [loading, setLoading] = useState({});
  const [apiStatus, setApiStatus] = useState('connected');
  const [messages, setMessages] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Check API status and load banks on component mount
  useEffect(() => {
    checkApiStatus();
    loadBanks();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/banks`);
      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('disconnected');
      }
    } catch (error) {
      console.error('API connection failed:', error);
      setApiStatus('disconnected');
    }
  };

  const loadBanks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/banks`);
      if (response.ok) {
        const data = await response.json();
        if (data.configurations) {
          setBanks(data.configurations);
        }
      }
    } catch (error) {
      console.error('Failed to load banks:', error);
    }
  };

  const showMessage = (text, type = 'info') => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 5000);
  };

  const toggleBankSelection = (bankName) => {
    setSelectedBanks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bankName)) {
        newSet.delete(bankName);
      } else {
        newSet.add(bankName);
      }
      return newSet;
    });
  };

  const fetchSelectedBanks = async () => {
    if (selectedBanks.size === 0) {
      showMessage('Please select at least one bank', 'error');
      return;
    }

    const banksArray = Array.from(selectedBanks);
    setProgress({ current: 0, total: banksArray.length });

    try {
      // Fetch banks one by one to show progress
      for (let i = 0; i < banksArray.length; i++) {
        const bankName = banksArray[i];
        setLoading(prev => ({ ...prev, [bankName]: 'loading' }));

        try {
          const response = await fetch(`${API_BASE_URL}/fetch/${bankName}`);
          const result = await response.json();

          if (result.status === 'success') {
            setLoading(prev => ({ ...prev, [bankName]: 'success' }));
            setFetchedData(prev => ({ 
              ...prev, 
              [bankName]: result.data
            }));
            showMessage(`Successfully fetched ${bankName} rates (${result.data.length} records)`, 'success');
          } else {
            setLoading(prev => ({ ...prev, [bankName]: 'error' }));
            showMessage(`Failed to fetch ${bankName}: ${result.message}`, 'error');
          }
        } catch (error) {
          setLoading(prev => ({ ...prev, [bankName]: 'error' }));
          showMessage(`Error fetching ${bankName}: ${error.message}`, 'error');
        }

        setProgress({ current: i + 1, total: banksArray.length });
        
        // Small delay between requests to avoid overwhelming the server
        if (i < banksArray.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      showMessage('An unexpected error occurred', 'error');
      console.error('Fetch error:', error);
    }

    setTimeout(() => setProgress({ current: 0, total: 0 }), 1000);
  };

  const exportToExcel = async () => {
    if (Object.keys(fetchedData).length === 0) {
      showMessage('No data to export. Please fetch some bank rates first.', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/export`);
      
      if (response.ok) {
        // Get the blob and create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extract filename from response header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'Bank_FD_Rates.xlsx';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        showMessage('Excel file downloaded successfully!', 'success');
      } else {
        const errorData = await response.json();
        showMessage(`Export failed: ${errorData.message}`, 'error');
      }
    } catch (error) {
      showMessage(`Export error: ${error.message}`, 'error');
      console.error('Export error:', error);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear all fetched data?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/clear`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setFetchedData({});
        setLoading({});
        showMessage('All data cleared successfully', 'success');
      } else {
        const errorData = await response.json();
        showMessage(`Clear failed: ${errorData.message}`, 'error');
      }
    } catch (error) {
      // If API call fails, still clear local data
      setFetchedData({});
      setLoading({});
      showMessage('Data cleared locally (API may be unavailable)', 'success');
      console.error('Clear error:', error);
    }
  };

  const getStatusIcon = (status) => {
    const iconStyle = { width: '20px', height: '20px' };
    switch (status) {
      case 'loading':
        return <Loader2 className="fd-rates-spinner" style={{...iconStyle, color: '#3b82f6'}} />;
      case 'success':
        return <CheckCircle style={{...iconStyle, color: '#059669'}} />;
      case 'error':
        return <AlertCircle style={{...iconStyle, color: '#dc2626'}} />;
      default:
        return null;
    }
  };

  const getStatusText = (bankName) => {
    const status = loading[bankName];
    if (status === 'loading') return 'Fetching...';
    if (status === 'success') {
      const data = fetchedData[bankName];
      return data ? `Fetched ${data.length} records` : 'Ready to fetch';
    }
    if (status === 'error') return 'Failed to fetch';
    return 'Ready to fetch';
  };

  const getStatusClass = (status) => {
    if (status === 'success') return 'fd-rates-status-text success';
    if (status === 'error') return 'fd-rates-status-text error';
    return 'fd-rates-status-text default';
  };

  return (
    <div className="fd-rates-container">
      {/* Header */}
      <div className="fd-rates-header">
        <div className="fd-rates-header-content">
          <div className="fd-rates-logo">
            <div className="fd-rates-logo-icon">
              <img 
                src={Logo}
                alt="FinanceFlow Solutions Logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />              
            </div>
          </div>
          
          <div className="fd-rates-contact-info">
            <div className="fd-rates-contact-item">
              <Phone style={{width: '16px', height: '16px'}} />
              <span>+94 112 687 158</span>
            </div>
            <div className="fd-rates-contact-item">
              <Mail style={{width: '16px', height: '16px'}} />
              <span>info@amf.lk</span>
            </div>
            <div className="fd-rates-contact-item">
              <MapPin style={{width: '16px', height: '16px'}} />
              <span>No 89, Hyde Park Corner, Colombo 02</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fd-rates-main-content">
        <div className="fd-rates-card">
          {/* Hero Section */}
          <div className="fd-rates-hero-section">
            <div className="fd-rates-hero-icon">
              <TrendingUp style={{width: '48px', height: '48px', color: 'white'}} />
            </div>
            <h2 className="fd-rates-hero-title">Sri Lankan Bank FD Rates Monitor</h2>
            <p className="fd-rates-hero-subtitle">
              Real-time fixed deposit rate comparison across major Sri Lankan banks. 
              Make informed investment decisions with up-to-date market data.
            </p>
            
            <div className="fd-rates-stats-grid">
              <div className="fd-rates-stat-card">
                <div className="fd-rates-stat-number">{Object.keys(banks).length}</div>
                <div className="fd-rates-stat-label">Banks Monitored</div>
              </div>
              <div className="fd-rates-stat-card">
                <div className="fd-rates-stat-number">{Object.keys(fetchedData).length}</div>
                <div className="fd-rates-stat-label">Active Rates</div>
              </div>
              <div className="fd-rates-stat-card">
                <div className="fd-rates-stat-number">
                  <Calendar style={{width: '20px', height: '20px', marginRight: '4px'}} />
                  Today
                </div>
                <div className="fd-rates-stat-label">Last Updated</div>
              </div>
            </div>
          </div>

          <div className="fd-rates-content-area">
            {/* Bank Selection Grid */}
            <div className="fd-rates-bank-grid">
              {Object.entries(banks).map(([bankName, config]) => {
                const domain = config.url ? new URL(config.url).hostname : '';
                const isSelected = selectedBanks.has(bankName);
                const status = loading[bankName];

                return (
                  <div
                    key={bankName}
                    onClick={() => toggleBankSelection(bankName)}
                    className={`fd-rates-bank-card ${isSelected ? 'selected' : ''} ${status === 'loading' ? 'loading' : ''}`}
                  >
                    {isSelected && (
                      <div className="fd-rates-selected-badge">
                        <CheckCircle style={{width: '16px', height: '16px', color: 'white'}} />
                      </div>
                    )}
                    
                    <div className="fd-rates-bank-card-header">
                      <div className="fd-rates-bank-info">                        
                        <h3 className="fd-rates-bank-name">{bankName}</h3>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                    
                    <p className="fd-rates-bank-url">{domain}</p>
                    <p className={getStatusClass(status)}>
                      {getStatusText(bankName)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            {progress.total > 0 && (
              <div className="fd-rates-progress-container">
                <div className="fd-rates-progress-header">
                  <span>Processing Banks...</span>
                  <span>{progress.current} of {progress.total}</span>
                </div>
                <div className="fd-rates-progress-bar">
                  <div 
                    className="fd-rates-progress-fill"
                    style={{width: `${(progress.current / progress.total) * 100}%`}}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="fd-rates-action-buttons">
              <button
                onClick={fetchSelectedBanks}
                disabled={selectedBanks.size === 0}
                className="fd-rates-button primary"
              >
                <RefreshCw style={{width: '20px', height: '20px'}} />
                <span>
                  Fetch {selectedBanks.size > 0 ? `${selectedBanks.size} Bank${selectedBanks.size > 1 ? 's' : ''}` : 'Selected Banks'}
                </span>
              </button>
              <button
                onClick={exportToExcel}
                disabled={Object.keys(fetchedData).length === 0}
                className="fd-rates-button success"
              >
                <Download style={{width: '20px', height: '20px'}} />
                <span>Export to Excel</span>
              </button>

              <button
                onClick={clearAllData}
                className="fd-rates-button danger"
              >
                <Trash2 style={{width: '20px', height: '20px'}} />
                <span>Clear All Data</span>
              </button>
            </div>

            {/* Messages */}
            <div className="fd-rates-messages">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`fd-rates-message ${msg.type}`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Results Tables */}
            {Object.keys(fetchedData).length > 0 && (
              <div className="fd-rates-results-section">
                <h3 className="fd-rates-results-title">
                  Latest Fixed Deposit Rates
                </h3>
                
                {Object.entries(fetchedData).map(([bankName, data]) => (
                  <div key={bankName} className="fd-rates-table-container">
                    <div className="fd-rates-table-header">
                      <h4 className="fd-rates-table-title">
                        <Building2 style={{width: '20px', height: '20px'}} />
                        {bankName} Fixed Deposit Rates
                      </h4>
                    </div>
                    
                    <div style={{overflowX: 'auto'}}>
                      <table className="fd-rates-table">
                        <thead>
                          <tr>
                            {data.length > 0 && Object.keys(data[0]).map(header => (
                              <th key={header}>
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((row, idx) => (
                            <tr key={idx}>
                              {Object.values(row).map((value, cellIdx) => (
                                <td key={cellIdx}>
                                  {value || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fd-rates-footer">
        <div className="fd-rates-footer-content">
          <div className="fd-rates-footer-logo">
            <div className="fd-rates-footer-logo-icon">
              <img 
                src={Logo}
                alt="FinanceFlow Solutions Logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />              
            </div>
            <div>
              <p className="fd-rates-footer-copyright">© 2025 All rights reserved</p>
            </div>
          </div>
          <div className="fd-rates-footer-info">
            <p>Empowering financial decisions with real-time data</p>
            <p>Licensed Financial Data Provider - Central Bank of Sri Lanka</p>
          </div>
        </div>
      </footer>
    </div>
  );
}