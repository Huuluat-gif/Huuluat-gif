import { json,route } from '@/lib/api';
function plain(value:unknown){return String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
export const GET=route(async()=>{
 const response=await fetch('https://public-api.wordpress.com/wp/v2/sites/245923143/posts?per_page=12&_fields=id,link,date,title,excerpt',{next:{revalidate:300},signal:AbortSignal.timeout(12000)});
 if(!response.ok)return json({posts:[],available:false,site:'https://allvns04.wordpress.com'});
 const posts=await response.json() as Array<{id:number;link:string;date:string;title:{rendered:string};excerpt:{rendered:string}}>;
 return json({posts:posts.map(p=>({id:p.id,url:p.link,title:plain(p.title.rendered),excerpt:plain(p.excerpt.rendered).slice(0,500),date:p.date})),available:true,site:'https://allvns04.wordpress.com'});
});
