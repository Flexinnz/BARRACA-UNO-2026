import {NextResponse,type NextRequest} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {authConfig} from './lib/supabase';
export async function proxy(request:NextRequest){let response=NextResponse.next({request});const config=authConfig();if(!config)return response;
const client=createServerClient(config.url,config.key,{cookieOptions:{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',path:'/'},cookies:{getAll:()=>request.cookies.getAll(),setAll:items=>{items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
await client.auth.getUser();response.headers.set('Cache-Control','private, no-store');return response;}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|products/|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
