'use client';

import { useState, useRef } from 'react';

export default function StyledDateInput({ 
  value, 
  onChange, 
  className = "",
  required = false,
  minDate = null,
  ...props 
}) {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const hiddenInputRef = useRef(null);

  // Format ISO date to US display format
  const formatToUSDisplay = (isoDate) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  const handleDisplayClick = (e) => {
    e.preventDefault();
    if (hiddenInputRef.current) {
      // Try multiple methods to open the date picker
      try {
        hiddenInputRef.current.focus();
        hiddenInputRef.current.click();
        // For browsers that support it
        if (hiddenInputRef.current.showPicker) {
          hiddenInputRef.current.showPicker();
        }
      } catch (error) {
        console.log('Date picker fallback');
        hiddenInputRef.current.focus();
      }
    }
  };

  const handleDateChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      {/* Visible styled input that shows formatted date */}
      <div
        onClick={handleDisplayClick}
        className={`${className} cursor-pointer flex items-center justify-between relative`}
        style={{ zIndex: 2, minHeight: '42px' }}
      >
        <span className={`${value ? 'text-gray-900' : 'text-gray-500'} pointer-events-none`}>
          {value ? formatToUSDisplay(value) : 'Select date...'}
        </span>
        {/* Calendar icon */}
        <svg 
          className="w-5 h-5 text-gray-400 pointer-events-none flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>

      {/* Hidden native date input for calendar functionality */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={value || ''}
        onChange={handleDateChange}
        min={minDate}
        required={required}
        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: 3 }}
        {...props}
      />
    </div>
  );
}