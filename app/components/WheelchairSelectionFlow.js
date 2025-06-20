// Professional Wheelchair Selection Component
'use client';

import { useState, useEffect } from 'react';

export default function WheelchairSelectionFlow({ 
  onWheelchairChange, 
  initialValue = 'none',
  className = '' 
}) {
  const [wheelchairType, setWheelchairType] = useState(initialValue);
  const [needsWheelchair, setNeedsWheelchair] = useState(false);
  const [customWheelchairType, setCustomWheelchairType] = useState('');
  const [showProvideOption, setShowProvideOption] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Wheelchair pricing
  const WHEELCHAIR_PRICE = 25;

  useEffect(() => {
    // Reset states when wheelchair type changes
    if (wheelchairType !== 'none') {
      setShowProvideOption(false);
      setNeedsWheelchair(false);
      setShowCustomInput(false);
    } else {
      setShowProvideOption(true);
    }
  }, [wheelchairType]);

  useEffect(() => {
    // Notify parent component of changes
    const wheelchairData = {
      type: wheelchairType,
      needsProvided: needsWheelchair,
      customType: customWheelchairType,
      hasWheelchairFee: wheelchairType !== 'none' || needsWheelchair,
      fee: (wheelchairType !== 'none' || needsWheelchair) ? WHEELCHAIR_PRICE : 0
    };
    
    if (onWheelchairChange) {
      onWheelchairChange(wheelchairData);
    }
  }, [wheelchairType, needsWheelchair, customWheelchairType]);

  const handleWheelchairTypeChange = (type) => {
    setWheelchairType(type);
    
    if (type === 'none') {
      setShowProvideOption(true);
      setShowCustomInput(false);
      setCustomWheelchairType('');
    } else {
      setShowProvideOption(false);
      setNeedsWheelchair(false);
      setShowCustomInput(false);
      setCustomWheelchairType('');
    }
  };

  const handleProvideWheelchairChange = (provide) => {
    setNeedsWheelchair(provide);
    
    if (provide) {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomWheelchairType('');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Question */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mb-4 flex items-center">
          ♿ Wheelchair Transportation
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-3">
            What type of wheelchair do you have?
          </label>
          
          <div className="space-y-3">
            {/* None Option */}
            <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#2A3A3D] cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="none"
                checked={wheelchairType === 'none'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  None
                </span>
                <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                  No wheelchair needed
                </p>
              </div>
            </label>

            {/* Manual Wheelchair */}
            <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#2A3A3D] cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="manual"
                checked={wheelchairType === 'manual'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  Manual wheelchair
                </span>
                <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                  Standard manual wheelchair
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs font-semibold text-[#7CCFD0]">
                    +${WHEELCHAIR_PRICE}
                  </span>
                  <span className="text-xs text-[#2E4F54]/50 dark:text-[#E0F4F5]/50 ml-1">
                    accessibility fee
                  </span>
                </div>
              </div>
            </label>

            {/* Power Wheelchair */}
            <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#2A3A3D] cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="power"
                checked={wheelchairType === 'power'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  Power wheelchair
                </span>
                <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                  Electric/motorized wheelchair
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs font-semibold text-[#7CCFD0]">
                    +${WHEELCHAIR_PRICE}
                  </span>
                  <span className="text-xs text-[#2E4F54]/50 dark:text-[#E0F4F5]/50 ml-1">
                    accessibility fee
                  </span>
                </div>
              </div>
            </label>

            {/* Transport Wheelchair */}
            <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#2A3A3D] cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="transport"
                checked={wheelchairType === 'transport'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  Transport wheelchair
                </span>
                <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                  Lightweight transport chair
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs font-semibold text-[#7CCFD0]">
                    +${WHEELCHAIR_PRICE}
                  </span>
                  <span className="text-xs text-[#2E4F54]/50 dark:text-[#E0F4F5]/50 ml-1">
                    accessibility fee
                  </span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Provide Wheelchair Option */}
        {showProvideOption && (
          <div className="mt-6 p-4 bg-[#F8F9FA] dark:bg-[#2A3A3D] rounded-lg border border-[#DDE5E7] dark:border-[#3F5E63]">
            <h4 className="text-md font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-3">
              Do you want us to provide a wheelchair?
            </h4>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="provideWheelchair"
                  checked={needsWheelchair === true}
                  onChange={() => handleProvideWheelchairChange(true)}
                  className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
                />
                <span className="ml-2 text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  Yes, please provide a wheelchair
                </span>
                <span className="ml-2 text-xs font-semibold text-[#7CCFD0]">
                  +${WHEELCHAIR_PRICE}
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="provideWheelchair"
                  checked={needsWheelchair === false}
                  onChange={() => handleProvideWheelchairChange(false)}
                  className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
                />
                <span className="ml-2 text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                  No, wheelchair not needed
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Custom Wheelchair Type Input */}
        {showCustomInput && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
              Please specify the type of wheelchair you need:
            </label>
            <input
              type="text"
              value={customWheelchairType}
              onChange={(e) => setCustomWheelchairType(e.target.value)}
              placeholder="e.g., Standard manual wheelchair, Lightweight transport chair..."
              className="w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] placeholder-[#2E4F54]/50 dark:placeholder-[#E0F4F5]/50 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0]"
            />
            <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70 mt-1">
              This helps us ensure we provide the most suitable wheelchair for your needs.
            </p>
          </div>
        )}

        {/* Pricing Summary */}
        {(wheelchairType !== 'none' || needsWheelchair) && (
          <div className="mt-4 p-3 bg-[#7CCFD0]/10 dark:bg-[#7CCFD0]/20 rounded-lg border border-[#7CCFD0]/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Wheelchair Accessibility Fee
              </span>
              <span className="text-sm font-bold text-[#7CCFD0]">
                +${WHEELCHAIR_PRICE}
              </span>
            </div>
            <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70 mt-1">
              This fee covers specialized vehicle accessibility and assistance
            </p>
          </div>
        )}

        {/* Information Notice */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Wheelchair Accessibility Information
              </h5>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                All our vehicles are equipped with wheelchair accessibility features. The same fee applies to all wheelchair types to ensure fair and transparent pricing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
