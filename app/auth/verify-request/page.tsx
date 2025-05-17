export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Doğrulama Gerekli
          </h2>
          <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-md">
            <p className="text-center">
              Email adresinize bir doğrulama bağlantısı gönderdik. Lütfen gelen kutunuzu kontrol edin.
            </p>
            <p className="text-center mt-2 text-sm">
              Spam klasörünü kontrol etmeyi unutmayın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 