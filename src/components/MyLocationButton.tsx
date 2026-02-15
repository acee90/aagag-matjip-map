import { Locate, Loader2 } from 'lucide-react'

interface MyLocationButtonProps {
  loading: boolean
  onClick: () => void
}

export function MyLocationButton({ loading, onClick }: MyLocationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="absolute bottom-24 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 md:bottom-6"
      aria-label="내 위치로 이동"
    >
      {loading ? (
        <Loader2 className="size-5 text-orange-500 animate-spin" />
      ) : (
        <Locate className="size-5 text-gray-700" />
      )}
    </button>
  )
}
