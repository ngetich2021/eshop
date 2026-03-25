import Image from 'next/image';
import { SignInButton } from './Sign-in';

export default function GoogleSignIn() {
  return (
    <main className="h-screen w-full flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header with Logo */}
          <div className="pt-10 pb-8 px-8 bg-gradient-to-b from-blue-600 to-blue-700">
            <div className="relative mx-auto w-28 h-28 rounded-full ring-8 ring-white/20 shadow-2xl overflow-hidden">
              <Image
                src="/branton_logo.png"
                alt="Gas App Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="px-10 pb-10 text-center space-y-8">

            {/* Welcome Message */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                Welcome Back!
              </h1>
              <p className="text-lg text-gray-600 font-medium capitalize">
               continue to your account ?
              </p>
            </div>

            {/* Google Sign-In Button (No Duplicated Logo!) */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-300" />
              <div className="relative bg-white rounded-xl px-8 py-6 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl">
                <SignInButton />
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 space-y-3 text-[8px] text-gray-500 border-t border-gray-200">
              <p className="font-medium">
                Need help? Call us at{' '}
                <a href="tel:+254712345678" className="text-blue-600 hover:text-blue-700 font-bold">
                  +254 712 345 678
                </a>
              </p>
              <p className="text-[8px]">
                Developed with love by{' '}
                <span className="font-semibold text-blue-600">Kwenik Developers</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}