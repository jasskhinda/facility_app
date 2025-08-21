'use client';

import React from 'react';
import { createPricingBreakdown, formatCurrency } from '@/lib/pricing';

/**
 * Component to display saved pricing breakdown from booking
 * This shows the locked pricing data that was saved during trip creation
 */
export default function SavedPricingBreakdown({ trip, onPricingCalculated }) {
  // Pass the saved pricing data for download functionality
  React.useEffect(() => {
    if (onPricingCalculated && trip.pricing_breakdown_data) {
      onPricingCalculated(trip.pricing_breakdown_data);
    } else if (onPricingCalculated && trip.price) {
      // Fallback for trips without saved breakdown
      const simplePricing = {
        pricing: {
          total: trip.price
        }
      };
      onPricingCalculated(simplePricing);
    }
  }, [trip.pricing_breakdown_data, trip.price, onPricingCalculated]);

  // Check if we have saved pricing breakdown data
  const hasSavedBreakdown = trip.pricing_breakdown_data && trip.pricing_breakdown_data.pricing;
  
  if (hasSavedBreakdown) {
    const savedData = trip.pricing_breakdown_data;
    const pricing = savedData.pricing;
    
    // Create breakdown items using the saved pricing data
    const breakdownItems = createPricingBreakdown(pricing, savedData.countyInfo);
    
    return (
      <div className="space-y-4">
        {/* Pricing Locked Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-700">
              Pricing Locked from Booking
            </span>
          </div>
          {trip.pricing_breakdown_locked_at && (
            <span className="text-xs text-gray-500">
              {new Date(trip.pricing_breakdown_locked_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Total Amount Display */}
        <div className="flex justify-between items-center py-3 border-t-2 border-[#7CCFD0] pt-3 bg-[#F8F9FA] rounded-lg px-4">
          <span className="text-lg font-semibold text-[#2E4F54]">
            Total Amount
          </span>
          <span className="text-lg font-bold text-[#7CCFD0]">
            {formatCurrency(pricing.total)}
          </span>
        </div>

        {/* Detailed Breakdown */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-[#7CCFD0] hover:text-[#60BFC0] flex items-center">
            <span>View detailed breakdown</span>
            <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          
          <div className="mt-3 space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
            {breakdownItems.map((item, index) => (
              <div 
                key={index}
                className={`flex justify-between items-center text-sm ${
                  item.type === 'total' ? 'font-semibold text-[#2E4F54] border-t pt-2 mt-2' :
                  item.type === 'discount' ? 'text-green-600' :
                  item.type === 'premium' ? 'text-orange-600' :
                  'text-gray-700'
                }`}
              >
                <span>{item.label}</span>
                <span>
                  {item.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(item.amount))}
                </span>
              </div>
            ))}
          </div>
        </details>

        {/* Booking Source Info */}
        {savedData.source && (
          <div className="text-xs text-gray-500 mt-2">
            <span>Booked via: {savedData.source}</span>
            {savedData.createdAt && (
              <span className="ml-2">
                • {new Date(savedData.createdAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Special Pricing Notes */}
        {(pricing.isBariatric || pricing.hasHolidaySurcharge || pricing.hasDeadMileage) && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Pricing Notes:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {pricing.isBariatric && (
                <li>• Bariatric rate applied ($150/leg)</li>
              )}
              {pricing.hasHolidaySurcharge && (
                <li>• Holiday surcharge applied (+$100)</li>
              )}
              {pricing.hasDeadMileage && (
                <li>• Dead mileage charge included</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Fallback for trips without saved breakdown (older trips)
  return (
    <div className="space-y-4">
      {/* Total Amount Display */}
      <div className="flex justify-between items-center py-3 border-t-2 border-[#7CCFD0] pt-3 bg-[#F8F9FA] rounded-lg px-4">
        <span className="text-lg font-semibold text-[#2E4F54]">
          Total Amount
        </span>
        <span className="text-lg font-bold text-[#7CCFD0]">
          ${trip.price?.toFixed(2) || '0.00'}
        </span>
      </div>
      
      {/* Information Message */}
      <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium">Legacy Trip</p>
            <p className="text-sm mt-1">
              This trip was booked before pricing breakdown locking was implemented. Only the total amount is available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
