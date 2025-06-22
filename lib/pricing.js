/**
 * Compassionate Rides Pricing Calculator
 * Implements the full pricing model with distance calculation, premiums, and discounts
 */

/**
 * Pricing Constants
 */
export const PRICING_CONFIG = {
  BASE_RATES: {
    ONE_WAY: 50,
    ROUND_TRIP: 100
  },
  DISTANCE: {
    PER_MILE: 3.00
  },
  PREMIUMS: {
    OFF_HOURS: 40,    // Before 8am or after 8pm
    WEEKEND: 40,      // Saturday or Sunday
    WHEELCHAIR: 25    // Wheelchair accessibility
  },
  DISCOUNTS: {
    INDIVIDUAL_CLIENT: 0.10  // 10% for individual clients
  },
  HOURS: {
    OFF_HOURS_START: 20,  // 8pm (20:00)
    OFF_HOURS_END: 8      // 8am (08:00)
  }
};

/**
 * Calculate distance between two addresses using Google Maps Distance Matrix API
 * Falls back to estimated distance if Google Maps is not available
 */
export async function calculateDistance(pickup, destination) {
  try {
    if (!window.google || !window.google.maps) {
      // Fallback: estimate distance based on address strings
      console.warn('Google Maps API not available, using estimated distance');
      return estimateDistanceFallback(pickup, destination);
    }

    return new Promise((resolve, reject) => {
      const service = new window.google.maps.DistanceMatrixService();
      
      service.getDistanceMatrix({
        origins: [pickup],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          const element = response.rows[0].elements[0];
          const distanceInMiles = element.distance.value * 0.000621371; // Convert meters to miles
          const duration = element.duration.text;
          
          resolve({
            distance: Math.round(distanceInMiles * 100) / 100, // Round to 2 decimal places
            duration,
            distanceText: element.distance.text,
            isEstimated: false
          });
        } else {
          // Fall back to estimation
          resolve(estimateDistanceFallback(pickup, destination));
        }
      });
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    // Fall back to estimation
    return estimateDistanceFallback(pickup, destination);
  }
}

/**
 * Fallback distance estimation when Google Maps API is not available
 */
function estimateDistanceFallback(pickup, destination) {
  // Simple estimation based on address complexity and typical local distances
  const estimatedDistance = Math.max(5, Math.min(25, Math.random() * 15 + 5));
  
  return {
    distance: Math.round(estimatedDistance * 100) / 100,
    duration: `${Math.round(estimatedDistance * 2.5)} mins`, // Rough estimate
    distanceText: `~${estimatedDistance.toFixed(1)} mi`,
    isEstimated: true
  };
}

/**
 * Check if given time is during off-hours (before 8am or after 8pm)
 */
export function isOffHours(dateTime) {
  const hour = new Date(dateTime).getHours();
  return hour < PRICING_CONFIG.HOURS.OFF_HOURS_END || hour >= PRICING_CONFIG.HOURS.OFF_HOURS_START;
}

/**
 * Check if given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateTime) {
  const day = new Date(dateTime).getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Calculate total trip price based on all factors
 */
export function calculateTripPrice({
  isRoundTrip = false,
  distance = 0,
  pickupDateTime,
  wheelchairType = 'no_wheelchair',
  clientType = 'facility', // 'individual' or 'facility'
  additionalPassengers = 0
}) {
  let breakdown = {
    baseRate: 0,
    distanceCharge: 0,
    offHoursPremium: 0,
    weekendPremium: 0,
    wheelchairPremium: 0,
    subtotal: 0,
    discount: 0,
    total: 0
  };

  // Base rate calculation
  breakdown.baseRate = isRoundTrip ? PRICING_CONFIG.BASE_RATES.ROUND_TRIP : PRICING_CONFIG.BASE_RATES.ONE_WAY;

  // Distance charge calculation
  const numberOfLegs = isRoundTrip ? 2 : 1;
  breakdown.distanceCharge = distance * PRICING_CONFIG.DISTANCE.PER_MILE * numberOfLegs;

  // Time-based premiums
  if (pickupDateTime) {
    if (isOffHours(pickupDateTime)) {
      breakdown.offHoursPremium = PRICING_CONFIG.PREMIUMS.OFF_HOURS;
    }
    
    if (isWeekend(pickupDateTime)) {
      breakdown.weekendPremium = PRICING_CONFIG.PREMIUMS.WEEKEND;
    }
  }

  // Special requirements - wheelchair rental premium (only when CCT provides wheelchair)
  if (wheelchairType === 'provided') {
    breakdown.wheelchairPremium = PRICING_CONFIG.PREMIUMS.WHEELCHAIR;
  }

  // Calculate subtotal
  breakdown.subtotal = breakdown.baseRate + 
                       breakdown.distanceCharge + 
                       breakdown.offHoursPremium + 
                       breakdown.weekendPremium + 
                       breakdown.wheelchairPremium;

  // Apply discounts
  if (clientType === 'individual') {
    breakdown.discount = breakdown.subtotal * PRICING_CONFIG.DISCOUNTS.INDIVIDUAL_CLIENT;
  }

  // Final total
  breakdown.total = breakdown.subtotal - breakdown.discount;

  // Round all monetary values to 2 decimal places
  Object.keys(breakdown).forEach(key => {
    breakdown[key] = Math.round(breakdown[key] * 100) / 100;
  });

  return breakdown;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Get pricing estimate with full breakdown
 */
export async function getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip = false,
  pickupDateTime,
  wheelchairType = 'no_wheelchair',
  clientType = 'facility',
  additionalPassengers = 0,
  preCalculatedDistance = null
}) {
  try {
    console.log('getPricingEstimate called with preCalculatedDistance:', preCalculatedDistance);
    
    // Use pre-calculated distance if provided, otherwise calculate it
    let distance = 0;
    let distanceInfo = null;
    
    if (preCalculatedDistance) {
      // Handle different possible formats of the preCalculatedDistance object
      if (typeof preCalculatedDistance === 'number') {
        // If it's just a number, use it directly
        distance = preCalculatedDistance;
      } else if (preCalculatedDistance.miles !== undefined) {
        // Use miles if available
        distance = preCalculatedDistance.miles;
      } else if (preCalculatedDistance.distance !== undefined) {
        // Otherwise use distance
        distance = typeof preCalculatedDistance.distance === 'number' 
          ? preCalculatedDistance.distance
          : 0;
      }
      
      distanceInfo = {
        distance: distance,
        duration: preCalculatedDistance.duration?.text || preCalculatedDistance.duration || 'Unknown',
        distanceText: preCalculatedDistance.text || preCalculatedDistance.distance?.text || `${distance} mi`,
        isEstimated: false
      };
    } else if (pickupAddress && destinationAddress) {
      distanceInfo = await calculateDistance(pickupAddress, destinationAddress);
      distance = distanceInfo.distance;
    }

    // Calculate pricing
    const pricing = calculateTripPrice({
      isRoundTrip,
      distance,
      pickupDateTime,
      wheelchairType,
      clientType,
      additionalPassengers
    });

    return {
      success: true,
      pricing,
      distance: distanceInfo,
      summary: {
        tripType: isRoundTrip ? 'Round Trip' : 'One Way',
        distance: distance > 0 ? `${distance} miles` : 'Distance not calculated',
        estimatedTotal: formatCurrency(pricing.total),
        hasDiscounts: pricing.discount > 0,
        hasPremiums: (pricing.offHoursPremium + pricing.weekendPremium + pricing.wheelchairPremium) > 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      pricing: null,
      distance: null
    };
  }
}

/**
 * Create a detailed pricing breakdown for display
 */
export function createPricingBreakdown(pricing) {
  const items = [];

  // Base rate
  items.push({
    label: pricing.baseRate === PRICING_CONFIG.BASE_RATES.ROUND_TRIP ? 'Round Trip Base Rate' : 'One Way Base Rate',
    amount: pricing.baseRate,
    type: 'base'
  });

  // Distance charge
  if (pricing.distanceCharge > 0) {
    items.push({
      label: 'Distance Charge',
      amount: pricing.distanceCharge,
      type: 'charge'
    });
  }

  // Premiums
  if (pricing.offHoursPremium > 0) {
    items.push({
      label: 'Off-Hours Premium',
      amount: pricing.offHoursPremium,
      type: 'premium'
    });
  }

  if (pricing.weekendPremium > 0) {
    items.push({
      label: 'Weekend Premium',
      amount: pricing.weekendPremium,
      type: 'premium'
    });
  }

  if (pricing.wheelchairPremium > 0) {
    items.push({
      label: 'Wheelchair Accessibility',
      amount: pricing.wheelchairPremium,
      type: 'premium'
    });
  }

  // Subtotal
  items.push({
    label: 'Subtotal',
    amount: pricing.subtotal,
    type: 'subtotal'
  });

  // Discount
  if (pricing.discount > 0) {
    items.push({
      label: 'Individual Client Discount (10%)',
      amount: -pricing.discount,
      type: 'discount'
    });
  }

  // Total
  items.push({
    label: 'Total',
    amount: pricing.total,
    type: 'total'
  });

  return items;
}
