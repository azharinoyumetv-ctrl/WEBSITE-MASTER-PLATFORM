import { NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { isDemoEnvironment, isDemoHost } from '@/lib/demo-environment'
import { createDemoWorkspace } from '@/lib/demo-workspace'
import { packages } from '@/lib/constants/packages'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!isDemoEnvironment() || !isDemoHost(request.headers.get('host') || '')) return new NextResponse('Not Found',{status:404})
  if (request.headers.get('origin') !== 'https://demo.dagangos.com' || !request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return new NextResponse('Invalid request',{status:403})
  if (Number(request.headers.get('content-length')||0)>2048) return new NextResponse('Request too large',{status:413})
  try {
    const body = await request.text()
    if (body.length>2048) return new NextResponse('Request too large',{status:413})
    const form = new URLSearchParams(body)
    const locale = form.get('locale')==='id'?'id':'en'
    const packageKey = form.get('package') || 'business_website'
    if (!Object.hasOwn(packages,packageKey)) return new NextResponse('Unknown package',{status:400})
    const allowed = new Set(['dashboard','pages','catalog','ecommerce','pos','inventory','booking','crm'])
    const destination = form.get('destination') || 'dashboard'
    if (destination!=='website' && !allowed.has(destination)) return new NextResponse('Unknown screen',{status:400})
    const target = destination==='website'?`/${locale}`:`/${locale}/admin/${destination}`
    const session = await getServerSession(authOptions)
    if (session?.user && (session.user as {tenantId?:string}).tenantId) {
      const tenant=await prisma.systemTenant.findUnique({where:{id:(session.user as {tenantId:string}).tenantId},include:{website:true}})
      if (tenant?.subdomain.startsWith('demo-') && (tenant.website?.themeConfig as {demoPackage?:string})?.demoPackage===packageKey) return NextResponse.redirect(new URL(target,'https://demo.dagangos.com'),303)
    }
    const ip=request.headers.get('x-real-ip')||'unknown'
    if ((await checkRateLimit(ip,'demo-create',8,3600000)).limited) return new NextResponse('Please return to your existing demo or try again later.',{status:429})
    const {tenant,user,role}=await createDemoWorkspace(packageKey)
    const sessionId=crypto.randomBytes(32).toString('hex')
    await prisma.tenantRefreshToken.create({data:{tenantId:tenant.id,userId:user.id,tokenHash:sessionId,expiresAt:new Date(Date.now()+3600000)}})
    const secret=process.env.NEXTAUTH_SECRET
    if (!secret) throw new Error('Demo session unavailable')
    const jwt=await encode({secret,maxAge:3600,token:{id:user.id,sub:user.id,email:user.email,name:'Demo Visitor',tenantId:tenant.id,tenantSubdomain:tenant.subdomain,tenantCustomDomain:null,roles:[role.name],sessionId,tokenVersion:user.tokenVersion}})
    const response=NextResponse.redirect(new URL(target,'https://demo.dagangos.com'),303)
    response.cookies.set('__Secure-next-auth.session-token',jwt,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:3600})
    response.headers.set('Cache-Control','no-store')
    return response
  } catch {
    console.error('Demo workspace could not be prepared')
    return new NextResponse('The demo could not start. Please try again shortly.',{status:503})
  }
}
