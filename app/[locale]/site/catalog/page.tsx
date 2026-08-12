import { CatalogClient } from './catalog-client'

export const metadata = {
  title: 'Solutions Catalog | DagangOS Digital Indonesia',
  description: 'Explore DagangOS self-hosted digital business solutions by business need.',
}

export default function CatalogPage({ params }: { params: { locale: string } }) {
  return <CatalogClient locale={params.locale} />
}
