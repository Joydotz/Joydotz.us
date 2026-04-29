export type SKU = 'cloud' | 'butterfly' | 'flower'

export interface Product {
  slug: string
  name: string
  subtitle: string
  tagline: string
  description: string
  longDescription: string
  sku: SKU
  accentColor: string
  accentLightColor: string
  patchShape: string
  count: string
  price: string
  details: string[]
  whatsInside: { label: string; note: string }[]
  hiddenVariant: boolean
  faq: { q: string; a: string }[]
}

export const products: Product[] = [
  {
    slug: 'daydream-cloud',
    name: 'Daydream Cloud',
    subtitle: 'iridescent cloud patches',
    tagline: 'cute enough to wear to sleep',
    description:
      'Cloud-shaped hydrocolloid patches with an iridescent shimmer finish. They work while you rest.',
    longDescription:
      'some nights your skin just needs a little help. daydream cloud patches absorb what needs to go — gently, quietly, while you sleep. the iridescent shimmer means they\'re almost too cute to cover up.',
    sku: 'cloud',
    accentColor: '#B8CDEA',
    accentLightColor: '#DCE9F7',
    patchShape: 'cloud',
    count: '32 pcs · 4 sheets × 8',
    price: '$12',
    details: [
      'hydrocolloid formula',
      'cloud-shaped, iridescent shimmer finish',
      'ultra-thin, breathable',
      'gentle on sensitive skin',
    ],
    whatsInside: [
      { label: '32 patches', note: '4 sheets of 8 cloud shapes' },
      { label: 'precision stylus', note: 'peel & press without touching' },
      { label: 'message card', note: 'a little something for the hard days' },
    ],
    hiddenVariant: true,
    faq: [
      {
        q: 'How long should I wear a patch?',
        a: 'Leave it on for at least 6–8 hours. Overnight works best. The patch turns white when it has absorbed — that\'s it working.',
      },
      {
        q: 'Can I wear it during the day?',
        a: 'You can. The iridescent finish makes daydream cloud actually kind of a statement.',
      },
      {
        q: 'What skin types does it work for?',
        a: 'Hydrocolloid is gentle enough for most skin types, including sensitive. Patch test if you\'re unsure.',
      },
      {
        q: 'What is the hidden variant?',
        a: 'Sometimes a surprise shape sneaks into a sheet. We\'ll let you find it.',
      },
    ],
  },
  {
    slug: 'softwind-butterfly',
    name: 'Softwind Butterfly',
    subtitle: 'pearl translucent patches',
    tagline: 'gentle like a landing',
    description:
      'Butterfly-shaped hydrocolloid patches in a soft pearl translucent finish. Quiet, calm, and effective.',
    longDescription:
      'softwind butterfly patches are for the moments when your skin needs calm more than anything. pearl translucent finish, butterfly shape, soft as it sounds. wear them proudly or let them disappear into your skin — either works.',
    sku: 'butterfly',
    accentColor: '#D8D2CA',
    accentLightColor: '#EEEAE6',
    patchShape: 'butterfly',
    count: '32 pcs · 4 sheets × 8',
    price: '$12',
    details: [
      'hydrocolloid formula',
      'butterfly-shaped, pearl translucent finish',
      'ultra-thin, breathable',
      'gentle on sensitive skin',
    ],
    whatsInside: [
      { label: '32 patches', note: '4 sheets of 8 butterfly shapes' },
      { label: 'precision stylus', note: 'peel & press without touching' },
      { label: 'message card', note: 'a little something for the hard days' },
    ],
    hiddenVariant: true,
    faq: [
      {
        q: 'How long should I wear a patch?',
        a: 'Leave it on for at least 6–8 hours. Overnight works best. The patch turns white when it has absorbed — that\'s it working.',
      },
      {
        q: 'Are they invisible on skin?',
        a: 'The pearl translucent finish blends well on most skin tones, especially for daytime wear.',
      },
      {
        q: 'What skin types does it work for?',
        a: 'Hydrocolloid is gentle enough for most skin types, including sensitive. Patch test if you\'re unsure.',
      },
      {
        q: 'What is the hidden variant?',
        a: 'Sometimes a surprise shape sneaks into a sheet. We\'ll let you find it.',
      },
    ],
  },
  {
    slug: 'blush-flower',
    name: 'Blush Flower',
    subtitle: 'soft pink flower patches',
    tagline: 'a little bloom for the hard days',
    description:
      'Flower-shaped hydrocolloid patches in a soft blush pink. Comforting, cute, and a little collectible.',
    longDescription:
      'blush flower patches are the ones you reach for when you want comfort to look like comfort. soft pink, flower-shaped, easy to love. they do the work — you just feel a little cuter wearing them.',
    sku: 'flower',
    accentColor: '#F2AEBB',
    accentLightColor: '#FAD9E3',
    patchShape: 'flower',
    count: '32 pcs · 4 sheets × 8',
    price: '$12',
    details: [
      'hydrocolloid formula',
      'flower-shaped, soft blush pink finish',
      'ultra-thin, breathable',
      'gentle on sensitive skin',
    ],
    whatsInside: [
      { label: '32 patches', note: '4 sheets of 8 flower shapes' },
      { label: 'precision stylus', note: 'peel & press without touching' },
      { label: 'message card', note: 'a little something for the hard days' },
    ],
    hiddenVariant: true,
    faq: [
      {
        q: 'How long should I wear a patch?',
        a: 'Leave it on for at least 6–8 hours. Overnight works best. The patch turns white when it has absorbed — that\'s it working.',
      },
      {
        q: 'Can I stack them?',
        a: 'Not recommended — each patch works best directly on skin. But arranging them in a little cluster? very cute.',
      },
      {
        q: 'What skin types does it work for?',
        a: 'Hydrocolloid is gentle enough for most skin types, including sensitive. Patch test if you\'re unsure.',
      },
      {
        q: 'What is the hidden variant?',
        a: 'Sometimes a surprise shape sneaks into a sheet. We\'ll let you find it.',
      },
    ],
  },
]

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}
