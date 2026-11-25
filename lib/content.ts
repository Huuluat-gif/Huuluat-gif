import { getSQL } from './db';
import { HttpError } from './api';
import { type ContentKind, schemaFor } from './validation';
import { getCommerceStatus } from './commerce';
export type ContentItem=Record<string,unknown> & {id:string,status:string};
export function adminItem(item:Record<string,unknown>){const {chapters,...metadata}=item;return{...metadata,...(Array.isArray(chapters)?{chapterCount:chapters.length}:{})};}
export function publicItem(row:Record<string,unknown>,entitled=false):ContentItem{
 const d:Record<string,unknown>={...(row.data as Record<string,unknown>),id:String(row.id),status:String(row.status)};
 const output:Record<string,unknown>={...d};
 if(d.coverAssetId)output.cover=`/api/assets/${d.coverAssetId}`;
 if(d.assetId)output.url=`/api/assets/${d.assetId}`;
 if(d.pdfAssetId)output.pdfUrl=`/api/assets/${d.pdfAssetId}`;
 if(d.access==='member'&&!entitled){delete output.chapters;delete output.pdfUrl;delete output.url;delete output.youtubeId;delete output.youtubeUrl;output.locked=true;}
 if(row.kind==='books')output.canRead=d.access!=='member'||entitled;
 return output as ContentItem;
}
export async function validateAssets(kind:ContentKind,item:Record<string,unknown>,ownerId:string){
 const wanted:Array<[string,string]> = kind==='books'?[['coverAssetId','image'],['pdfAssetId','pdf']]:kind==='tracks'?[['coverAssetId','image'],['assetId','audio']]:kind==='videos'?[['coverAssetId','image'],['assetId','video']]:[];
 const sql=getSQL();
 for(const [field,type] of wanted){const id=item[field];if(!id)continue;const rows=await sql`SELECT owner_id,kind FROM lowf_assets WHERE id=${String(id)}::uuid`;if(!rows[0]||(rows[0].owner_id!==ownerId&&rows[0].owner_id!=='system')||rows[0].kind!==type)throw new HttpError(400,`Tệp ${field} chưa hợp lệ hoặc chưa được tải lên.`);}
 if(item.status==='published'&&(kind==='tracks'||(kind==='videos'&&item.sourceKind!=='youtube'))&&!item.assetId)throw new HttpError(400,'Cần tải tệp âm thanh hoặc video trước khi xuất bản.');
 if(kind==='videos'&&item.sourceKind==='youtube'&&item.status==='published'&&!item.youtubeId)throw new HttpError(400,'Cần đường dẫn YouTube hợp lệ.');
 if(item.status==='published'&&kind==='books'&&item.format!=='Sách giấy'&&!item.pdfAssetId&&(!Array.isArray(item.chapters)||item.chapters.length===0))throw new HttpError(400,'Cần file PDF hoặc nội dung chương trước khi xuất bản ebook.');
 if(kind==='plans'&&item.enabled===true&&Number(item.price)>0&&!(await getCommerceStatus()).enabled)throw new HttpError(409,'Cần cấu hình VNPAY hoạt động thật trước khi mở gói trả phí.');
}
export function normalizeItem(kind:ContentKind,body:unknown):Record<string,unknown>{
 const item=schemaFor(kind).parse(body) as Record<string,unknown>;
 if(kind==='videos'&&item.sourceKind==='youtube'){
  // A draft may be saved before its video link is ready. Published videos still
  // require a validated ID in validateAssets; never retain an old ID after clearing.
  delete item.assetId;delete item.youtubeId;
  if(!String(item.youtubeUrl||'').trim()){item.youtubeUrl='';return item;}
  let parsed:URL;try{parsed=new URL(String(item.youtubeUrl||''));}catch{throw new HttpError(400,'Hãy dán đường dẫn YouTube hợp lệ.');}
  if(parsed.protocol!=='https:'||parsed.port||parsed.username||parsed.password)throw new HttpError(400,'Đường dẫn YouTube cần dùng HTTPS.');
  const host=parsed.hostname.toLowerCase(),parts=parsed.pathname.split('/').filter(Boolean);
  const allowed=['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be'];
  const candidate=host==='youtu.be'?parts[0]:parts[0]==='watch'?parsed.searchParams.get('v'):['shorts','embed','live'].includes(parts[0])?parts[1]:null;
  if(!allowed.includes(host)||!candidate||!/^[A-Za-z0-9_-]{11}$/.test(candidate))throw new HttpError(400,'Link cần trỏ đến một video YouTube cụ thể.');
  item.youtubeId=candidate;item.youtubeUrl=`https://www.youtube.com/watch?v=${candidate}`;delete item.assetId;
 }else if(kind==='videos'){delete item.youtubeId;delete item.youtubeUrl;}
 if(kind==='plans'&&item.status!=='published')item.enabled=false;
 if(kind==='books'&&item.saleEnabled===true&&(Number(item.price)<=0||item.format==='Ebook Free'))throw new HttpError(400,'Sách mở bán cần giá lớn hơn 0 và định dạng Ebook, Sách giấy hoặc Combo.');
 if(kind==='books'&&item.cover){const s=String(item.cover);if(!/^data:image\/svg\+xml(?:;charset=[^,]+)?,/i.test(s)&&!/^\/api\/assets\/[a-f0-9-]{36}$/i.test(s))throw new HttpError(400,'Ảnh bìa cần được tải lên bằng mục tệp.');}
 return item;
}
