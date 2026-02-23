import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { searchRestaurants } from '@/data/restaurants'
import type { Restaurant } from '@/types/restaurant'

interface SearchBarProps {
  onSelect: (restaurant: Restaurant) => void
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Restaurant[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      searchRestaurants({ data: { query: trimmed } })
        .then((data) => {
          setResults(data)
          setOpen(true)
        })
        .catch((err) => {
          console.error('Search failed:', err)
          setResults([])
        })
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on ESC
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        ;(e.target as HTMLInputElement).blur()
      }
    },
    []
  )

  const handleSelect = useCallback(
    (restaurant: Restaurant) => {
      setOpen(false)
      setQuery('')
      setResults([])
      onSelect(restaurant)
    },
    [onSelect]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setOpen(false)
  }, [])

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs md:max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          placeholder="맛집 검색..."
          className="h-8 pl-8 pr-8 text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md border bg-white shadow-lg">
          {loading && results.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              검색 중...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.name}-${r.lat}-${r.lng}-${i}`}
                type="button"
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-orange-50 transition-colors border-b last:border-b-0"
                onClick={() => handleSelect(r)}
              >
                <span className="text-sm font-medium truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {r.address}
                </span>
                {r.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {r.categories.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="inline-block rounded-full bg-orange-100 px-1.5 py-0 text-[10px] text-orange-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
