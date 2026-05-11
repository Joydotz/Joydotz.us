import AddressForm from './AddressForm'
import type { Address, AddressInput } from '../lib/api'

export type AddressBookVariant = 'account' | 'checkout'

interface AddressBookPanelBaseProps {
  variant: AddressBookVariant
  addresses: Address[]
  showAddForm: boolean
  onShowAddForm: (show: boolean) => void
  editingId: string | null
  onEditingId: (id: string | null) => void
  onCreate: (input: AddressInput) => Promise<void>
  onUpdate: (id: string, input: AddressInput) => Promise<void>
}

interface AddressBookPanelAccountProps extends AddressBookPanelBaseProps {
  variant: 'account'
  deletingId: string | null
  onDelete: (id: string) => Promise<void>
  onSetDefault: (id: string) => Promise<void>
}

interface AddressBookPanelCheckoutProps extends AddressBookPanelBaseProps {
  variant: 'checkout'
  selectedForOrderId: string | null
  onSelectForOrder: (id: string) => void
}

export type AddressBookPanelProps = AddressBookPanelAccountProps | AddressBookPanelCheckoutProps

export default function AddressBookPanel(props: AddressBookPanelProps) {
  const { variant, addresses, showAddForm, onShowAddForm, editingId, onEditingId, onCreate, onUpdate } = props

  const title = variant === 'account' ? 'addresses' : 'ship to'
  const showHeaderAdd =
    variant === 'account' ? !showAddForm : addresses.length > 0 && !showAddForm

  const checkoutEmpty = variant === 'checkout' && addresses.length === 0
  const accountEmptyList = variant === 'account' && addresses.length === 0 && !showAddForm

  return (
    <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label">{title}</h2>
        {showHeaderAdd && (
          <button
            type="button"
            onClick={() => onShowAddForm(true)}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-70 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            add new
          </button>
        )}
      </div>

      <div className="space-y-4">
        {checkoutEmpty && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-on-surface-variant font-body">
              Add where we should ship this order — it will be saved to your account.
            </p>
            <AddressForm
              submitLabel="save & continue"
              onSave={onCreate}
              onCancel={undefined}
            />
          </div>
        )}

        {!checkoutEmpty &&
          addresses.map((addr) =>
            editingId === addr.id ? (
              <div key={addr.id} className="border border-outline-variant/50 rounded-xl p-4">
                <AddressForm
                  initial={addr}
                  onSave={(input) => onUpdate(addr.id, input)}
                  onCancel={() => onEditingId(null)}
                />
              </div>
            ) : variant === 'checkout' ? (
              <CheckoutAddressRow
                key={addr.id}
                addr={addr}
                selected={props.selectedForOrderId === addr.id}
                onSelect={() => props.onSelectForOrder(addr.id)}
                onEdit={() => onEditingId(addr.id)}
              />
            ) : (
              <AccountAddressRow
                key={addr.id}
                addr={addr}
                onSetDefault={() => props.onSetDefault(addr.id)}
                onEdit={() => onEditingId(addr.id)}
                onDelete={() => props.onDelete(addr.id)}
                deleting={props.deletingId === addr.id}
              />
            ),
          )}

        {accountEmptyList && (
          <p className="text-sm text-on-surface-variant font-body">no addresses saved yet.</p>
        )}

        {showAddForm &&
          !editingId &&
          !(variant === 'checkout' && addresses.length === 0) && (
            <div className="border border-outline-variant/50 rounded-xl p-4">
              <AddressForm
                onSave={async (input) => {
                  await onCreate(input)
                  onShowAddForm(false)
                }}
                onCancel={() => onShowAddForm(false)}
              />
            </div>
          )}
      </div>
    </div>
  )
}

function AccountAddressRow({
  addr,
  onSetDefault,
  onEdit,
  onDelete,
  deleting,
}: {
  addr: Address
  onSetDefault: () => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div className="border border-outline-variant/50 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-body text-on-surface leading-relaxed">
          <p>{addr.line1}</p>
          {addr.line2 && <p>{addr.line2}</p>}
          <p>
            {addr.city}, {addr.state} {addr.postal_code}
          </p>
          <p>{addr.country}</p>
        </div>
        {addr.isDefault && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-primary/10 text-primary rounded-full shrink-0">
            default
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {!addr.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container text-on-primary-container hover:opacity-80 transition-all"
          >
            set default
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container text-on-primary-container hover:opacity-80 transition-all"
        >
          edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container text-on-primary-container hover:opacity-80 transition-all disabled:opacity-40"
        >
          {deleting ? 'deleting…' : 'delete'}
        </button>
      </div>
    </div>
  )
}

function CheckoutAddressRow({
  addr,
  selected,
  onSelect,
  onEdit,
}: {
  addr: Address
  selected: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  const inputId = `checkout-ship-addr-${addr.id}`

  return (
    <div
      className={`flex gap-4 rounded-xl border p-4 transition-all ${
        selected ? 'border-primary bg-primary/5' : 'border-outline-variant/50 hover:border-primary/40'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <label
          htmlFor={inputId}
          className="block cursor-pointer text-sm font-body leading-relaxed text-on-surface"
        >
          <p>{addr.line1}</p>
          {addr.line2 && <p>{addr.line2}</p>}
          <p>
            {addr.city}, {addr.state} {addr.postal_code}
          </p>
          <p>{addr.country}</p>
        </label>
        <div className="flex flex-wrap gap-2 border-t border-outline-variant/20 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onEdit()
            }}
            className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container transition-all hover:opacity-80"
          >
            edit
          </button>
        </div>
      </div>
      <div className="flex shrink-0 items-center self-stretch">
        <input
          id={inputId}
          type="radio"
          name="checkout-ship-address"
          checked={selected}
          onChange={onSelect}
          className="h-4 w-4 shrink-0 accent-[#df9b86]"
        />
      </div>
    </div>
  )
}
