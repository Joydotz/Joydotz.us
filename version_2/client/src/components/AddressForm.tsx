import { useState } from 'react'
import type { AddressInput } from '../lib/api'

export const EMPTY_ADDRESS: AddressInput = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
}

interface AddressFormProps {
  initial?: AddressInput
  onSave: (input: AddressInput) => Promise<void>
  /** Omit on checkout first-address flow so only submit is shown. */
  onCancel?: () => void
  submitLabel?: string
}

export default function AddressForm({
  initial,
  onSave,
  onCancel,
  submitLabel = 'save address',
}: AddressFormProps) {
  const [form, setForm] = useState<AddressInput>(initial ?? EMPTY_ADDRESS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof AddressInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-surface-container px-4 py-3 rounded-full text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm disabled:opacity-50'

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <input
        className={inputClass}
        placeholder="address line 1"
        value={form.line1}
        onChange={(e) => set('line1', e.target.value)}
        required
        disabled={saving}
      />
      <input
        className={inputClass}
        placeholder="address line 2 (optional)"
        value={form.line2 ?? ''}
        onChange={(e) => set('line2', e.target.value)}
        disabled={saving}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          className={inputClass}
          placeholder="city"
          value={form.city}
          onChange={(e) => set('city', e.target.value)}
          required
          disabled={saving}
        />
        <input
          className={inputClass}
          placeholder="state"
          value={form.state}
          onChange={(e) => set('state', e.target.value)}
          required
          disabled={saving}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          className={inputClass}
          placeholder="postal code"
          value={form.postal_code}
          onChange={(e) => set('postal_code', e.target.value)}
          required
          disabled={saving}
        />
        <input
          className={inputClass}
          placeholder="country (2-letter)"
          value={form.country}
          onChange={(e) => set('country', e.target.value.toUpperCase())}
          maxLength={2}
          required
          disabled={saving}
        />
      </div>
      {error && <p className="text-error text-xs font-body">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className={`py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 ${onCancel ? 'flex-1' : 'w-full'}`}
        >
          {saving ? 'saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-surface-container text-on-surface-variant rounded-full font-bold text-sm hover:bg-surface-container-high transition-all"
          >
            cancel
          </button>
        )}
      </div>
    </form>
  )
}
