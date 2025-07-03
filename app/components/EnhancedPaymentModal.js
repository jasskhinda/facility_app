'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/client-supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
// Icons as inline SVG components to avoid external dependencies
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

const X = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

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
  const supabase = createClientSupabase()

  useEffect(() => {
    if (defaultPaymentMethod) {
      // Set the selected saved method but don't auto-select payment method type
      // This allows users to see all payment options including check payment
      setSelectedSavedMethod(defaultPaymentMethod)
    }
  }, [defaultPaymentMethod])

  // Reset payment form state whenever modal reopens
  useEffect(() => {
    // Reset payment method selection to force showing payment options screen
    setPaymentMethod('')
    setShowCheckOptions(false)
    setCheckSubmissionType('')
    setUseNewCard(false)
    setProcessingPayment(false)
  }, [totalAmount, facilityId, invoiceNumber, selectedMonth])

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
      const checkDetails = {
        date_mailed: checkSubmissionType === 'already_mailed' ? document.getElementById('check_date_mailed')?.value : null,
        tracking_number: checkSubmissionType === 'already_mailed' ? document.getElementById('check_tracking')?.value : null
      }

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
          check_submission_type: checkSubmissionType,
          check_details: checkDetails
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Check payment submission failed')
      }

      await updateInvoiceStatus(result.payment_status)

      // Create detailed success message with office address
      const addressInfo = result.office_address.formatted
      const checkInfo = result.check_instructions
      
      let successMessage = `${result.message}\n\n`
      
      if (checkSubmissionType === 'will_mail') {
        successMessage += `📬 MAIL YOUR CHECK TO:\n${addressInfo}\n\n`
        successMessage += `💰 CHECK DETAILS:\n`
        successMessage += `• Make payable to: ${checkInfo.payable_to}\n`
        successMessage += `• Amount: ${checkInfo.amount}\n`
        successMessage += `• Write in memo line: ${checkInfo.memo}\n`
        successMessage += `• Mail within: ${checkInfo.mail_within_days} business days\n\n`
        successMessage += `📞 QUESTIONS? Call us at 614-967-9887\n\n`
        successMessage += `📋 WHAT HAPPENS NEXT:\n${result.next_steps}`
      } else {
        successMessage += `📞 QUESTIONS? Call us at 614-967-9887\n\n`
        successMessage += `📋 WHAT HAPPENS NEXT:\n${result.next_steps}`
      }

      onPaymentSuccess(successMessage)

    } catch (error) {
      console.error('Check payment error:', error)
      onPaymentError(error.message || 'Check payment submission failed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const updateInvoiceStatus = async (status) => {
    const { data: userData } = await supabase.auth.getUser()
    
    // First, check if an invoice record exists for this month
    const { data: existingInvoice, error: fetchError } = await supabase
      .from('facility_invoices')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('month', selectedMonth)
      .single()

    let invoiceId = existingInvoice?.id

    // If no invoice exists, create one
    if (!invoiceId) {
      const { data: newInvoice, error: createError } = await supabase
        .from('facility_invoices')
        .insert({
          facility_id: facilityId,
          invoice_number: invoiceNumber,
          month: selectedMonth,
          total_amount: totalAmount,
          payment_status: status
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating invoice:', createError)
        return
      }

      invoiceId = newInvoice.id
    } else {
      // Update existing invoice with audit trail
      const { error } = await supabase.rpc('update_payment_status_with_audit', {
        p_invoice_id: invoiceId,
        p_new_status: status,
        p_user_id: userData.user.id,
        p_user_role: 'facility',
        p_notes: `Payment processed via ${paymentMethod} payment method`
      })

      if (error) {
        console.error('Error updating invoice status:', error)
      }
    }

    // Update the invoice number on the existing invoice if needed
    if (existingInvoice && !existingInvoice.invoice_number) {
      await supabase
        .from('facility_invoices')
        .update({ invoice_number: invoiceNumber })
        .eq('id', invoiceId)
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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Professional Check Payment</h3>
            <p className="text-sm text-gray-600">Secure business-to-business payment processing</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* I Will Mail Check */}
        <div
          className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
            checkSubmissionType === 'will_mail' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setCheckSubmissionType('will_mail')}
        >
          <div className="flex items-center space-x-3">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <h4 className="font-medium text-gray-900">I Will Mail Check</h4>
              <p className="text-sm text-gray-600">Get mailing address and instructions</p>
            </div>
          </div>
        </div>

        {/* Check Already Mailed */}
        <div
          className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
            checkSubmissionType === 'already_mailed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setCheckSubmissionType('already_mailed')}
        >
          <div className="flex items-center space-x-3">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div>
              <h4 className="font-medium text-gray-900">Check Already Mailed</h4>
              <p className="text-sm text-gray-600">Check is in transit to our office</p>
            </div>
          </div>
        </div>

        {/* Hand Delivered */}
        <div
          className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
            checkSubmissionType === 'hand_delivered' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setCheckSubmissionType('hand_delivered')}
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Hand Delivered</h4>
              <p className="text-sm text-gray-600">Check delivered directly to our office</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details for Already Mailed */}
      {checkSubmissionType === 'already_mailed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-green-800">Check Details (Optional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">Date Mailed</label>
              <input
                type="date"
                id="check_date_mailed"
                className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">Tracking Number</label>
              <input
                type="text"
                id="check_tracking"
                placeholder="Optional tracking number"
                className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Instructions */}
      {checkSubmissionType === 'will_mail' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-800">Check Payment Instructions</h4>
              <p className="text-sm text-blue-700 mt-1">
                Please send your check to the address below. Our dispatcher will verify and deposit your payment, and you will be notified once completed. Your billing status will change to PAID.
              </p>
              <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                <p className="text-sm text-blue-800 font-medium">Payment Amount: ${totalAmount.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Mail to: 5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017
                </p>
                <p className="text-xs text-blue-600">
                  Questions? Call 614-967-9887
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Information */}
      {checkSubmissionType && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">⏱️ Processing Timeline</h4>
          <div className="space-y-2 text-sm text-gray-600">
            {checkSubmissionType === 'will_mail' && (
              <>
                <p>• Payment status: "CHECK PAYMENT - WILL MAIL"</p>
                <p>• Mail check within 5 business days</p>
                <p>• Status updates when check is received (3-7 business days)</p>
                <p>• Final verification and deposit (1-2 business days)</p>
              </>
            )}
            {checkSubmissionType === 'already_mailed' && (
              <>
                <p>• Payment status: "CHECK PAYMENT - IN TRANSIT"</p>
                <p>• Status updates when check is received</p>
                <p>• Verification and deposit (1-2 business days)</p>
              </>
            )}
            {checkSubmissionType === 'hand_delivered' && (
              <>
                <p>• Payment status: "CHECK PAYMENT - BEING VERIFIED"</p>
                <p>• Verification and deposit (1-2 business days)</p>
                <p>• Status will update to "PAID WITH CHECK - VERIFIED"</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submit Check Payment Button */}
      <button
        onClick={handleCheckPayment}
        disabled={processingPayment || !checkSubmissionType}
        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg"
      >
        {processingPayment ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing Check Payment...</span>
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            <span>
              {checkSubmissionType === 'will_mail' ? 'Submit Check Payment Request' :
               checkSubmissionType === 'already_mailed' ? 'Mark Check as Mailed' :
               checkSubmissionType === 'hand_delivered' ? 'Mark Check as Delivered' :
               'Process Check Payment'}
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

  const supabase = createClientSupabase()

  useEffect(() => {
    if (isOpen && facilityId) {
      fetchPaymentMethods()
    }
  }, [isOpen, facilityId])

  // Reset payment form state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset all payment-related state to ensure fresh start
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
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-green-700">
                  {success.split('\n').map((line, index) => (
                    <div key={index} className={index > 0 ? 'mt-1' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
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