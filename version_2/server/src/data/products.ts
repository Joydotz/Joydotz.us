export interface Product {
  id: string
  name: string
  price: number       // in cents (for Stripe)
  displayPrice: string
  description: string
  imageUrl: string
  stripePriceId: string
}

export const PRODUCTS: Product[] = [
  {
    id: 'softwing-butterfly',
    name: 'Softwing Butterfly',
    price: 2200,
    displayPrice: '$22.00',
    description: 'Transformative radiance that wakes up your skin\'s natural glow.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDpj_Xhv7wWHt_OpxqyProbu_Uh8GV9fR0e1r5ZOq9uV_TwZLXebDRTQ7mwLHX7UPlqbVn6Cn0RLUJWLsE_9F29iGtGuGL4aQKonJywFQf1tYVHPcHsy3Pp7WgtGUDzOWB4oOaDZXEyXcBUQ-5LdALMljUhOatB2GprwoQxw-LWS-hESnOpSU7UDuzloCcTeCrbEFxhLKslB5IF7JNJlCn79H3iUYOJNbwt4h079W5ss1Z1wf-umZAkzFS42pU457g03u4eRqTKys',
    stripePriceId: 'price_1TUSZtAMh8Qjd7tslLATOFM0',
  },
  {
    id: 'daydream-cloud',
    name: 'Daydream Cloud',
    price: 1800,
    displayPrice: '$18.00',
    description: 'A gentle, weightless embrace for moments of peak sensitivity.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDivuW3_P7xdpZjWqZg_7rmJpzbtPu3u6ohkCpw5CAQq74JOm3FIdzCJTTGq8AW0Mt1D72hfbJacz0KxxcUSBWC5KzF9F1O1n72iglv3VUuYuMcG3QWv4vGUjTEObV4ET2XkcomRncJmw_7OL8nynDb_mbJ1qnHG-Fmatwq71t2HXNFwIQeczUlAkAfbImQ6I47g6pBTQgXyJgkhtceQtPn074FUXODnuqQBe-oJGuQSgyZqh66fOJFCDHU8kow_YeHdmpWJX2D6ZY',
    stripePriceId: 'price_1TUSZtAMh8Qjd7tslLATOFM0',
  },
  {
    id: 'blush-flower',
    name: 'Blush Flower',
    price: 1800,
    displayPrice: '$18.00',
    description: 'Nurturing recovery for skin that needs a moment to bloom again.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiVJnvqfT-Z7HdInp1TcbPDQuboRJD24Cs57CpCUKAVjoCQOzsSxeRB3-ItKFp-S88hHLJnWXKYlOZGzQkKU0lvRhMGgiqnwgM8YknbjHINqeuO-ZdUAtirxb7NSRKyl3A6GgF580tJ8HsVv-JkXJkV7QX59y1xmQlIchcZOVLkKCTHLwa7kgJ7Xe1TDNuk0XprJwdO3G4Jelo0HlfHQwE9DuBIduT_q4fcfPlmKUrZBTpOJzpd-CtIdzfFT7360DWHwpbuJ7m3f8',
    stripePriceId: 'price_1TUSa7AMh8Qjd7tsMwn58iUh',
  },
]

export const PRODUCT_IDS = new Set(PRODUCTS.map((p) => p.id))
