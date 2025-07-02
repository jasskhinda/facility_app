'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InvoiceDetail({ invoiceId }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [clientBreakdown, setClientBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/facility/billing/${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice details');
      
      const data = await response.json();
      setInvoice(data.invoice);
      setClientBreakdown(data.clientBreakdown);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInvoiceStatus = async (newStatus) => {
    try {
      setUpdating(true);
      const updateData = { status: newStatus };
      
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      }
      
      const response = await fetch(`/api/facility/billing/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) throw new Error('Failed to update invoice');
      
      fetchInvoiceDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const exportToPDF = () => {
    // This would typically use a library like jsPDF or call a server endpoint
    window.print();
  };

  const exportToCSV = () => {
    if (!invoice || !invoice.invoice_items) return;
    
    const headers = ['Client Name', 'Trip Date', 'From', 'To', 'Distance', 'Price'];
    const rows = invoice.invoice_items.map(item => [
      `${item.profiles.first_name} ${item.profiles.last_name}`,
      new Date(item.trips?.pickup_time || '').toLocaleDateString(),
      item.trips?.pickup_address || '',
      item.trips?.destination_address || '',
      item.trips?.distance || '',
      item.unit_price
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoice_number}.csv`;
    a.click();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-[#84CED3]/20 dark:bg-[#84CED3]/10 text-[#7CCFD0] dark:text-[#84CED3]',
      paid: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      overdue: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
      refunded: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7CCFD0] dark:border-[#84CED3]"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        {error || 'Invoice not found'}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Link
            href="/dashboard/billing"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#7CCFD0] dark:hover:text-[#84CED3] mb-2 inline-block transition-colors"
          >
            ← Back to Billing
          </Link>
          <h1 className="text-2xl font-bold text-[#7CCFD0] dark:text-white">Invoice {invoice.invoice_number}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Client: {invoice.profiles?.first_name} {invoice.profiles?.last_name}
          </p>
          {invoice.trips && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Trip: {invoice.trips.pickup_address} → {invoice.trips.destination_address}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 text-sm bg-white dark:bg-[#FFFFFF] text-[#7CCFD0] dark:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-[#F5F7F8] dark:hover:bg-[#F8F9FA] transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 text-sm bg-white dark:bg-[#FFFFFF] text-[#7CCFD0] dark:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-[#F5F7F8] dark:hover:bg-[#F8F9FA] transition-colors"
          >
            Print/PDF
          </button>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="bg-white dark:bg-[#FFFFFF] shadow-sm rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3]">Status</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status.toUpperCase()}
              </span>
              {invoice.status === 'pending' && (
                <button
                  onClick={() => updateInvoiceStatus('paid')}
                  disabled={updating}
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                >
                  Mark as Paid
                </button>
              )}
              {invoice.status === 'paid' && (
                <button
                  onClick={() => updateInvoiceStatus('refunded')}
                  disabled={updating}
                  className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
                >
                  Mark as Refunded
                </button>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3]">Total Amount</h3>
            <p className="mt-2 text-2xl font-bold text-[#7CCFD0] dark:text-white">{formatCurrency(invoice.total)}</p>
            {invoice.tax > 0 && (
              <p className="text-xs text-gray-600 dark:text-gray-400">Amount: {formatCurrency(invoice.amount)} + Tax: {formatCurrency(invoice.tax)}</p>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3]">Due Date</h3>
            <p className="mt-2 text-lg text-[#7CCFD0] dark:text-white">{formatDate(invoice.due_date)}</p>
            {invoice.paid_date && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid on {formatDate(invoice.paid_date)}</p>
            )}
          </div>
        </div>
        
        {invoice.description && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3] mb-2">Description</h3>
            <p className="text-sm text-[#7CCFD0] dark:text-gray-300">{invoice.description}</p>
          </div>
        )}
        
        {invoice.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3] mb-2">Notes</h3>
            <p className="text-sm text-[#7CCFD0] dark:text-gray-300">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Trip Details */}
      {invoice.trips && (
        <div className="bg-white dark:bg-[#FFFFFF] shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-[#7CCFD0] dark:text-white mb-4">Trip Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3] mb-2">Pickup</h3>
              <p className="text-sm text-[#7CCFD0] dark:text-gray-300">{invoice.trips.pickup_address}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {formatDate(invoice.trips.pickup_time)}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3] mb-2">Destination</h3>
              <p className="text-sm text-[#7CCFD0] dark:text-gray-300">{invoice.trips.destination_address}</p>
            </div>
            
            {invoice.trips.distance && (
              <div>
                <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3] mb-2">Distance</h3>
                <p className="text-sm text-[#7CCFD0] dark:text-gray-300">{invoice.trips.distance} miles</p>
              </div>
            )}
            
            {invoice.trips.driver_name && (
              <div>
                <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3] mb-2">Driver</h3>
                <p className="text-sm text-[#7CCFD0] dark:text-gray-300">{invoice.trips.driver_name}</p>
              </div>
            )}
          </div>
          
          {invoice.trips.special_requirements && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-[#7CCFD0] dark:text-[#84CED3] mb-2">Special Requirements</h3>
              <p className="text-sm text-[#7CCFD0] dark:text-gray-300">{invoice.trips.special_requirements}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}