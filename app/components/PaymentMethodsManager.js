'use client';

import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';
import { getStripe } from '@/lib/stripe';
import dynamic from 'next/dynamic';

// Dynamically import Stripe Elements to avoid SSR issues
const StripeCardElement = dynamic(() => import('./StripeCardElement'), {
  ssr: false,
  loading: () => <div className="p-4 text-center">Loading payment form...</div>
});

export default function PaymentMethodsManager({ user, facilityId }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);
  const [setupClientSecret, setSetupClientSecret] = useState(null);

  // Form states
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    nickname: ''
  });
  const [bankForm, setBankForm] = useState({
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    accountType: 'checking',
    nickname: ''
  });
  const [processing, setProcessing] = useState(false);

  const supabase = createClientSupabase();

  useEffect(() => {
    fetchPaymentMethods();
  }, [facilityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPaymentMethods = async () => {
    if (!facilityId) {
      console.log('No facilityId provided to fetchPaymentMethods');
      return;
    }

    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      console.log('Fetching payment methods for facility:', facilityId);
      
      // Try to fetch from database first to see if table exists
      const { data: dbMethods, error: dbError } = await supabase
        .from('facility_payment_methods')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('Database error:', dbError);
        // If table doesn't exist, just show empty state
        if (dbError.code === '42P01') {
          console.log('facility_payment_methods table does not exist yet');
          setPaymentMethods([]);
          return;
        }
        throw dbError;
      }
      
      console.log('Database methods received:', dbMethods?.length || 0);
      
      // If we have database methods, try to fetch from Stripe
      if (dbMethods && dbMethods.length > 0) {
        try {
          const response = await fetch(`/api/stripe/facility-payment-methods?facilityId=${facilityId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          console.log('Stripe API response status:', response.status);
          
          if (response.ok) {
            const { paymentMethods: stripeMethods } = await response.json();
            console.log('Stripe methods received:', stripeMethods?.length || 0);
            
            // Merge Stripe data with database metadata
            const mergedMethods = dbMethods.map(dbMethod => {
              const stripeMethod = stripeMethods?.find(sm => sm.id === dbMethod.stripe_payment_method_id);
              return {
                ...dbMethod,
                stripe_data: stripeMethod
              };
            });
            
            setPaymentMethods(mergedMethods);
          } else {
            // If Stripe API fails, just use database data
            console.warn('Stripe API failed, using database data only');
            setPaymentMethods(dbMethods);
          }
        } catch (stripeError) {
          console.error('Stripe API error:', stripeError);
          // Fallback to database data
          setPaymentMethods(dbMethods);
        }
      } else {
        // No methods in database
        setPaymentMethods([]);
      }
      
      // Find default method
      const methods = paymentMethods.length > 0 ? paymentMethods : dbMethods || [];
      const defaultPaymentMethod = methods.find(method => method.is_default);
      setDefaultMethod(defaultPaymentMethod?.id || null);

    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError('Failed to load payment methods: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCardModal = async () => {
    setProcessing(true);
    setError('');
    
    try {
      // Create Stripe setup intent for the facility
      const setupResponse = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: facilityId,
          paymentMethodType: 'card'
        })
      });

      if (!setupResponse.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = await setupResponse.json();
      setSetupClientSecret(clientSecret);
      setShowAddCardModal(true);
      
    } catch (err) {
      console.error('Error creating setup intent:', err);
      setError(err.message || 'Failed to initialize payment form');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardSuccess = async ({ paymentMethodId, cardholderName }) => {
    try {
      // Get payment method details from Stripe
      const response = await fetch(`/api/stripe/payment-methods?paymentMethodId=${paymentMethodId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get payment method details');
      }

      const { paymentMethod } = await response.json();
      
      // Save to database with real Stripe payment method ID
      const isFirstMethod = paymentMethods.length === 0;
      
      const { error: dbError } = await supabase
        .from('facility_payment_methods')
        .insert({
          facility_id: facilityId,
          stripe_payment_method_id: paymentMethod.id,
          payment_method_type: 'card',
          last_four: paymentMethod.card.last4,
          card_brand: paymentMethod.card.brand,
          expiry_month: paymentMethod.card.exp_month,
          expiry_year: paymentMethod.card.exp_year,
          cardholder_name: cardholderName,
          nickname: `${paymentMethod.card.brand.toUpperCase()} ****${paymentMethod.card.last4}`,
          is_default: isFirstMethod
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      setSuccessMessage('Credit card added successfully!');
      setShowAddCardModal(false);
      setCardForm({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        nickname: ''
      });
      setSetupClientSecret(null);
      fetchPaymentMethods();

    } catch (err) {
      console.error('Error saving card:', err);
      setError(err.message || 'Failed to save credit card');
    }
  };

  const handleCardError = (error) => {
    if (error !== 'Cancelled') {
      setError(error);
    }
    setShowAddCardModal(false);
    setSetupClientSecret(null);
    setCardForm({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      nickname: ''
    });
  };

  const handleAddBank = async () => {
    if (!bankForm.accountNumber || !bankForm.routingNumber || !bankForm.accountHolderName) {
      setError('Please fill in all required bank details');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Create setup intent for bank account verification
      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          paymentMethodType: 'us_bank_account',
          metadata: {
            nickname: bankForm.nickname || 'Bank Account',
            account_holder_name: bankForm.accountHolderName,
            account_type: bankForm.accountType
          }
        })
      });

      const { clientSecret, setupIntentId, error: apiError } = await response.json();
      if (apiError) throw new Error(apiError);

      // Get Stripe instance
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Confirm bank account setup with Stripe
      const { error: confirmError, setupIntent } = await stripe.confirmUsBankAccountSetup(clientSecret, {
        payment_method: {
          us_bank_account: {
            routing_number: bankForm.routingNumber,
            account_number: bankForm.accountNumber,
            account_holder_type: 'company',
            account_type: bankForm.accountType
          },
          billing_details: {
            name: bankForm.accountHolderName
          }
        }
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Note: For US bank accounts, the setup intent will be in 'requires_action' status
      // requiring micro-deposit verification
      
      // Get the payment method details from Stripe
      const paymentMethod = setupIntent.payment_method;
      if (typeof paymentMethod === 'string') {
        throw new Error('Payment method details not available');
      }

      // Save bank account to database
      const isFirstMethod = paymentMethods.length === 0;
      const { error: dbError } = await supabase
        .from('facility_payment_methods')
        .insert({
          facility_id: facilityId,
          stripe_payment_method_id: paymentMethod.id,
          payment_method_type: 'bank_transfer',
          bank_account_last_four: paymentMethod.us_bank_account.last4,
          bank_routing_number: paymentMethod.us_bank_account.routing_number,
          bank_account_holder_name: bankForm.accountHolderName,
          bank_account_type: bankForm.accountType,
          nickname: bankForm.nickname || 'Bank Account',
          is_default: isFirstMethod,
          verification_status: setupIntent.status === 'succeeded' ? 'verified' : 'pending'
        });

      if (dbError) throw dbError;

      setSuccessMessage('Bank account added successfully! Verification may be required before use.');
      setShowAddBankModal(false);
      setBankForm({
        accountNumber: '',
        routingNumber: '',
        accountHolderName: '',
        accountType: 'checking',
        nickname: ''
      });
      fetchPaymentMethods();

    } catch (err) {
      console.error('Error adding bank account:', err);
      setError(err.message || 'Failed to add bank account');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetDefault = async (methodId) => {
    try {
      // Remove default from all methods
      await supabase
        .from('facility_payment_methods')
        .update({ is_default: false })
        .eq('facility_id', facilityId);

      // Set new default
      const { error } = await supabase
        .from('facility_payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;

      setDefaultMethod(methodId);
      setSuccessMessage('Default payment method updated');
      fetchPaymentMethods();

    } catch (err) {
      console.error('Error setting default method:', err);
      setError('Failed to update default payment method');
    }
  };

  const handleDeleteMethod = async () => {
    if (!methodToDelete) return;

    try {
      // Delete from Stripe first if it has a Stripe payment method ID
      if (methodToDelete.stripe_payment_method_id) {
        const response = await fetch('/api/stripe/facility-payment-methods', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: methodToDelete.stripe_payment_method_id,
            facilityId: facilityId
          })
        });

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || 'Failed to remove payment method from Stripe');
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('facility_payment_methods')
        .delete()
        .eq('id', methodToDelete.id);

      if (error) throw error;

      setSuccessMessage('Payment method removed successfully');
      setShowDeleteModal(false);
      setMethodToDelete(null);
      fetchPaymentMethods();

    } catch (err) {
      console.error('Error deleting payment method:', err);
      setError('Failed to remove payment method');
    }
  };

  const formatCardNumber = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substr(0, 19);
  };

  const formatExpiryDate = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substr(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#7CCFD0] to-[#60BFC0] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Payment Methods</h2>
        <p className="text-white/90">
          Add and manage your payment methods for monthly invoice payments
        </p>
      </div>

      {/* Add Payment Methods Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Payment Method</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleOpenCardModal}
            className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#7CCFD0] hover:bg-[#7CCFD0]/10 transition-colors group"
          >
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400 group-hover:text-[#7CCFD0] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h4 className="text-sm font-medium text-gray-900 group-hover:text-[#60BFC0]">Add Payment Card</h4>
              <p className="text-xs text-gray-500 mt-1">Credit or Debit Card</p>
            </div>
          </button>

          <button
            onClick={() => setShowAddBankModal(true)}
            className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
          >
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400 group-hover:text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-900">Add Bank Account</h4>
              <p className="text-xs text-gray-500 mt-1">ACH Direct Transfer</p>
            </div>
          </button>
        </div>
      </div>

      {/* Payment Methods List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Saved Payment Methods</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7CCFD0] mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading payment methods...</p>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Payment Methods</h3>
            <p className="mt-2 text-sm text-gray-500">
              Add your first payment method to enable quick invoice payments
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paymentMethods.map((method) => (
              <div key={method.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {method.payment_method_type === 'card' ? (
                      <div className="w-12 h-8 bg-gradient-to-r from-[#7CCFD0] to-[#60BFC0] rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-12 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {method.nickname}
                      </h4>
                      {method.is_default && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#7CCFD0]/20 text-[#60BFC0]">
                          Default
                        </span>
                      )}
                      {method.verification_status === 'pending' && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending Verification
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500">
                      {method.payment_method_type === 'card' ? (
                        <>
                          {(method.stripe_data?.card?.brand || method.card_brand)?.toUpperCase()} ending in {method.stripe_data?.card?.last4 || method.last_four}
                          {(method.stripe_data?.card?.exp_month || method.expiry_month) && (method.stripe_data?.card?.exp_year || method.expiry_year) && (
                            <span className="ml-2">&bull; Expires {(method.stripe_data?.card?.exp_month || method.expiry_month).toString().padStart(2, '0')}/{(method.stripe_data?.card?.exp_year || method.expiry_year).toString().slice(-2)}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {method.bank_account_type?.charAt(0).toUpperCase() + method.bank_account_type?.slice(1)} account ending in {method.stripe_data?.us_bank_account?.last4 || method.bank_account_last_four}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {!method.is_default && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="text-sm text-[#7CCFD0] hover:text-[#60BFC0] font-medium"
                    >
                      Set as Default
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setMethodToDelete(method);
                      setShowDeleteModal(true);
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Credit Card Modal with Stripe Elements */}
      {showAddCardModal && setupClientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-[#7CCFD0] text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Add Payment Card</h2>
                <button
                  onClick={() => handleCardError('Cancelled')}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <StripeCardElement
                clientSecret={setupClientSecret}
                facilityId={facilityId}
                onSuccess={handleCardSuccess}
                onError={handleCardError}
                processing={processing}
                setProcessing={setProcessing}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-green-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Add Bank Account</h2>
                <button
                  onClick={() => setShowAddBankModal(false)}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={bankForm.nickname}
                  onChange={(e) => setBankForm({...bankForm, nickname: e.target.value})}
                  placeholder="e.g., Main Business Account"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({...bankForm, accountHolderName: e.target.value})}
                  placeholder="Name on account"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type *
                </label>
                <select
                  value={bankForm.accountType}
                  onChange={(e) => setBankForm({...bankForm, accountType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number *
                </label>
                <input
                  type="text"
                  value={bankForm.routingNumber}
                  onChange={(e) => setBankForm({...bankForm, routingNumber: e.target.value.replace(/\D/g, '').substr(0, 9)})}
                  placeholder="123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value.replace(/\D/g, '')})}
                  placeholder="Account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Bank accounts require verification via micro-deposits, which may take 1-2 business days.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddBankModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBank}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
                >
                  {processing ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && methodToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  Remove Payment Method
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to remove &quot;{methodToDelete.nickname}&quot;? This action cannot be undone.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setMethodToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMethod}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}