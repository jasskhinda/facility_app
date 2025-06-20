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
  const [activeTab, setActiveTab] = useState('all-bills');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  
  // Enhanced Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (activeTab === 'all-bills' || activeTab === 'invoices') {
      fetchInvoices();
    } else {
      fetchClientSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, yearFilter, monthFilter, clientFilter, dateRange, amountFilter, sortBy, sortOrder]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (yearFilter) params.append('year', yearFilter);
      if (monthFilter) params.append('month', monthFilter);
      
      // Fetch trip-based bills instead of formal invoices
      const response = await fetch(`/api/facility/trips-billing?${params}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      
      const data = await response.json();
      let filteredBills = data.bills || [];
      
      // Apply client-side filters
      if (statusFilter) {
        filteredBills = filteredBills.filter(bill => bill.status === statusFilter);
      }
      
      if (clientFilter) {
        filteredBills = filteredBills.filter(bill => bill.client_id === clientFilter);
      }
      
      if (amountFilter.min) {
        filteredBills = filteredBills.filter(bill => parseFloat(bill.total || 0) >= parseFloat(amountFilter.min));
      }
      
      if (amountFilter.max) {
        filteredBills = filteredBills.filter(bill => parseFloat(bill.total || 0) <= parseFloat(amountFilter.max));
      }
      
      // Apply sorting
      filteredBills.sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case 'amount':
            aValue = parseFloat(a.total || 0);
            bValue = parseFloat(b.total || 0);
            break;
          case 'client':
            aValue = (a.client_name || '').toLowerCase();
            bValue = (b.client_name || '').toLowerCase();
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          default: // date
            aValue = new Date(a.created_at || a.trip_date);
            bValue = new Date(b.created_at || b.trip_date);
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
        } else {
          return aValue < bValue ? 1 : (aValue > bValue ? -1 : 0);
        }
      });
      
      setInvoices(filteredBills);
      setSummary(data.summary);
      
      // Fetch all clients for filter dropdown
      const clientsResponse = await fetch('/api/facility/billing/client-summary');
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setAllClients(clientsData.allClients || []);
      }
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
      
      // Use trips-billing data instead of non-existent client-summary API
      const response = await fetch(`/api/facility/trips-billing?${params}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      
      const data = await response.json();
      
      // Transform trips-billing data into client summary format
      const clientSummaryMap = {};
      let totalAmount = 0;
      let totalInvoices = 0;
      
      (data.bills || []).forEach(bill => {
        const clientId = bill.client_id;
        const amount = parseFloat(bill.total || 0);
        
        if (!clientSummaryMap[clientId]) {
          clientSummaryMap[clientId] = {
            client: {
              id: clientId,
              first_name: bill.client_name?.split(' ')[0] || 'Unknown',
              last_name: bill.client_name?.split(' ').slice(1).join(' ') || '',
            },
            invoice_count: 0,
            total_amount: 0,
            invoices: []
          };
        }
        
        clientSummaryMap[clientId].invoice_count += 1;
        clientSummaryMap[clientId].total_amount += amount;
        clientSummaryMap[clientId].invoices.push({
          id: bill.id,
          amount: bill.amount,
          total: bill.total,
          status: bill.status,
          created_at: bill.created_at,
          trip: {
            pickup_address: bill.pickup_address,
            destination_address: bill.destination_address,
            trip_date: bill.trip_date
          }
        });
        
        totalAmount += amount;
        totalInvoices += 1;
      });
      
      // Convert to array and sort by total amount
      const clientSummaryArray = Object.values(clientSummaryMap)
        .sort((a, b) => b.total_amount - a.total_amount);
      
      const transformedData = {
        summary: {
          total_clients: clientSummaryArray.length,
          total_invoices: totalInvoices,
          total_amount: totalAmount,
          average_invoice_amount: totalInvoices > 0 ? totalAmount / totalInvoices : 0
        },
        clients: clientSummaryArray,
        allClients: clientSummaryArray.map(c => c.client)
      };
      
      setClientSummary(transformedData);
      setAllClients(transformedData.allClients || []);
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

  const formatDateTime = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return '✓';
      case 'pending':
        return '⏳';
      case 'overdue':
        return '⚠️';
      case 'cancelled':
        return '✕';
      case 'refunded':
        return '↩️';
      default:
        return '•';
    }
  };

  const calculateTripDuration = (pickupTime) => {
    if (!pickupTime) return 'N/A';
    const pickup = new Date(pickupTime);
    const now = new Date();
    const duration = Math.abs(now - pickup);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    return hours > 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h`;
  };

  const exportToCSV = () => {
    const headers = ['Invoice #', 'Trip ID', 'Client', 'Pickup Address', 'Destination Address', 'Trip Date', 'Distance', 'Wheelchair', 'Round Trip', 'Additional Passengers', 'Amount', 'Status', 'Created Date'];
    const csvData = invoices.map(bill => [
      bill.bill_number || 'N/A',
      bill.trip_id || 'N/A',
      bill.client_name || 'Unknown',
      bill.pickup_address || 'N/A',
      bill.destination_address || 'N/A',
      bill.trip_date ? formatDate(bill.trip_date) : 'N/A',
      bill.distance ? `${bill.distance} miles` : 'N/A',
      bill.wheelchair_accessible ? 'Yes' : 'No',
      bill.is_round_trip ? 'Yes' : 'No',
      bill.additional_passengers || 0,
      formatCurrency(bill.total || 0),
      bill.status || 'Unknown',
      formatDate(bill.created_at)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facility-billing-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      {/* Enhanced Header with summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Total Trip Revenue</h3>
                <p className="text-2xl font-bold text-[#3B5B63] dark:text-white mt-2">
                  {formatCurrency(summary.total_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {summary.total_bills} total trips
                </p>
              </div>
              <div className="text-4xl opacity-30">🚌</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Completed Trips</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatCurrency(summary.paid_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {summary.completed_trips} trips completed
                </p>
              </div>
              <div className="text-4xl opacity-30">✅</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Pending Trips</h3>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {formatCurrency(summary.outstanding_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {summary.pending_trips} trips pending
                </p>
              </div>
              <div className="text-4xl opacity-30">⏳</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#3B5B63] dark:text-[#84CED3]">Cancelled</h3>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {summary.cancelled_trips}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Cancelled trips
                </p>
              </div>
              <div className="text-4xl opacity-30">❌</div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tabs */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all-bills')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all-bills'
                  ? 'border-[#84CED3] text-[#3B5B63] dark:text-[#84CED3]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              📋 All Bills
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-[#84CED3] text-[#3B5B63] dark:text-[#84CED3]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              📄 Monthly Invoices
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clients'
                  ? 'border-[#84CED3] text-[#3B5B63] dark:text-[#84CED3]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              👥 Client Breakdown
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'all-bills' ? (
            <>
              {/* Enhanced Filters and Controls */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap gap-4">
                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="paid">✅ Paid</option>
                      <option value="overdue">⚠️ Overdue</option>
                      <option value="cancelled">✕ Cancelled</option>
                      <option value="refunded">↩️ Refunded</option>
                    </select>

                    {/* Client Filter */}
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

                    {/* Year Filter */}
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>

                    {/* Month Filter */}
                    <select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                    >
                      <option value="">All Months</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = new Date(0, i).toLocaleString('en', { month: 'long' });
                        return (
                          <option key={i + 1} value={i + 1}>{month}</option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Sort and Export Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3] text-sm"
                      >
                        <option value="date">Date</option>
                        <option value="amount">Amount</option>
                        <option value="client">Client</option>
                        <option value="status">Status</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] transition-colors"
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>

                    <button
                      onClick={exportToCSV}
                      className="bg-[#7CCFD0] text-white px-4 py-2 rounded-md hover:bg-[#60BFC0] transition-colors text-sm font-medium"
                    >
                      📊 Export CSV
                    </button>
                  </div>
                </div>

                {/* Amount Range Filter */}
                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Amount Range:</label>
                  <input
                    type="number"
                    placeholder="Min ($)"
                    value={amountFilter.min}
                    onChange={(e) => setAmountFilter({ ...amountFilter, min: e.target.value })}
                    className="w-24 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3] text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max ($)"
                    value={amountFilter.max}
                    onChange={(e) => setAmountFilter({ ...amountFilter, max: e.target.value })}
                    className="w-24 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3] text-sm"
                  />
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setClientFilter('');
                      setYearFilter(new Date().getFullYear());
                      setMonthFilter('');
                      setAmountFilter({ min: '', max: '' });
                    }}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>

              {/* Enhanced Bills List */}
              <div className="space-y-4">
                {invoices.length > 0 ? (
                  <>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Showing {invoices.length} bills • Total: {formatCurrency(invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0))}
                    </div>
                    
                    {invoices.map((bill) => (
                      <div key={bill.id} className="bg-[#F8F9FA] dark:bg-[#2A3A3D] rounded-lg border border-[#DDE5E7] dark:border-[#3F5E63] overflow-hidden">
                        {/* Bill Header */}
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {/* Status Badge */}
                              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bill.status)}`}>
                                <span>{getStatusIcon(bill.status)}</span>
                                <span>{bill.status.toUpperCase()}</span>
                              </div>
                              
                              {/* Bill Info */}
                              <div>
                                <h3 className="text-lg font-semibold text-[#3B5B63] dark:text-white">
                                  Trip #{bill.bill_number}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {bill.client_name}
                                </p>
                              </div>
                            </div>
                            
                            {/* Amount and Actions */}
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-[#3B5B63] dark:text-white">
                                  {formatCurrency(bill.total)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {bill.trip_date ? formatDate(bill.trip_date) : 'No date'}
                                </p>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setExpandedInvoice(expandedInvoice === bill.id ? null : bill.id)}
                                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#3B5B63] dark:hover:text-[#84CED3] transition-colors"
                                >
                                  {expandedInvoice === bill.id ? '▼' : '▶'}
                                </button>
                                
                                <Link
                                  href={`/dashboard/trips/${bill.trip_id}`}
                                  className="bg-[#7CCFD0] text-white px-3 py-1 rounded text-sm hover:bg-[#60BFC0] transition-colors"
                                >
                                  View Trip
                                </Link>
                              </div>
                            </div>
                          </div>
                          
                          {/* Quick Info Row */}
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Date:</span>
                              <span className="ml-2 text-[#3B5B63] dark:text-white">{formatDate(bill.created_at)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Route:</span>
                              <span className="ml-2 text-[#3B5B63] dark:text-white">
                                {bill.pickup_address ? 
                                  `${bill.pickup_address.substring(0, 25)}...` : 
                                  'No pickup address'
                                }
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Trip Type:</span>
                              <span className="ml-2 text-[#3B5B63] dark:text-white">
                                {bill.is_round_trip ? 'Round Trip' : 'One Way'}
                                {bill.wheelchair_accessible && ' • Wheelchair'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {expandedInvoice === bill.id && (
                          <div className="border-t border-[#DDE5E7] dark:border-[#3F5E63] bg-white dark:bg-[#1E1E1E] p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Trip Details */}
                              <div>
                                <h4 className="font-semibold text-[#3B5B63] dark:text-[#84CED3] mb-3">Trip Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Pickup:</span>
                                    <p className="text-[#3B5B63] dark:text-white">{bill.pickup_address}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Destination:</span>
                                    <p className="text-[#3B5B63] dark:text-white">{bill.destination_address}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Scheduled Time:</span>
                                    <p className="text-[#3B5B63] dark:text-white">{formatDateTime(bill.pickup_time)}</p>
                                  </div>
                                  {bill.distance && (
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Distance:</span>
                                      <p className="text-[#3B5B63] dark:text-white">{bill.distance} miles</p>
                                    </div>
                                  )}
                                  {bill.additional_passengers > 0 && (
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Additional Passengers:</span>
                                      <p className="text-[#3B5B63] dark:text-white">{bill.additional_passengers}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Cost Breakdown */}
                              <div>
                                <h4 className="font-semibold text-[#3B5B63] dark:text-[#84CED3] mb-3">Trip Cost Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Trip Type:</span>
                                    <span className="text-[#3B5B63] dark:text-white">
                                      {bill.is_round_trip ? 'Round Trip' : 'One Way'}
                                    </span>
                                  </div>
                                  {bill.wheelchair_accessible && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">Wheelchair Accessible:</span>
                                      <span className="text-[#3B5B63] dark:text-white">Yes</span>
                                    </div>
                                  )}
                                  {bill.additional_passengers > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">Extra Passengers:</span>
                                      <span className="text-[#3B5B63] dark:text-white">{bill.additional_passengers}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-600 pt-2">
                                    <span className="text-[#3B5B63] dark:text-white">Total Cost:</span>
                                    <span className="text-[#3B5B63] dark:text-white">{formatCurrency(bill.total)}</span>
                                  </div>
                                  <div className="flex justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-500 dark:text-gray-400">Payment Status:</span>
                                    <span className={`font-medium ${
                                      bill.status === 'paid' ? 'text-green-600 dark:text-green-400' :
                                      bill.status === 'cancelled' ? 'text-red-600 dark:text-red-400' :
                                      'text-orange-600 dark:text-orange-400'
                                    }`}>
                                      {bill.status === 'paid' ? 'Completed & Paid' : 
                                       bill.status === 'cancelled' ? 'Cancelled' : 'Pending Completion'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl opacity-30 mb-4">📄</div>
                    <h3 className="text-lg font-medium text-[#3B5B63] dark:text-white mb-2">No bills found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters to see more results.</p>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'invoices' ? (
            <>
              {/* Invoice Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] text-[#3B5B63] dark:text-white shadow-sm focus:border-[#84CED3] focus:ring-[#84CED3]"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="paid">✅ Paid</option>
                  <option value="overdue">⚠️ Overdue</option>
                  <option value="cancelled">✕ Cancelled</option>
                  <option value="refunded">↩️ Refunded</option>
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

              {/* Invoice Table */}
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-[#F5F7F8] dark:bg-[#121212]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                          Trip #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                          Trip Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                          Trip Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3B5B63] dark:text-[#84CED3] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-[#1E1E1E] divide-y divide-gray-200 dark:divide-gray-700">
                      {invoices.map((bill) => (
                        <tr key={bill.id} className="hover:bg-[#F5F7F8] dark:hover:bg-[#2A3A3D] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#3B5B63] dark:text-white">
                            {bill.bill_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {bill.client_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {bill.pickup_address ? `${bill.pickup_address.substring(0, 30)}...` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3B5B63] dark:text-white font-medium">
                            {formatCurrency(bill.total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(bill.trip_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            <Link
                              href={`/dashboard/trips/${bill.trip_id}`}
                              className="text-[#3B5B63] dark:text-[#84CED3] hover:text-[#2E4A52] dark:hover:text-[#6CB8BD] transition-colors"
                            >
                              View Trip
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl opacity-30 mb-4">📄</div>
                  <h3 className="text-lg font-medium text-[#3B5B63] dark:text-white mb-2">No trips found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters to see more trips for the selected period.</p>
                </div>
              )}
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