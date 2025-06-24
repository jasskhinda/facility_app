'use client';

import dynamic from 'next/dynamic';

const MinimalMap = dynamic(() => import('../components/MinimalMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading...</div>
});

export default function TestMinimalMap() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Minimal Map Test</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Route Map</h2>
          <MinimalMap 
            origin="1234 Main St, Columbus, OH"
            destination="5678 Oak Ave, Columbus, OH"
          />
        </div>
      </div>
    </div>
  );
}
