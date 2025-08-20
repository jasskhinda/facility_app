'use client';

import { useState, useEffect } from 'react';

// Holiday definitions as per team feedback
const HOLIDAYS = [
  { name: "New Year's Day", date: "01-01", surcharge: 100 },
  { name: "New Year's Eve", date: "12-31", surcharge: 100 },
  { name: "Easter Sunday", isVariable: true, surcharge: 100 }, // Variable date
  { name: "Memorial Day", isVariable: true, surcharge: 100 }, // Last Monday in May
  { name: "Independence Day", date: "07-04", surcharge: 100 },
  { name: "Labor Day", isVariable: true, surcharge: 100 }, // First Monday in September
  { name: "Thanksgiving Day", isVariable: true, surcharge: 100 }, // Fourth Thursday in November
  { name: "Christmas Eve", date: "12-24", surcharge: 100 },
  { name: "Christmas Day", date: "12-25", surcharge: 100 }
];

export default function HolidayPricingChecker({ 
  pickupDate, 
  onHolidayChange,
  className = '' 
}) {
  const [holidayInfo, setHolidayInfo] = useState({
    isHoliday: false,
    holidayName: '',
    surcharge: 0
  });

  // Calculate variable holidays for a given year
  const calculateVariableHolidays = (year) => {
    const holidays = {};
    
    // Easter Sunday calculation (approximate - complex algorithm)
    // For simplicity, we'll handle this manually or use a library in production
    
    // Memorial Day - Last Monday in May
    const lastMondayMay = new Date(year, 4, 31); // May 31st
    while (lastMondayMay.getDay() !== 1) { // Monday is 1
      lastMondayMay.setDate(lastMondayMay.getDate() - 1);
    }
    holidays.memorialDay = `${String(lastMondayMay.getMonth() + 1).padStart(2, '0')}-${String(lastMondayMay.getDate()).padStart(2, '0')}`;
    
    // Labor Day - First Monday in September
    const firstMondaySept = new Date(year, 8, 1); // September 1st
    while (firstMondaySept.getDay() !== 1) { // Monday is 1
      firstMondaySept.setDate(firstMondaySept.getDate() + 1);
    }
    holidays.laborDay = `${String(firstMondaySept.getMonth() + 1).padStart(2, '0')}-${String(firstMondaySept.getDate()).padStart(2, '0')}`;
    
    // Thanksgiving - Fourth Thursday in November
    const fourthThursdayNov = new Date(year, 10, 1); // November 1st
    let thursdayCount = 0;
    while (thursdayCount < 4) {
      if (fourthThursdayNov.getDay() === 4) { // Thursday is 4
        thursdayCount++;
        if (thursdayCount < 4) {
          fourthThursdayNov.setDate(fourthThursdayNov.getDate() + 7);
        }
      } else {
        fourthThursdayNov.setDate(fourthThursdayNov.getDate() + 1);
      }
    }
    holidays.thanksgiving = `${String(fourthThursdayNov.getMonth() + 1).padStart(2, '0')}-${String(fourthThursdayNov.getDate()).padStart(2, '0')}`;
    
    return holidays;
  };

  useEffect(() => {
    if (!pickupDate) {
      setHolidayInfo({ isHoliday: false, holidayName: '', surcharge: 0 });
      return;
    }

    const date = new Date(pickupDate);
    const year = date.getFullYear();
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Check fixed holidays
    const fixedHoliday = HOLIDAYS.find(holiday => !holiday.isVariable && holiday.date === monthDay);
    if (fixedHoliday) {
      const info = {
        isHoliday: true,
        holidayName: fixedHoliday.name,
        surcharge: fixedHoliday.surcharge
      };
      setHolidayInfo(info);
      if (onHolidayChange) onHolidayChange(info);
      return;
    }

    // Check variable holidays
    const variableHolidays = calculateVariableHolidays(year);
    let matchedHoliday = null;
    
    if (monthDay === variableHolidays.memorialDay) {
      matchedHoliday = { name: "Memorial Day", surcharge: 100 };
    } else if (monthDay === variableHolidays.laborDay) {
      matchedHoliday = { name: "Labor Day", surcharge: 100 };
    } else if (monthDay === variableHolidays.thanksgiving) {
      matchedHoliday = { name: "Thanksgiving Day", surcharge: 100 };
    }

    if (matchedHoliday) {
      const info = {
        isHoliday: true,
        holidayName: matchedHoliday.name,
        surcharge: matchedHoliday.surcharge
      };
      setHolidayInfo(info);
      if (onHolidayChange) onHolidayChange(info);
    } else {
      const info = { isHoliday: false, holidayName: '', surcharge: 0 };
      setHolidayInfo(info);
      if (onHolidayChange) onHolidayChange(info);
    }
  }, [pickupDate, onHolidayChange]);

  if (!holidayInfo.isHoliday) {
    return null; // Don't show anything if not a holiday
  }

  return (
    <div className={`${className}`}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">
              🎄 Holiday Pricing Notice
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              <strong>{holidayInfo.holidayName}</strong> - Additional holiday surcharge applies
            </p>
            <div className="mt-2 p-2 bg-amber-100 rounded text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium text-amber-800">Holiday Surcharge:</span>
                <span className="font-bold text-amber-800">+${holidayInfo.surcharge}</span>
              </div>
              <p className="text-amber-700 mt-1">
                Applied to total bill (one-way or round trip)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export helper function for other components to use
export const checkHolidaySurcharge = (pickupDate) => {
  if (!pickupDate) return { isHoliday: false, surcharge: 0 };
  
  const date = new Date(pickupDate);
  const year = date.getFullYear();
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  // Check fixed holidays
  const fixedHoliday = HOLIDAYS.find(holiday => !holiday.isVariable && holiday.date === monthDay);
  if (fixedHoliday) {
    return { isHoliday: true, surcharge: fixedHoliday.surcharge, name: fixedHoliday.name };
  }
  
  // For variable holidays, you would implement the same calculation logic
  // For now, return no holiday
  return { isHoliday: false, surcharge: 0 };
};
