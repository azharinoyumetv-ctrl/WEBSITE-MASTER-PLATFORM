import { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return generateSiteMetadata({ params: params.then(value => ({ slug: ['about'], ...value })) })
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/site/about`)
}
