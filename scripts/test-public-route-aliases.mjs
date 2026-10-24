import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url),ts=require('typescript');
const env={NODE_ENV:'production',NEXT_PUBLIC_BASE_DOMAIN:'wmp.dagangos.com',NEXTAUTH_URL:'https://wmp.dagangos.com'};
function load(path,deps={}) {
  const exports={};
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>Object.hasOwn(deps,name)?deps[name]:require(name),process:{env},URL,Headers,Buffer,crypto:webcrypto,btoa,console});
  return exports;
}
const aliases=load('../lib/public-route-aliases.ts');
class NextResponse extends Response {
  constructor(body,init){super(body,init);this.cookies={delete(){}};}
  static redirect(url,status=307){return new NextResponse(null,{status,headers:{location:String(url)}});}
  static rewrite(url){return new NextResponse(null,{headers:{'x-middleware-rewrite':String(url)}});}
  static next(){return new NextResponse(null);}
}
const middleware=load('../middleware.ts',{
  'next/server':{NextResponse},'next-auth/jwt':{getToken:async()=>null},
  './i18n':{locales:['en','id'],defaultLocale:'en'},'./lib/demo-environment':{isDemoHost:()=>false},
  './lib/wmp-domain':load('../lib/wmp-domain.ts'),'./lib/public-route-aliases':aliases,
}).default;
async function request(path,host='wmp.dagangos.com',language='en') {
  const url=new URL(path,'https://'+host);url.clone=()=>new URL(url);
  return middleware({nextUrl:url,headers:new Headers({host,'x-forwarded-proto':'https','accept-language':language})});
}
test('old pricing and business addresses reach canonical public pages in both locales',async()=>{
  for(const locale of ['en','id'])for(const [path,target] of [['pricing','shop'],['business','about']]) {
    const response=await request(`/${locale}/${path}?source=old-link`);assert.equal(response.status,308);assert.equal(response.headers.get('location'),`https://wmp.dagangos.com/${locale}/site/${target}?source=old-link`);
  }
});
test('registration keeps the selected locale and payment callback',async()=>{
  const response=await request('/id/register?callbackUrl=%2Fid%2Fproject-setup');assert.equal(response.status,307);assert.equal(response.headers.get('location'),'https://wmp.dagangos.com/id/auth/register?callbackUrl=%2Fid%2Fproject-setup');
});
test('refund links reach the published policy',async()=>{
  const response=await request('/en/refund-policy');assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://wmp.dagangos.com/en/site/refund');
});
test('tenant CMS slugs are preserved and reserved product hosts remain outside WMP',async()=>{
  const tenant=await request('/id/pricing','sample.wmp.dagangos.com');assert.equal(tenant.headers.get('location'),null);assert.equal(tenant.headers.get('x-middleware-rewrite'),'https://sample.wmp.dagangos.com/id/site/pricing');
  for(const host of ['store.dagangos.com','shop.dagangos.com']) {const response=await request('/id/pricing',host);assert.equal(response.status,404);assert.equal(response.headers.get('location'),null);}
});
test('unknown pages and protected admin routing retain their existing behavior',async()=>{
  const missing=await request('/en/definitely-not-real');assert.equal(missing.headers.get('x-middleware-rewrite'),'https://wmp.dagangos.com/en/site/definitely-not-real');
  const admin=await request('/en/admin');assert.equal(admin.status,307);assert.match(admin.headers.get('location'),/\/en\/auth\/login\?callbackUrl=/);
});
