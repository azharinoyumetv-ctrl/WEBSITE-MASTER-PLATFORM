import SitePage, { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateSiteMetadata({ params: { slug: ['terms'], ...params } })
}

export default async function TermsPage({ params }: { params: { locale: string } }) {
  return <SitePage params={{ slug: ['terms'], ...params }} />
}
