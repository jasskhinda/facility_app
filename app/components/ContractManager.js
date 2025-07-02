'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ContractManager({ facilityId }) {
  const [contract, setContract] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (facilityId) {
      loadExistingContract();
    }
  }, [facilityId]);

  const loadExistingContract = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if there's an existing contract for this facility
      const { data: files, error: listError } = await supabase.storage
        .from('contracts')
        .list(`facility/${facilityId}`, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) {
        throw listError;
      }

      if (files && files.length > 0) {
        const contractFile = files[0];
        
        // Get the public URL for the contract
        const { data: urlData } = supabase.storage
          .from('contracts')
          .getPublicUrl(`facility/${facilityId}/${contractFile.name}`);

        setContract({
          name: contractFile.name,
          url: urlData.publicUrl,
          uploadedAt: contractFile.created_at,
          size: contractFile.metadata?.size || 'Unknown'
        });
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      setError('Failed to load existing contract');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Create a unique filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `facility-contract-${timestamp}.pdf`;
      const filePath = `facility/${facilityId}/${fileName}`;

      // Delete existing contract if it exists
      if (contract) {
        const oldFilePath = `facility/${facilityId}/${contract.name}`;
        await supabase.storage
          .from('contracts')
          .remove([oldFilePath]);
      }

      // Upload the new contract
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(filePath);

      // Update local state
      setContract({
        name: fileName,
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
        size: file.size
      });

      setSuccess('Contract uploaded successfully!');
      
      // Clear the file input
      event.target.value = '';
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!contract || !window.confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const filePath = `facility/${facilityId}/${contract.name}`;
      
      const { error: deleteError } = await supabase.storage
        .from('contracts')
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      setContract(null);
      setSuccess('Contract deleted successfully');
      
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete contract');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (typeof bytes !== 'number') return 'Unknown size';
    
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white  rounded-lg p-6 shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white  rounded-lg p-6 shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-[#2E4F54] text-gray-900">
          Facility Contract
        </h3>
        <div className="text-sm text-[#2E4F54]/70 text-gray-900/70">
          PDF files only (max 10MB)
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {/* Existing Contract Display */}
      {contract ? (
        <div className="space-y-4">
          {/* Contract Info Card */}
          <div className="bg-[#F8F9FA]  rounded-lg p-4 border border-[#DDE5E7] dark:border-[#3F5E63]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <svg className="w-8 h-8 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-[#2E4F54] text-gray-900">
                      {contract.name}
                    </h4>
                    <p className="text-sm text-[#2E4F54]/70 text-gray-900/70">
                      {formatFileSize(contract.size)} • Uploaded {formatDate(contract.uploadedAt)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={handleDeleteContract}
                  disabled={uploading}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <iframe
              src={contract.url}
              className="w-full h-full border-0"
              title="Contract PDF Viewer"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <a
              href={contract.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white rounded-md inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in New Tab
            </a>
            
            <a
              href={contract.url}
              download={contract.name}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </a>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div className="text-center">
          <div className="border-2 border-dashed border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg p-8">
            <svg className="mx-auto h-12 w-12 text-[#2E4F54]/40 text-gray-900/40" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-4">
              <label htmlFor="contract-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-[#2E4F54] text-gray-900">
                  Upload facility contract
                </span>
                <span className="mt-1 block text-sm text-[#2E4F54]/70 text-gray-900/70">
                  PDF files only, up to 10MB
                </span>
              </label>
              <input
                id="contract-upload"
                name="contract-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
            <div className="mt-4">
              <button
                onClick={() => document.getElementById('contract-upload')?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] disabled:bg-[#7CCFD0]/50 text-white rounded-md inline-flex items-center"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose PDF File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Contract Section */}
      {contract && (
        <div className="mt-6 pt-6 border-t border-[#DDE5E7] dark:border-[#3F5E63]">
          <h4 className="text-md font-medium text-[#2E4F54] text-gray-900 mb-3">
            Replace Contract
          </h4>
          <div className="flex items-center space-x-3">
            <label htmlFor="contract-replace" className="cursor-pointer">
              <input
                id="contract-replace"
                name="contract-replace"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-md inline-flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload New Contract
              </span>
            </label>
            <span className="text-sm text-[#2E4F54]/70 text-gray-900/70">
              This will replace the current contract
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
