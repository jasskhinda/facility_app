'use client';

import { useState, useEffect } from 'react';

export default function USDatePicker({ 
  value, 
  onChange, 
  className = "",
  required = false,
  minDate = null,
  ...props 
}) {
  // Format date for display based on browser locale
  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate + 'T00:00:00');
      // Check if browser supports date input
      const testInput = document.createElement('input');
      testInput.type = 'date';
      
      if (testInput.type === 'date') {
        // Browser supports date input, return ISO format
        return isoDate;
      } else {
        // Fallback to US format for older browsers
        return date.toLocaleDateString('en-US');
      }
    } catch (error) {
      return isoDate;
    }
  };

  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      min={minDate}
      className={className}
      required={required}
      style={{
        // Ensure the date picker shows properly on all browsers
        WebkitAppearance: 'none',
        MozAppearance: 'textfield'
      }}
      {...props}
    />
  );
}