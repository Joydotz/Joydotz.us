interface ImagePlaceholderProps {
  aspect?: string
  className?: string
  rounded?: string
  // 'surface' = white/cream (default, for floating on canvas)
  // 'canvas'  = slightly lighter than body, stays warm
  // 'cloud' | 'butterfly' | 'flower' = SKU-tinted surface
  variant?: 'surface' | 'canvas' | 'cloud' | 'butterfly' | 'flower'
}

const variantClasses: Record<string, string> = {
  surface:   'bg-joy-surface',
  canvas:    'bg-joy-card',
  cloud:     'bg-joy-cloud-lt',
  butterfly: 'bg-joy-butterfly-lt',
  flower:    'bg-joy-flower-lt',
}

export default function ImagePlaceholder({
  aspect = 'aspect-square',
  className = '',
  rounded = 'rounded-2xl',
  variant = 'surface',
}: ImagePlaceholderProps) {
  return (
    <div
      className={`
        ${aspect} ${rounded} ${variantClasses[variant]}
        overflow-hidden w-full flex-shrink-0
        ${className}
      `}
    />
  )
}
