// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-green-600 shadow-lg mb-6">
        <span className="text-4xl">🛒</span>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">You are offline</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-8">
        No internet connection detected. Please check your network and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
      >
        Try again
      </button>
    </div>
  );
}