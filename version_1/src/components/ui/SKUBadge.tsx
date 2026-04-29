import type { SKU } from '../../lib/products'

interface SKUBadgeProps {
  sku: SKU
  size?: 'sm' | 'md'
  onCanvas?: boolean   // true = sits on the Pantone background
}

const config: Record<SKU, { label: string; surfaceBg: string; canvasBg: string; text: string }> = {
  cloud:     { label: 'Cloud',     surfaceBg: 'bg-joy-cloud-lt',     canvasBg: 'bg-joy-surface/40', text: 'text-sky-700' },
  butterfly: { label: 'Butterfly', surfaceBg: 'bg-joy-butterfly-lt', canvasBg: 'bg-joy-surface/40', text: 'text-stone-600' },
  flower:    { label: 'Flower',    surfaceBg: 'bg-joy-flower-lt',    canvasBg: 'bg-joy-surface/40', text: 'text-rose-600' },
}

export default function SKUBadge({ sku, size = 'sm', onCanvas = false }: SKUBadgeProps) {
  const { label, surfaceBg, canvasBg, text } = config[sku]
  const bg = onCanvas ? canvasBg : surfaceBg
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-body font-medium
        ${bg} ${text}
        ${size === 'sm' ? 'text-xs px-3 py-1' : 'text-sm px-4 py-1.5'}
      `}
    >
      {label}
    </span>
  )
}
