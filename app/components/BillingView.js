'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BillingView() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [clientSummary, setClientSummary] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [clientFilter, setClientFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    } else {
      fetchClientSummary();
    }
  }, [activeTab, statusFilter, yearFilter, clientFilter, dateRange]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (yearFilter) params.append('year', yearFilter);
      
      const response = await fetch(`/api/facility/billing?${params}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      
      const data = await response.json();
      setInvoices(data.invoices || []);
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientSummary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (clientFilter) params.append('client_id', clientFilter);
      params.append('start_date', dateRange.start);
      params.append('end_date', dateRange.end);
      
      const response = await fetch(`/api/facility/billing/client-summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch client summary');
      
      const data = await response.json();
      setClientSummary(data);
      setAllClients(data.allClients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-[#84CED3]/20 dark:bg-[#84CED3]/10 text-[#3B5B63] dark:text-[#84CED3]',
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B5B63] dark:border-[#84CED3]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#F5F7F8] dark:bg-[#1E1E1E] p-6 rounded-lg">
            <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Total Billed</h3>
            <p className="text-2xl font-bold text-[#3B5B63] dark:text-white mt-2">{formatCurrency(summary.total_amount)}</p>
          </div>
          <div className="bg-[#F5F7F8] dark:bg-[#1E1E1E] p-6 rounded-lg">
            <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Paid</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{formatCurrency(summary.paid_amount)}</p>
          </div>
          <div className="bg-[#F5F7F8] dark:bg-[#1E1E1E] p-6 rounded-lg">
            <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Outstanding</h3>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">{formatCurrency(summary.outstanding_amount)}</p>
          </div>
          <div className="bg-[#F5F7F8] dark:bg-[#1E1E1E] p-6 rounded-lg">
            <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Overdue</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{summary.overdue_count} invoices</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-[#84CED3] text-[#3B5B63] dark:text-[#84CED3]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Monthly Invoices
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clients'
                  ? 'border-[#84CED3] text-[#3B5B63] dark:text-[#84CED3]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Client Breakdown
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'invoices' ? (
            <>
              {/* Invoice Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>

                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

              </div>

              {/* Invoice List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-[#F5F7F8] dark:bg-[#121212]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                        Trip
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1E1E1E] divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-[#F5F7F8] dark:hover:bg-[#2A3A3D] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#3B5B63] dark:text-white">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {invoice.profiles?.first_name} {invoice.profiles?.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {invoice.trips ? `${invoice.trips.pickup_address.substring(0, 30)}...` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3B5B63] dark:text-white font-medium">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(invoice.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          <Link
                            href={`/dashboard/billing/${invoice.id}`}
                            className="text-[#3B5B63] dark:text-[#84CED3] hover:text-[#2E4A52] dark:hover:text-[#6CB8BD] transition-colors"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* Client Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                >
                  <option value="">All Clients</option>
                  {allClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                />

                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                />
              </div>

              {/* Summary Stats */}
              {clientSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#F5F7F8] dark:bg-[#2A3A3D] p-4 rounded">
                    <h4 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Total Revenue</h4>
                    <p className="text-xl font-bold text-[#3B5B63] dark:text-white mt-1">
                      {formatCurrency(clientSummary.summary.total_amount)}
                    </p>
                  </div>
                  <div className="bg-[#F5F7F8] dark:bg-[#2A3A3D] p-4 rounded">
                    <h4 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Total Invoices</h4>
                    <p className="text-xl font-bold text-[#3B5B63] dark:text-white mt-1">
                      {clientSummary.summary.total_invoices}
                    </p>
                  </div>
                  <div className="bg-[#F5F7F8] dark:bg-[#2A3A3D] p-4 rounded">
                    <h4 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Active Clients</h4>
                    <p className="text-xl font-bold text-[#3B5B63] dark:text-white mt-1">
                      {clientSummary.summary.total_clients}
                    </p>
                  </div>
                  <div className="bg-[#F5F7F8] dark:bg-[#2A3A3D] p-4 rounded">
                    <h4 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Avg Invoice Amount</h4>
                    <p className="text-xl font-bold text-[#3B5B63] dark:text-white mt-1">
                      {formatCurrency(clientSummary.summary.average_invoice_amount)}
                    </p>
                  </div>
                </div>
              )}

              {/* Client List */}
              {clientSummary && clientSummary.clients.length > 0 ? (
                <div className="space-y-4">
                  {clientSummary.clients.map((client) => (
                    <div key={client.client.id} className="bg-[#F5F7F8] dark:bg-[#2A3A3D] rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-[#3B5B63] dark:text-white">
                            {client.client.first_name} {client.client.last_name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {client.invoice_count} invoices
                          </p>
                        </div>
                        <p className="text-xl font-bold text-[#3B5B63] dark:text-white">
                          {formatCurrency(client.total_amount)}
                        </p>
                      </div>
                      
                      {/* Trip Details */}
                      <div className="mt-3 space-y-2">
                        <button
                          onClick={(e) => {
                            const details = e.currentTarget.nextElementSibling;
                            details.classList.toggle('hidden');
                          }}
                          className="text-sm text-[#3B5B63] dark:text-[#84CED3] hover:text-[#2E4A52] dark:hover:text-[#6CB8BD] transition-colors"
                        >
                          Show invoice details →
                        </button>
                        <div className="hidden mt-2 space-y-1">
                          {client.invoices.map((invoice) => (
                            <div key={invoice.id} className="text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                              <p className="font-medium text-[#3B5B63] dark:text-white">{formatDate(invoice.created_at)}</p>
                              <p>{invoice.trip ? `${invoice.trip.pickup_address} → ${invoice.trip.destination_address}` : 'No trip details'}</p>
                              <p>{formatCurrency(invoice.total)} • Status: {invoice.status}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No trips found for the selected period.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}