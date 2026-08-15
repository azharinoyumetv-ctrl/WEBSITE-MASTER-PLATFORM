import { CatalogClient } from './catalog-client'

export const metadata = {
  title: 'Solutions Catalog | DagangOS Digital Indonesia',
  description: 'Explore DagangOS self-hosted digital business solutions by business need.',
}

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CatalogClient locale={locale} />
}

