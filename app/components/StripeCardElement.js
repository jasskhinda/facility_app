'use client';

import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Card Element options
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  },
  hidePostalCode: false
};

function CardForm({ onSuccess, onError, clientSecret, facilityId, processing, setProcessing }) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!cardholderName.trim()) {
      setError('Please enter the cardholder name');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const card = elements.getElement(CardElement);
      
      // Confirm the setup intent
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: cardholderName
          }
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Call the success callback with the payment method details
      onSuccess({
        paymentMethodId: setupIntent.payment_method,
        cardholderName
      });

    } catch (err) {
      console.error('Error confirming card setup:', err);
      setError(err.message);
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cardholder Name *
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Name on card"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Details *
        </label>
        <div className="p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-[#7CCFD0] focus-within:border-[#7CCFD0]">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter your card number, expiration date, and CVC
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => onError('Cancelled')}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
        >
          {processing ? 'Adding...' : 'Add Card'}
        </button>
      </div>
    </form>
  );
}

export default function StripeCardElement({ clientSecret, facilityId, onSuccess, onError, processing, setProcessing }) {
  return (
    <Elements stripe={stripePromise}>
      <CardForm 
        clientSecret={clientSecret}
        facilityId={facilityId}
        onSuccess={onSuccess}
        onError={onError}
        processing={processing}
        setProcessing={setProcessing}
      />
    </Elements>
  );
}