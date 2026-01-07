import { Suspense } from 'react';
import UpdatePasswordForm from '@/app/components/UpdatePasswordForm';

function UpdatePasswordFormWrapper() {
  return <UpdatePasswordForm />;
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <svg className="animate-spin h-8 w-8 text-[#7CCFD0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
}

export default function UpdatePassword() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA] dark:bg-[#121212]">
      <div className="w-full max-w-md">
        <div className="bg-white  rounded-xl shadow-lg border border-[#DDE5E7] dark:border-[#E0E0E0] p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-[#2E4F54] text-gray-900">
              Update your password
            </h1>
            <p className="mt-2 text-sm text-[#2E4F54]/70 text-gray-900/70">
              Enter a new password below to secure your account.
            </p>
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            <UpdatePasswordFormWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
}