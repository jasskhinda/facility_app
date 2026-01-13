'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/client-supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

// Icons
const CreditCard = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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

const Loader2 = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

const X = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

function PrivatePayForm({
  trip,
  facilityId,
  onPaymentSuccess,
  onPaymentError,
  savedPaymentMethods,
  onClose
}) {
  const [processingPayment, setProcessingPayment] = useState(false)
  const [selectedSavedMethod, setSelectedSavedMethod] = useState(null)
  const [useNewCard, setUseNewCard] = useState(false)

  const stripe = useStripe()
  const elements = useElements()

  const amount = parseFloat(trip.price) || 0

  useEffect(() => {
    // Auto-select default payment method
    const defaultMethod = savedPaymentMethods?.find(m => m.is_default && m.payment_method_type === 'card')
    if (defaultMethod) {
      setSelectedSavedMethod(defaultMethod)
    } else if (savedPaymentMethods?.length > 0) {
      const firstCard = savedPaymentMethods.find(m => m.payment_method_type === 'card')
      if (firstCard) {
        setSelectedSavedMethod(firstCard)
      }
    }
  }, [savedPaymentMethods])

  const handlePayment = async () => {
    if (!stripe || !elements) {
      onPaymentError('Stripe not loaded. Please refresh and try again.')
      return
    }

    if (amount <= 0) {
      onPaymentError('Invalid payment amount')
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
        throw new Error('Please select a payment method or enter a new card')
      }

      // Process the private payment
      const response = await fetch('/api/facility/trips/private-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: trip.id,
          facility_id: facilityId,
          amount: amount,
          payment_method_id: paymentMethodId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      // Handle 3D Secure if required
      if (result.requires_action) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.client_secret
        )

        if (confirmError) {
          throw new Error(confirmError.message)
        }
      }

      onPaymentSuccess('Payment successful! This trip has been marked as privately paid and will be excluded from monthly billing.')

    } catch (error) {
      console.error('Private pay error:', error)
      onPaymentError(error.message || 'Payment failed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const cardMethods = savedPaymentMethods?.filter(method => method.payment_method_type === 'card') || []

  return (
    <div className="space-y-6">
      {/* Trip Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Trip Details</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><span className="font-medium">Date:</span> {new Date(trip.pickup_time).toLocaleDateString()}</p>
          <p><span className="font-medium">From:</span> {trip.pickup_address}</p>
          <p><span className="font-medium">To:</span> {trip.destination_address}</p>
          <p className="text-lg font-bold text-gray-900 mt-2">Amount: ${amount.toFixed(2)}</p>
        </div>
      </div>

      {/* Saved Cards */}
      {cardMethods.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Saved Cards</h4>
          {cardMethods.map((method) => (
            <div
              key={method.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedSavedMethod?.id === method.id && !useNewCard
                  ? 'border-[#7CCFD0] bg-[#7CCFD0]/10'
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
                  <span className="px-2 py-1 text-xs font-medium bg-[#7CCFD0]/20 text-[#2E4F54] rounded-full">
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
          useNewCard ? 'border-[#7CCFD0] bg-[#7CCFD0]/10' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setUseNewCard(true)}
      >
        <div className="flex items-center space-x-3">
          <CreditCard className="h-5 w-5 text-[#7CCFD0]" />
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

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Private Pay</p>
            <p className="mt-1">This trip will be paid now and excluded from your monthly invoice. The payment is processed immediately.</p>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={processingPayment || (!selectedSavedMethod && !useNewCard)}
        className="w-full bg-[#7CCFD0] hover:bg-[#60BFC0] disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {processingPayment ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            <span>Pay ${amount.toFixed(2)} Now</span>
          </>
        )}
      </button>
    </div>
  )
}

export default function PrivatePayModal({
  isOpen,
  onClose,
  trip,
  facilityId,
  onPaymentSuccess
}) {
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClientSupabase()

  useEffect(() => {
    if (isOpen && facilityId) {
      fetchPaymentMethods()
    }
  }, [isOpen, facilityId])

  useEffect(() => {
    if (isOpen) {
      setError('')
      setSuccess('')
    }
  }, [isOpen])

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
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      setError('Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (message) => {
    setSuccess(message)
    onPaymentSuccess?.(trip.id)

    setTimeout(() => {
      onClose()
      setSuccess('')
    }, 3000)
  }

  const handlePaymentError = (message) => {
    setError(message)
    setTimeout(() => setError(''), 5000)
  }

  if (!isOpen || !trip) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#7CCFD0] to-[#60BFC0] text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Private Pay</h2>
              <p className="text-white/80 mt-1 text-sm">
                Pay for this trip separately
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
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
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-green-700">{success}</span>
              </div>
            </div>
          )}

          {/* Payment Form */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#7CCFD0] mx-auto" />
              <p className="text-gray-600 mt-2">Loading payment methods...</p>
            </div>
          ) : (
            <Elements stripe={stripePromise}>
              <PrivatePayForm
                trip={trip}
                facilityId={facilityId}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                savedPaymentMethods={savedPaymentMethods}
                onClose={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}
