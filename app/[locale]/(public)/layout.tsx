import { StorefrontHeader } from '@/components/StorefrontHeader'
import { getTranslations } from 'next-intl/server'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const nav = await getTranslations('SiteNav')
  const storefront = await getTranslations('Storefront')

  return (
    <>
      <StorefrontHeader
        labels={{
          home: nav('home'),
          about: nav('about'),
          catalog: nav('catalog'),
          shop: nav('shop'),
          contact: nav('contact'),
          shopNow: storefront('shop_now'),
        }}
      />
      {children}
    </>
  )
}
