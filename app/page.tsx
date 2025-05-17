import Image from "next/image";
import Countdown from './components/Countdown';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              YDS Kelime Öğrenme
            </h1>
            <p className="text-xl text-base-content/70 text-center max-w-2xl mx-auto leading-relaxed">
              YDS sınavına hazırlanırken kelime dağarcığınızı sistemli bir şekilde geliştirin. 
              Haftalık kelime paketleri ve interaktif testlerle başarıya ulaşın.
            </p>
          </div>

          <Countdown />

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-12">
            <a
              href="/flashcards"
              className="group relative overflow-hidden rounded-2xl bg-white p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative">
                <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Kelime Kartları
                </h2>
                <p className="text-base-content/70 leading-relaxed">
                  İnteraktif kelime kartlarıyla etkili öğrenme deneyimi yaşayın. 
                  Her hafta yeni kelimelerle İngilizce-Türkçe pratik yapın.
                </p>
              </div>
            </a>

            <a
              href="/quiz"
              className="group relative overflow-hidden rounded-2xl bg-white p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative">
                <h2 className="text-2xl font-bold text-secondary mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Kelime Testi
                </h2>
                <p className="text-base-content/70 leading-relaxed">
                  Öğrendiğiniz kelimeleri pekiştirin ve kendinizi değerlendirin. 
                  Çoktan seçmeli sorularla bilginizi test edin.
                </p>
              </div>
            </a>
          </div>

          {/* Membership Features Table */}
          <div className="mt-16 w-full">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
              Üyelik Özellikleri
            </h2>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Özellikler</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-500">Üye Olmayan</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-primary">Üye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">Kelime Kartları</td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">Kelime Testi</td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">Ezberlenemeyen Kelimeler Listesi</td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">Kelime İlerleme Takibi</td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">Özelleştirilmiş Tekrar Listesi</td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Call to Action */}
            <div className="mt-8 text-center">
              <Link 
                href="/register" 
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                Hemen Üye Ol
              </Link>
              <p className="mt-2 text-sm text-gray-500">
                Zaten üye misiniz? <Link href="/login" className="text-primary hover:text-primary/90">Giriş yapın</Link>
              </p>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16 w-full">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
              Neden YDS Kelime?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-xl font-semibold mb-2">Hızlı Öğrenme</h3>
                <p className="text-base-content/70">Haftalık kelime paketleriyle sistemli ve hızlı öğrenme</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold mb-2">Etkili Tekrar</h3>
                <p className="text-base-content/70">İnteraktif testlerle kalıcı öğrenme</p>
              </div>

              <div className="flex flex-col items-center text-center p-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold mb-2">Zaman Tasarrufu</h3>
                <p className="text-base-content/70">Planlı çalışmayla verimli öğrenme</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
