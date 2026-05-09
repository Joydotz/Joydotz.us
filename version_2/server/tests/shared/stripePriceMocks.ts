import type { MockedFunction } from 'vitest'
import { PRODUCTS } from '../../src/data/products'

type StripePriceMap = Map<string, { unitAmount: number; currency: string }>

export type RetrieveStripePricesByIdsFn = (priceIds: string[]) => Promise<StripePriceMap>

/** Fake Stripe unit_amount (cents for USD) when API calls are mocked in unit tests. */
export const UNIT_AMOUNTS_BY_PRODUCT_ID: Record<string, number> = {
  'softwing-butterfly': 500,
  'daydream-cloud': 400,
  'blush-flower': 300,
}

export function mockStripeCatalogPriceMap() {
  return new Map(
    PRODUCTS.map((p) => [
      p.stripePriceId,
      { unitAmount: UNIT_AMOUNTS_BY_PRODUCT_ID[p.id], currency: 'usd' as const },
    ]),
  )
}

/** Default mock implementation for `retrieveStripePricesByIds`. */
export function wireRetrieveStripePricesByIdsMock(mockFn: MockedFunction<RetrieveStripePricesByIdsFn>) {
  const full = mockStripeCatalogPriceMap()
  mockFn.mockImplementation(async (priceIds: string[]) => {
    const m = new Map<string, { unitAmount: number; currency: string }>()
    for (const id of priceIds) {
      const hit = full.get(id)
      if (hit) m.set(id, hit)
    }
    return m
  })
}
