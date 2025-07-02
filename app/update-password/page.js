import UpdatePasswordForm from '@/app/components/UpdatePasswordForm';

export default function UpdatePassword() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA] dark:bg-[#121212]">
      <div className="w-full max-w-md">
        <div className="bg-white  rounded-xl shadow-lg border border-[#DDE5E7] dark:border-[#3F5E63] p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-[#2E4F54] text-gray-900">
              Update your password
            </h1>
            <p className="mt-2 text-sm text-[#2E4F54]/70 text-gray-900/70">
              Enter a new password below to secure your account.
            </p>
          </div>
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}