import ResetPasswordForm from '@/app/components/ResetPasswordForm';

export default function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA] dark:bg-[#121212]">
      <div className="w-full max-w-md">
        <div className="bg-white  rounded-xl shadow-lg border border-[#DDE5E7] dark:border-[#3F5E63] p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔑</div>
            <h1 className="text-2xl font-bold text-[#2E4F54] text-gray-900">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-[#2E4F54]/70 text-gray-900/70">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}