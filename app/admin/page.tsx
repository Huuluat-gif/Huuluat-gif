import type { Metadata } from 'next';
import { notFound,redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import AdminStudio from './studio';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Lowf Studio',robots:{index:false,follow:false}};
export default async function AdminPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,query=new URLSearchParams();
 if(typeof params.tab==='string'&&['overview','books','tracks','videos','plans','design','payments','orders','auth'].includes(params.tab))query.set('tab',params.tab);
 if(typeof params.action==='string'&&['add','new'].includes(params.action))query.set('action','add');
 const next='/admin'+(query.size?'?'+query.toString():'');
 const user=await getUser();
 if(!user)redirect('/?auth=login&next='+encodeURIComponent(next));
 if(!user.emailVerified)redirect('/?auth=verify&next='+encodeURIComponent(next));
 if(!user.isAdmin)notFound();
 return <AdminStudio environment={process.env.VERCEL_ENV==='preview'?'preview':'production'}/>;
}
