'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { PaymentMethodsManager } from '@/app/components/PaymentMethodsManager'
import { Loader2, CreditCard, Building2, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export default function PaymentSettingsPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

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
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-600">
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
                    <CheckCircle className="h-6 w-6 text-blue-600" />
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
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={method.is_default ? 'text-blue-600' : 'text-gray-400'}>
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
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            Set Default
                          </button>
                        )}
                        
                        {method.is_default && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
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
                    <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
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
    </div>
  )
}