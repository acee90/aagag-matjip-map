import { Badge } from '@/components/ui/badge'

interface CategoryFilterProps {
  categories: string[]
  selected: string[]
  onChange: (categories: string[]) => void
}

export function CategoryFilter({
  categories,
  selected,
  onChange,
}: CategoryFilterProps) {
  const toggle = (cat: string) => {
    onChange(
      selected.includes(cat)
        ? selected.filter((c) => c !== cat)
        : [...selected, cat]
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => {
        const isActive = selected.includes(cat)
        return (
          <button key={cat} onClick={() => toggle(cat)}>
            <Badge
              variant={isActive ? 'default' : 'outline'}
              className={`cursor-pointer text-xs transition-colors ${
                isActive
                  ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                  : 'hover:bg-orange-50 hover:border-orange-300'
              }`}
            >
              {cat}
            </Badge>
          </button>
        )
      })}
      {selected.length > 0 && (
        <button onClick={() => onChange([])}>
          <Badge
            variant="ghost"
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
          >
            초기화
          </Badge>
        </button>
      )}
    </div>
  )
}
