import SitePage, { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateSiteMetadata({ params: { slug: ['about'], ...params } })
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  return <SitePage params={{ slug: ['about'], ...params }} />
}
