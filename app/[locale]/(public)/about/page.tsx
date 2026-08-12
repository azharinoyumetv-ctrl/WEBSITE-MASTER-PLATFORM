import { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateSiteMetadata({ params: { slug: ['about'], ...params } })
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/site/about`)
}
