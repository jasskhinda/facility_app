'use client';

import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';

export default function ContractViewer({ user, facilityId, userRole }) {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'service_agreement',
    file: null
  });
  const [uploadLoading, setUploadLoading] = useState(false);

  const supabase = createClientSupabase();

  useEffect(() => {
    fetchContracts();
  }, [facilityId]);

  async function fetchContracts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facility_contracts')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadContract() {
    try {
      setUploadLoading(true);
      
      if (!uploadForm.file) {
        alert('Please select a file to upload');
        return;
      }

      // In a real implementation, you would upload the file to storage first
      // For now, we'll create a placeholder URL
      const contractUrl = `https://example.com/contracts/${uploadForm.file.name}`;

      const { error } = await supabase
        .from('facility_contracts')
        .insert({
          facility_id: facilityId,
          contract_name: uploadForm.name,
          contract_url: contractUrl,
          contract_type: uploadForm.type,
          uploaded_by: user.id
        });

      if (error) throw error;

      alert('Contract uploaded successfully');
      setShowUploadModal(false);
      setUploadForm({ name: '', type: 'service_agreement', file: null });
      fetchContracts();
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('Failed to upload contract');
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleDeleteContract(contractId) {
    if (!confirm('Are you sure you want to delete this contract?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('facility_contracts')
        .update({ is_active: false })
        .eq('id', contractId);

      if (error) throw error;

      alert('Contract deleted successfully');
      fetchContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract');
    }
  }

  const canManageContracts = ['super_admin', 'admin'].includes(userRole);

  const getContractTypeLabel = (type) => {
    switch (type) {
      case 'service_agreement': return 'Service Agreement';
      case 'pricing_contract': return 'Pricing Contract';
      case 'terms_conditions': return 'Terms & Conditions';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7CCFD0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contracts & Documents</h2>
          <p className="text-gray-600 mt-1">View and manage facility contracts and agreements</p>
        </div>
        {canManageContracts && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Upload Contract
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Contract Access</h3>
        <p className="text-sm text-blue-800">
          All facility staff can view contracts and agreements. This ensures transparency and helps new team members 
          understand pricing, terms, and service details. Contracts are always available for reference.
        </p>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Available Contracts ({contracts.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {contracts.map((contract) => (
            <div key={contract.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">
                  {getFileIcon(contract.contract_name)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{contract.contract_name}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-600">
                      {getContractTypeLabel(contract.contract_type)}
                    </span>
                    <span className="text-sm text-gray-500">
                      Uploaded {new Date(contract.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* View Button */}
                <button
                  onClick={() => {
                    if (contract.contract_url && !contract.contract_url.includes('example.com')) {
                      window.open(contract.contract_url, '_blank');
                    } else {
                      alert('Contract file is not available. Please contact your administrator to upload the contract file.');
                    }
                  }}
                  className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  View Contract
                </button>
                
                {/* Download Button */}
                <button
                  onClick={() => {
                    if (contract.contract_url && !contract.contract_url.includes('example.com')) {
                      const link = document.createElement('a');
                      link.href = contract.contract_url;
                      link.download = contract.contract_name;
                      link.click();
                    } else {
                      alert('Contract file is not available for download. Please contact your administrator to upload the contract file.');
                    }
                  }}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Download
                </button>
                
                {/* Delete Button (Admin only) */}
                {canManageContracts && (
                  <button
                    onClick={() => handleDeleteContract(contract.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {contracts.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-lg font-medium mb-2">No contracts available</p>
              <p className="text-sm">
                {canManageContracts 
                  ? 'Upload your first contract to make it available to all facility staff.'
                  : 'Contracts will appear here once uploaded by facility administrators.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sample Contract Info */}
      {contracts.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📄 What contracts might include:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-2">Service Agreement</h4>
              <ul className="space-y-1 text-xs">
                <li>• Transportation service details</li>
                <li>• Service hours and availability</li>
                <li>• Emergency procedures</li>
                <li>• Liability and insurance coverage</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Pricing Contract</h4>
              <ul className="space-y-1 text-xs">
                <li>• Base rates and mileage fees</li>
                <li>• Wheelchair and special needs pricing</li>
                <li>• Billing cycles and payment terms</li>
                <li>• Cancellation and no-show policies</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Contract Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Contract</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Name
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  placeholder="e.g., Service Agreement 2025"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({...uploadForm, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                >
                  <option value="service_agreement">Service Agreement</option>
                  <option value="pricing_contract">Pricing Contract</option>
                  <option value="terms_conditions">Terms & Conditions</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadContract}
                disabled={uploadLoading || !uploadForm.name || !uploadForm.file}
                className="px-4 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadLoading ? 'Uploading...' : 'Upload Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}