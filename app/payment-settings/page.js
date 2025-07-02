'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/client-supabase'
import PaymentMethodsManager from '@/app/components/PaymentMethodsManager'
import DashboardLayout from '@/app/components/DashboardLayout'
// Icons as inline SVG components to avoid external dependencies
const Loader2 = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

const CreditCard = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const Building2 = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
  </svg>
)

const FileText = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CheckCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const AlertCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function PaymentSettingsPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClientSupabase()

  useEffect(() => {
    fetchUserAndProfile()
  }, [])

  useEffect(() => {
    if (profile?.facility_id) {
      fetchPaymentMethods()
    }
  }, [profile])

  const fetchUserAndProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      setUser(userData.user)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, facilities(*)')
        .eq('id', userData.user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching user/profile:', error)
      setError('Failed to load user information')
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('facility_payment_methods')
        .select('*')
        .eq('facility_id', profile.facility_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPaymentMethods(data || [])
      
      // Find default payment method
      const defaultMethod = data?.find(method => method.is_default) || null
      setDefaultPaymentMethod(defaultMethod)

    } catch (error) {
      console.error('Error fetching payment methods:', error)
      setError('Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefaultPaymentMethod = async (paymentMethodId) => {
    try {
      setError('')
      setSuccess('')

      const { error } = await supabase.rpc('set_default_payment_method', {
        p_facility_id: profile.facility_id,
        p_payment_method_id: paymentMethodId
      })

      if (error) throw error

      await fetchPaymentMethods()
      setSuccess('Default payment method updated successfully')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error setting default payment method:', error)
      setError('Failed to update default payment method')
    }
  }

  const getPaymentMethodIcon = (type) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />
      case 'bank_transfer':
        return <Building2 className="h-5 w-5" />
      case 'check':
        return <FileText className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getPaymentMethodLabel = (method) => {
    switch (method.payment_method_type) {
      case 'card':
        return method.nickname || `${method.card_brand?.toUpperCase()} ****${method.last_four}`
      case 'bank_transfer':
        return method.nickname || `${method.bank_account_type?.toUpperCase()} ****${method.bank_account_last_four}`
      case 'check':
        return method.nickname || 'Check Payment'
      default:
        return 'Unknown Payment Method'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#7CCFD0]" />
          <span className="text-gray-600">Loading payment settings...</span>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'facility') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access payment settings.</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} activeTab="settings">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your payment methods and preferences for invoice payments.
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Methods Management */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Add and manage your payment methods for invoice payments.
                </p>
              </div>
              
              <div className="p-6">
                <PaymentMethodsManager 
                  facilityId={profile.facility_id}
                  onPaymentMethodsChange={fetchPaymentMethods}
                />
              </div>
            </div>
          </div>

          {/* Default Payment Method & Summary */}
          <div className="space-y-6">
            {/* Default Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Default Payment Method</h3>
                <p className="mt-1 text-sm text-gray-600">
                  This payment method will be pre-selected during checkout.
                </p>
              </div>
              
              <div className="p-6">
                {defaultPaymentMethod ? (
                  <div className="flex items-center justify-between p-4 bg-[#7CCFD0]/10 rounded-lg border border-[#7CCFD0]/30">
                    <div className="flex items-center space-x-3">
                      <div className="text-[#60BFC0]">
                        {getPaymentMethodIcon(defaultPaymentMethod.payment_method_type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {getPaymentMethodLabel(defaultPaymentMethod)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {defaultPaymentMethod.payment_method_type === 'card' ? 'Credit Card' :
                           defaultPaymentMethod.payment_method_type === 'bank_transfer' ? 'Bank Transfer' :
                           'Check Payment'}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-[#60BFC0]" />
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No default payment method set</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Add a payment method and set it as default
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Available Payment Methods List */}
            {paymentMethods.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">All Payment Methods</h3>
                </div>
                
                <div className="p-6">
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          method.is_default
                            ? 'bg-[#7CCFD0]/10 border-[#7CCFD0]/30'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={method.is_default ? 'text-[#60BFC0]' : 'text-gray-400'}>
                            {getPaymentMethodIcon(method.payment_method_type)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {getPaymentMethodLabel(method)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Added {new Date(method.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {!method.is_default && (
                          <button
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            className="px-3 py-1 text-xs font-medium text-[#7CCFD0] hover:text-[#60BFC0] hover:bg-[#7CCFD0]/10 rounded-md transition-colors"
                          >
                            Set Default
                          </button>
                        )}
                        
                        {method.is_default && (
                          <span className="px-2 py-1 text-xs font-medium bg-[#7CCFD0]/20 text-[#60BFC0] rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Types Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Payment Options</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Credit Card</p>
                      <p className="text-sm text-gray-600">Direct payment processing with immediate status update</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Building2 className="h-5 w-5 text-[#7CCFD0] mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Bank Transfer</p>
                      <p className="text-sm text-gray-600">ACH transfer using saved bank details</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Check Payment</p>
                      <p className="text-sm text-gray-600">Submit payment request or mark check as sent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}