import SitePage, { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateSiteMetadata({ params: { slug: ['privacy'], ...params } })
}

export default async function PrivacyPage({ params }: { params: { locale: string } }) {
  return <SitePage params={{ slug: ['privacy'], ...params }} />
}
