import 'server-only'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { packageModuleMap, packages } from '@/lib/constants/packages'
import { isDemoEnvironment } from '@/lib/demo-environment'
import { PLATFORM_MODULES } from '@/lib/constants'

export async function createDemoWorkspace(packageKey: string) {
  if (!isDemoEnvironment() || !Object.hasOwn(packages, packageKey)) throw new Error('Demo unavailable')
  const suffix = crypto.randomUUID().replace(/-/g, '')
  return prisma.$transaction(async tx => {
    const restaurant = packageKey === 'restaurant'
    const companyName = restaurant ? 'Sample Restaurant' : 'Sample Business'
    const tenant = await tx.systemTenant.create({data:{companyName,subdomain:'demo-'+suffix,status:'active',plan:'enterprise'}})
    const tenantId = tenant.id
    const user = await tx.user.create({data:{tenantId,email:`visitor-${suffix}@example.com`,passwordHash:crypto.randomBytes(48).toString('hex'),firstName:'Demo',lastName:'Visitor',status:'active',emailVerified:true}})
    const role = await tx.role.create({data:{tenantId,name:'Demo Operator',description:'Sample workspace access only'}})
    await tx.tenantUserRole.create({data:{tenantId,userId:user.id,roleId:role.id}})
    const packageModules = packageModuleMap[packageKey] || []
    const permissionModules: Record<string,string> = {catalog_module:'catalog',ecommerce_module:'orders',inventory_module:'inventory',pos_module:'pos',booking_module:'booking',crm_module:'crm'}
    const permissions = Array.from(new Set(['website','analytics','monitoring',...packageModules.map(key=>permissionModules[key]).filter(Boolean)]))
    for (const moduleKey of ['system',...permissions]) for (const actionKey of moduleKey==='system'||moduleKey==='analytics'||moduleKey==='monitoring'?['read']:['read','write','delete']) {
      const permission = await tx.tenantPermissionsRegistry.upsert({where:{moduleKey_actionKey:{moduleKey,actionKey}},update:{},create:{moduleKey,actionKey}})
      await tx.tenantRolePermission.create({data:{roleId:role.id,permissionId:permission.id}})
    }
    // The actual installed modules and workflows are used; external services are absent.
    const modules = Array.from(new Set(packageModules)).filter(key=>!['ai_module','api_module','notification_module','payment_module','rbac_module','user_management'].includes(key))
    await tx.tenantModule.createMany({data:PLATFORM_MODULES.map(module=>({tenantId,moduleKey:module.key,isEnabled:modules.includes(module.key),activatedAt:new Date()}))})
    await tx.tenantWebsite.create({data:{tenantId,siteTitle:companyName,isActive:true,themeConfig:{demoPackage:packageKey,colors:{primary:'#175b4c',secondary:'#10b981',background:'#ffffff',text:'#111827'},navigationTree:[{label:'Home',target:'/'},{label:'About',target:'/site/about'},{label:'Contact',target:'/site/contact'}]},globalSeoMetadata:{description:'Working WMP demonstration using sample content.'}}})
    await tx.tenantPage.createMany({data:[
      {tenantId,slug:'/',title:companyName,isPublished:true,layoutBlocks:[
        {id:'sample-hero',sortOrder:0,type:'hero',config:{title:restaurant?'Good food. A welcoming table.':'A website your team can manage.',subtitle:restaurant?'Explore a sample restaurant website, then manage menus and reservations in the workspace.':'This sample website is published through WMP’s real content management system.',ctaText:'About this business',ctaUrl:'/site/about'}},
        {id:'sample-features',sortOrder:1,type:'features',config:{title:'What we offer',items:restaurant?[{title:'Seasonal menus',description:'Sample dishes and drinks, managed in the product catalog.'},{title:'Table reservations',description:'Resources, staff, and bookings in one workspace.'},{title:'Friendly service',description:'Sample business content you can edit in Pages.'}]:[{title:'Our services',description:'Introduce your services with content your team controls.'},{title:'Our approach',description:'Update published pages through the real Pages module.'},{title:'Work with us',description:'Keep your business information clear and current.'}]}}
      ]},
      {tenantId,slug:'about',title:'About '+companyName,isPublished:true,layoutBlocks:[{type:'hero',data:{heading:'Meet '+companyName,subheading:'This is sample content rendered by the same WMP page engine used in customer websites.'}},{type:'features',data:{items:[{title:'Our team',description:'Introduce your people here.'},{title:'Our work',description:'Explain what your business delivers.'},{title:'Our values',description:'Share what matters to your business.'}]}}]},
    ]})
    const category = await tx.tenantCategory.create({data:{tenantId,name:restaurant?'Menu':'Sample products',slug:'sample-products'}})
    const location = await tx.tenantInventoryLocation.create({data:{tenantId,locationName:'Sample stockroom',isActive:true}})
    const titles = restaurant?['Kopi Susu','Iced Tea','Nasi Goreng','Mie Goreng']:['Canvas Tote','Coffee Beans 250g','Ceramic Mug','Notebook']
    const prices = restaurant?[24000,18000,38000,36000]:[125000,95000,65000,45000]
    const items = []
    for (let i=0;i<titles.length;i++) {
      const item = await tx.tenantCatalogItem.create({data:{tenantId,categoryId:category.id,title:titles[i],description:'Sample item — editable in the working demo.',basePrice:prices[i],sku:'DEMO-'+(i+1),imageUrls:[],isVisible:true}})
      items.push(item)
      await tx.tenantInventoryBalance.create({data:{tenantId,locationId:location.id,catalogItemId:item.id,quantityOnHand:i===3?3:40+i*10,lowStockThreshold:5,status:i===3?'low':'optimal'}})
    }
    for (let i=0;i<3;i++) {
      const item=items[i]
      const order = await tx.tenantOrder.create({data:{tenantId,guestEmail:`sample-customer-${i+1}@example.com`,orderStatus:i===2?'processing':'completed',totalAmount:Number(item.basePrice)*2,currency:'IDR',notes:'Sample order in the isolated demo workspace.'}})
      await tx.tenantOrderItem.create({data:{tenantId,orderId:order.id,catalogItemId:item.id,quantity:2,unitPrice:item.basePrice}})
    }
    const contact = await tx.tenantCrmContact.create({data:{tenantId,email:'sample-customer@example.com',firstName:'Sample',lastName:'Customer',tags:['Demo'],totalSpend:190000}})
    await tx.tenantCrmTimeline.create({data:{tenantId,contactId:contact.id,eventType:'note',sourceModule:'crm',eventPayload:{note:'Fictional contact for trying the CRM workflow.'},occurredAt:new Date()}})
    const terminal = await tx.tenantPosTerminal.create({data:{tenantId,terminalName:'Sample Register',hardwareIdentifier:'DEMO-'+suffix,status:'online'}})
    await tx.tenantPosSession.create({data:{tenantId,terminalId:terminal.id,openedBy:user.id,openingBalance:250000,status:'open'}})
    const resource = await tx.tenantBookingResource.create({data:{tenantId,resourceName:restaurant?'Table 1':'Meeting Room',capacityPerSlot:4,isActive:true}})
    const staff = await tx.tenantBookingStaff.create({data:{tenantId,resourceId:resource.id,displayName:'Sample Staff',email:'sample-staff@example.com',isActive:true}})
    const startTime = new Date(); startTime.setHours(14,0,0,0)
    await tx.tenantBooking.create({data:{tenantId,resourceId:resource.id,staffId:staff.id,customerId:contact.id,bookingStatus:'confirmed',startTime,endTime:new Date(startTime.getTime()+3600000),notes:'Sample reservation',metadata:{customerName:'Sample Customer'}}})
    for (let i=0;i<7;i++) {
      const date=new Date();date.setUTCDate(date.getUTCDate()-i);date.setUTCHours(0,0,0,0)
      await tx.tenantAnalyticsEvent.createMany({data:Array.from({length:12+i*2},(_,j)=>({tenantId,sessionId:`sample-${i}-${Math.floor(j/3)}`,eventName:'pageview',pageUrl:'/en',createdAt:new Date(date.getTime()+j*60000)}))})
    }
    return {tenant,user,role}
  },{timeout:30000})
}
