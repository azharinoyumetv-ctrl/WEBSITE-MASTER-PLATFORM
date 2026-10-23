import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const valid={DEMO_MODE:'true',DATABASE_URL:'postgresql://wmp_demo:sample@127.0.0.1:5432/wmp_product_demo',NEXTAUTH_URL:'https://demo.dagangos.com',NEXTAUTH_SECRET:'test-only'};
function load(path,deps,env) {
  const exports={};
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>Object.hasOwn(deps,name)?deps[name]:require(name),process:{env},URL,URLSearchParams,Buffer,Date,Set,console});
  return exports;
}
test('demo requires its own origin, database and restricted database role',()=>{
  assert.equal(load('../lib/demo-environment.ts',{},valid).isDemoEnvironment(),true);
  for(const change of [{DEMO_MODE:'false'},{DATABASE_URL:'postgresql://wmp_demo:x@127.0.0.1:5432/production'},{DATABASE_URL:valid.DATABASE_URL.replace('wmp_demo:','postgres:')},{DATABASE_URL:valid.DATABASE_URL.replace('127.0.0.1','db.example.com')},{NEXTAUTH_URL:'https://wmp.dagangos.com'}]) assert.equal(load('../lib/demo-environment.ts',{}, {...valid,...change}).isDemoEnvironment(),false);
});
function fixture(env=valid) {
  const state={creates:0,cookie:null};
  class NextResponse extends Response {
    constructor(body,init){super(body,init);this.cookies={set:(...args)=>{state.cookie=args;}};}
    static redirect(url,status){return new NextResponse(null,{status,headers:{location:String(url)}});}
  }
  const route=load('../app/api/demo/session/route.ts',{
    'next/server':{NextResponse},'next-auth/jwt':{encode:async()=> 'signed-test-token'},'next-auth':{getServerSession:async()=>null},
    '@/lib/prisma':{__esModule:true,default:{tenantRefreshToken:{create:async()=>{}}}},'@/lib/auth':{authOptions:{}},
    '@/lib/demo-environment':load('../lib/demo-environment.ts',{},env),
    '@/lib/demo-workspace':{createDemoWorkspace:async()=>{state.creates++;return {tenant:{id:'sample-a',subdomain:'demo-sample'},user:{id:'visitor-a',email:'sample@example.com',tokenVersion:0},role:{name:'Demo Operator'}};}},
    '@/lib/constants/packages':{packages:{ecommerce:{}}},'@/lib/rate-limit':{checkRateLimit:async()=>({limited:false})},
  },env);
  return {state,post:(body='package=ecommerce&locale=en&destination=dashboard',headers={})=>route.POST(new Request('https://demo.dagangos.com/api/demo/session',{method:'POST',headers:{host:'demo.dagangos.com',origin:'https://demo.dagangos.com','content-type':'application/x-www-form-urlencoded',...headers},body}))};
}
test('production, wrong host and foreign origin cannot create demo users',async()=>{
  for(const [env,headers,status] of [[{...valid,DEMO_MODE:'false'},{},404],[valid,{host:'wmp.dagangos.com'},404],[valid,{origin:'https://evil.example'},403]]) {const f=fixture(env);assert.equal((await f.post(undefined,headers)).status,status);assert.equal(f.state.creates,0);}
});
test('unknown packages, external destinations and oversized forms are rejected before database writes',async()=>{
  for(const [body,status] of [['package=__proto__',400],['package=ecommerce&destination=https://evil.example',400],['x'.repeat(2049),413]]) {const f=fixture();assert.equal((await f.post(body)).status,status);assert.equal(f.state.creates,0);}
});
test('demo starts actual admin with a secure host-only session cookie',async()=>{
  const f=fixture(),response=await f.post();assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://demo.dagangos.com/en/admin/dashboard');assert.equal(f.state.creates,1);
  const [name,,options]=f.state.cookie;assert.equal(name,'__Secure-next-auth.session-token');assert.equal(options.httpOnly,true);assert.equal(options.secure,true);assert.equal(options.sameSite,'lax');assert.equal(options.domain,undefined);assert.equal(options.maxAge,3600);
});
