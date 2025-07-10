'use client';

import { useState } from 'react';
import { formatDateToUS, formatDateFromUS, isValidUSDate } from '../utils/dateUtils';

export default function USDateInput({ 
  value, 
  onChange, 
  placeholder = "MM/DD/YYYY",
  className = "",
  required = false,
  minDate = null,
  ...props 
}) {
  const [displayValue, setDisplayValue] = useState(() => {
    return value ? formatDateToUS(value) : '';
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    let inputValue = e.target.value;
    
    // Remove non-numeric characters except slashes
    inputValue = inputValue.replace(/[^\d\/]/g, '');
    
    // Auto-format: add slashes after MM and DD
    if (inputValue.length === 2 && !inputValue.includes('/')) {
      inputValue += '/';
    } else if (inputValue.length === 5 && inputValue.split('/').length === 2) {
      inputValue += '/';
    }
    
    // Limit to MM/DD/YYYY format
    if (inputValue.length > 10) {
      inputValue = inputValue.slice(0, 10);
    }
    
    setDisplayValue(inputValue);
    setError('');
    
    // Validate and convert to ISO format
    if (inputValue.length === 10) {
      if (isValidUSDate(inputValue)) {
        const isoDate = formatDateFromUS(inputValue);
        
        // Check minimum date if provided
        if (minDate && isoDate < minDate) {
          setError('Date cannot be in the past');
          return;
        }
        
        onChange(isoDate);
      } else {
        setError('Please enter a valid date');
      }
    } else if (inputValue === '') {
      onChange('');
    }
  };

  const handleBlur = () => {
    if (displayValue && !isValidUSDate(displayValue)) {
      setError('Please enter a valid date in MM/DD/YYYY format');
    }
  };

  return (
    <div>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} ${error ? 'border-red-500' : ''}`}
        required={required}
        {...props}
      />
      {error && (
        <div className="text-red-500 text-sm mt-1">{error}</div>
      )}
    </div>
  );
}