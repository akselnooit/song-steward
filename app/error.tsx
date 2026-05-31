'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="px-4 pt-16 pb-8 max-w-lg mx-auto text-center">
      <p className="text-gray-500 mb-2">Coś poszło nie tak</p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-4 font-mono">{error.digest}</p>
      )}
      <button
        onClick={reset}
        className="bg-blue-900 text-white rounded-xl px-4 py-2 text-sm font-semibold active:scale-95 transition-all"
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}
