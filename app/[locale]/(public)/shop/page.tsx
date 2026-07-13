import SitePage, { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateSiteMetadata({ params: { slug: ['shop'], ...params } })
}

export default async function ShopPage({ params }: { params: { locale: string } }) {
  return <SitePage params={{ slug: ['shop'], ...params }} />
}
