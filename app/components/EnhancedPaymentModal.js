'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CreditCard, Building2, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function PaymentForm({ 
  totalAmount, 
  facilityId, 
  invoiceNumber, 
  selectedMonth, 
  onPaymentSuccess, 
  onPaymentError,
  savedPaymentMethods,
  defaultPaymentMethod,
  onClose 
}) {
  const [paymentMethod, setPaymentMethod] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showCheckOptions, setShowCheckOptions] = useState(false)
  const [checkSubmissionType, setCheckSubmissionType] = useState('')
  const [selectedSavedMethod, setSelectedSavedMethod] = useState(null)
  const [useNewCard, setUseNewCard] = useState(false)

  const stripe = useStripe()
  const elements = useElements()
  const supabase = createClient()

  useEffect(() => {
    if (defaultPaymentMethod) {
      setPaymentMethod(defaultPaymentMethod.payment_method_type)
      setSelectedSavedMethod(defaultPaymentMethod)
    }
  }, [defaultPaymentMethod])

  const handleCreditCardPayment = async () => {
    if (!stripe || !elements) {
      onPaymentError('Stripe not loaded. Please refresh and try again.')
      return
    }

    setProcessingPayment(true)

    try {
      let paymentMethodId = null

      if (useNewCard) {
        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          throw new Error('Card element not found')
        }

        const { error, paymentMethod: stripePaymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        })

        if (error) {
          throw new Error(error.message)
        }

        paymentMethodId = stripePaymentMethod.id
      } else if (selectedSavedMethod?.stripe_payment_method_id) {
        paymentMethodId = selectedSavedMethod.stripe_payment_method_id
      } else {
        throw new Error('No payment method selected')
      }

      const response = await fetch('/api/facility/payment/process-card-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facility_id: facilityId,
          invoice_number: invoiceNumber,
          month: selectedMonth,
          amount: totalAmount,
          payment_method_id: paymentMethodId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      if (result.requires_action) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.payment_intent.client_secret
        )

        if (confirmError) {
          throw new Error(confirmError.message)
        }
      }

      await updateInvoiceStatus('PAID WITH CARD')
      onPaymentSuccess('Credit card payment completed successfully!')

    } catch (error) {
      console.error('Credit card payment error:', error)
      onPaymentError(error.message || 'Credit card payment failed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleBankTransferPayment = async () => {
    if (!selectedSavedMethod || selectedSavedMethod.payment_method_type !== 'bank_transfer') {
      onPaymentError('Please select a valid bank account for transfer')
      return
    }

    setProcessingPayment(true)

    try {
      const response = await fetch('/api/facility/payment/process-bank-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facility_id: facilityId,
          invoice_number: invoiceNumber,
          month: selectedMonth,
          amount: totalAmount,
          payment_method_id: selectedSavedMethod.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Bank transfer failed')
      }

      await updateInvoiceStatus('PAID WITH BANK TRANSFER')
      onPaymentSuccess('Bank transfer initiated successfully!')

    } catch (error) {
      console.error('Bank transfer error:', error)
      onPaymentError(error.message || 'Bank transfer failed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleCheckPayment = async () => {
    if (!checkSubmissionType) {
      onPaymentError('Please select a check payment option')
      return
    }

    setProcessingPayment(true)

    try {
      const response = await fetch('/api/facility/payment/process-check-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facility_id: facilityId,
          invoice_number: invoiceNumber,
          month: selectedMonth,
          amount: totalAmount,
          check_submission_type: checkSubmissionType
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Check payment submission failed')
      }

      const newStatus = checkSubmissionType === 'submit_request' ? 'PROCESSING PAYMENT' : 'PAID WITH CHECK (BEING VERIFIED)'
      await updateInvoiceStatus(newStatus)

      if (checkSubmissionType === 'submit_request') {
        onPaymentSuccess('Check payment request submitted! Please send your check to the address provided. Status will update to "PAID WITH CHECK - VERIFIED" once received and verified by our dispatchers.')
      } else {
        onPaymentSuccess('Check marked as sent! It will be verified by our dispatch team and status updated accordingly.')
      }

    } catch (error) {
      console.error('Check payment error:', error)
      onPaymentError(error.message || 'Check payment submission failed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const updateInvoiceStatus = async (status) => {
    const { data: userData } = await supabase.auth.getUser()
    
    const { error } = await supabase.rpc('update_payment_status_with_audit', {
      p_invoice_id: invoiceNumber, // Assuming this is the invoice ID
      p_new_status: status,
      p_user_id: userData.user.id,
      p_user_role: 'facility',
      p_notes: `Payment processed via ${paymentMethod} payment method`
    })

    if (error) {
      console.error('Error updating invoice status:', error)
    }
  }

  const renderPaymentMethodOptions = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Choose Payment Method</h3>
      
      {/* Credit Card Option */}
      <div 
        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
          paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => {
          setPaymentMethod('card')
          setShowCheckOptions(false)
        }}
      >
        <div className="flex items-center space-x-3">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <div>
            <h4 className="font-medium text-gray-900">Credit Card</h4>
            <p className="text-sm text-gray-600">Direct payment processing</p>
          </div>
        </div>
      </div>

      {/* Bank Transfer Option */}
      <div 
        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
          paymentMethod === 'bank_transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => {
          setPaymentMethod('bank_transfer')
          setShowCheckOptions(false)
        }}
      >
        <div className="flex items-center space-x-3">
          <Building2 className="h-6 w-6 text-green-600" />
          <div>
            <h4 className="font-medium text-gray-900">Bank Transfer</h4>
            <p className="text-sm text-gray-600">Uses saved bank details</p>
          </div>
        </div>
      </div>

      {/* Check Payment Option */}
      <div 
        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
          paymentMethod === 'check' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => {
          setPaymentMethod('check')
          setShowCheckOptions(true)
        }}
      >
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-orange-600" />
          <div>
            <h4 className="font-medium text-gray-900">Pay with Check</h4>
            <p className="text-sm text-gray-600">Submit payment request or mark as sent</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCreditCardPayment = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Credit Card Payment</h3>

      {/* Saved Cards */}
      {savedPaymentMethods.filter(method => method.payment_method_type === 'card').length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Saved Cards</h4>
          {savedPaymentMethods
            .filter(method => method.payment_method_type === 'card')
            .map((method) => (
              <div
                key={method.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedSavedMethod?.id === method.id && !useNewCard
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedSavedMethod(method)
                  setUseNewCard(false)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {method.card_brand?.toUpperCase()} ****{method.last_four}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires {method.expiry_month?.toString().padStart(2, '0')}/{method.expiry_year}
                      </p>
                    </div>
                  </div>
                  {method.is_default && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Use New Card Option */}
      <div
        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
          useNewCard ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setUseNewCard(true)}
      >
        <div className="flex items-center space-x-3">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Use New Card</span>
        </div>
      </div>

      {/* New Card Form */}
      {useNewCard && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      )}

      <button
        onClick={handleCreditCardPayment}
        disabled={processingPayment || (!selectedSavedMethod && !useNewCard)}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {processingPayment ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            <span>Pay ${totalAmount.toFixed(2)} Now</span>
          </>
        )}
      </button>
    </div>
  )

  const renderBankTransferPayment = () => {
    const bankMethods = savedPaymentMethods.filter(method => method.payment_method_type === 'bank_transfer')

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Bank Transfer Payment</h3>

        {bankMethods.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Saved Bank Accounts</h4>
            {bankMethods.map((method) => (
              <div
                key={method.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedSavedMethod?.id === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedSavedMethod(method)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {method.bank_account_type?.toUpperCase()} ****{method.bank_account_last_four}
                      </p>
                      <p className="text-sm text-gray-600">
                        {method.bank_account_holder_name}
                      </p>
                    </div>
                  </div>
                  {method.is_default && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handleBankTransferPayment}
              disabled={processingPayment || !selectedSavedMethod}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing Transfer...</span>
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5" />
                  <span>Transfer ${totalAmount.toFixed(2)} Now</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No saved bank accounts found</p>
            <p className="text-sm text-gray-500 mt-1">
              Add a bank account in Payment Settings to use this option
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderCheckPayment = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Check Payment Options</h3>

      <div className="space-y-3">
        {/* Pay Now with Check */}
        <div
          className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
            checkSubmissionType === 'submit_request' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setCheckSubmissionType('submit_request')}
        >
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">PAY NOW WITH CHECK</h4>
              <p className="text-sm text-gray-600">Submit payment request</p>
            </div>
          </div>
        </div>

        {/* Check Already Sent */}
        <div
          className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
            checkSubmissionType === 'already_sent' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setCheckSubmissionType('already_sent')}
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">CHECK ALREADY SENT</h4>
              <p className="text-sm text-gray-600">Mark as sent</p>
            </div>
          </div>
        </div>
      </div>

      {checkSubmissionType === 'submit_request' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Payment Instructions</h4>
              <p className="text-sm text-yellow-700 mt-1">
                After submitting this request, please send a check for ${totalAmount.toFixed(2)} to:
              </p>
              <div className="mt-2 text-sm text-yellow-800 font-mono bg-yellow-100 p-2 rounded">
                Compassionate Care Transportation<br />
                123 Main Street<br />
                City, State 12345
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                Status will change to "PAID WITH CHECK - VERIFIED" once received and verified by our dispatchers.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleCheckPayment}
        disabled={processingPayment || !checkSubmissionType}
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {processingPayment ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Submitting Request...</span>
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            <span>
              {checkSubmissionType === 'submit_request' ? 'Submit Request' : 'Mark as Sent'}
            </span>
          </>
        )}
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {!paymentMethod && renderPaymentMethodOptions()}
      
      {paymentMethod === 'card' && renderCreditCardPayment()}
      {paymentMethod === 'bank_transfer' && renderBankTransferPayment()}
      {paymentMethod === 'check' && renderCheckPayment()}

      {paymentMethod && (
        <button
          onClick={() => {
            setPaymentMethod('')
            setShowCheckOptions(false)
            setCheckSubmissionType('')
            setUseNewCard(false)
            setSelectedSavedMethod(defaultPaymentMethod)
          }}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          ← Back to Payment Methods
        </button>
      )}
    </div>
  )
}

export default function EnhancedPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  facilityId,
  invoiceNumber,
  selectedMonth,
  onPaymentSuccess
}) {
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([])
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (isOpen && facilityId) {
      fetchPaymentMethods()
    }
  }, [isOpen, facilityId])

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('facility_payment_methods')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSavedPaymentMethods(data || [])
      setDefaultPaymentMethod(data?.find(method => method.is_default) || null)
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      setError('Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (message) => {
    setSuccess(message)
    onPaymentSuccess?.(message)
    
    setTimeout(() => {
      onClose()
      setSuccess('')
    }, 3000)
  }

  const handlePaymentError = (message) => {
    setError(message)
    setTimeout(() => setError(''), 5000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Pay Monthly Invoice</h2>
              <p className="text-green-100 mt-1">
                Invoice #{invoiceNumber} - Amount Due: ${totalAmount.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-green-200 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
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

          {/* Payment Form */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600 mt-2">Loading payment methods...</p>
            </div>
          ) : (
            <Elements stripe={stripePromise}>
              <PaymentForm
                totalAmount={totalAmount}
                facilityId={facilityId}
                invoiceNumber={invoiceNumber}
                selectedMonth={selectedMonth}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                savedPaymentMethods={savedPaymentMethods}
                defaultPaymentMethod={defaultPaymentMethod}
                onClose={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}