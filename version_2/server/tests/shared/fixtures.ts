export const TEST_USER_ID = 'user-abc-123'

export function createMockUser(overrides: Partial<{
  id: string
  email: string
  newsletterOptIn: boolean
  createdAt: Date
}> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'test@example.com',
    newsletterOptIn: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function createMockAddress(
  userId: string,
  overrides: Partial<{
    id: string
    line1: string
    line2: string | null
    city: string
    state: string
    postal_code: string
    country: string
    isDefault: boolean
    createdAt: Date
  }> = {},
) {
  return {
    id: 'addr-001',
    userId,
    line1: '969 Cox Rd',
    line2: null,
    city: 'Gastonia',
    state: 'NC',
    postal_code: '28054',
    country: 'US',
    isDefault: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}
