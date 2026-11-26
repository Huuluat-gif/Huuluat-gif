import { z } from 'zod';
export const contentKinds = ['books','tracks','videos','plans'] as const;
export const contentKindSchema = z.enum(contentKinds);
export type ContentKind = z.infer<typeof contentKindSchema>;
export const idSchema=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/);
const text=(n:number)=>z.string().trim().max(n);
const assetId=z.union([z.uuid(),z.literal('')]).optional();
const status=z.enum(['draft','published','archived']);
const access=z.enum(['free','member']);
// Optional source fields are sent as empty strings by the editor. Zod can run
// refinements on an invalid URL, so never let URL construction throw here.
const url=z.union([z.literal(''),z.url().refine(s=>{try{return new URL(s).protocol==='https:';}catch{return false;}},'Chỉ chấp nhận HTTPS')]);
const chapter=z.object({title:text(160),paragraphs:z.array(text(12000)).max(100)}).strict();
export const bookSchema=z.object({id:idSchema.optional(),title:text(160).min(1),author:text(120).min(1),category:z.enum(['kinhte','vanhocvn','vanhocqt','dacbiet']),format:z.enum(['Ebook Free','Ebook','Sách giấy','Combo']),price:z.number().int().min(0).max(1000000000),saleEnabled:z.boolean().optional().default(false),description:text(5000),cover:text(200000).optional(),coverAssetId:assetId,pdfAssetId:assetId,access,status,language:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).optional(),sourceUrl:url.optional(),licenseLabel:text(500).optional(),chapters:z.array(chapter).max(500).optional(),note:text(1000).optional()}).strict();
export const mediaSchema=z.object({id:idSchema.optional(),title:text(160).min(1),artist:text(120).optional(),description:text(5000).optional(),assetId:assetId,coverAssetId:assetId,license:text(500),licenseUrl:url.optional(),source:url,attribution:text(2000),durationSeconds:z.number().min(0).max(86400).optional(),access:access.optional().default('free'),status}).strict();
export const videoSchema=mediaSchema.extend({sourceKind:z.enum(['upload','youtube']).optional().default('upload'),youtubeUrl:url.optional(),youtubeId:z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),license:text(500).optional().default(''),source:url.optional().default(''),attribution:text(2000).optional().default('')}).strict();
export const planSchema=z.object({id:idSchema.optional(),name:text(100).min(1),description:text(2000),price:z.number().int().min(0).max(100000000),interval:z.enum(['month','year','once']),features:z.array(text(160)).max(15),enabled:z.boolean(),status:status.optional().default('published')}).strict();
export const designSchema=z.object({
 brand:z.object({name:text(40).min(1),tagline:text(100)}).strict(),
 palette:z.object({primary:z.string().regex(/^#[a-fA-F0-9]{6}$/),background:z.string().regex(/^#[a-fA-F0-9]{6}$/),surface:z.string().regex(/^#[a-fA-F0-9]{6}$/),text:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).strict(),
 hero:z.object({title:text(160),subtitle:text(500),ctaLabel:text(60),ctaView:z.enum(['library','store','studio','pdf','community','profile','membership','reviews']),imageAssetId:assetId}).strict(),
 sections:z.array(z.enum(['hero','stats','continue','books','ambient','deal'])).max(6).refine(a=>new Set(a).size===a.length,'Không lặp mục'),font:z.enum(['serif','sans']),radius:z.number().int().min(8).max(32),featuredBookIds:z.array(idSchema).max(12),
 decor:z.object({preset:text(40).optional(),season:z.enum(['classic','spring','summer','autumn','winter','festive']).optional(),fxLevel:z.enum(['off','gentle','vivid']).optional(),stars:z.enum(['off','soft','bright']).optional(),petals:z.boolean().optional(),aurora:z.boolean().optional(),paperGrain:z.boolean().optional(),cardStyle:z.enum(['hardcover','glass','minimal']).optional()}).strict().optional()
}).strict();
export const defaultDesign=designSchema.parse({brand:{name:'Lowf',tagline:'BOOK & BEYOND'},palette:{primary:'#b84568',background:'#fcf6f7',surface:'#fffdfd',text:'#2c1c23'},hero:{title:'Giữa bộn bề,\ntìm một trang yên.',subtitle:'Những cuốn sách hay, một bản nhạc dịu. Và khoảng thời gian dành riêng cho bạn.',ctaLabel:'Khám phá thư viện',ctaView:'library'},sections:['hero','stats','continue','books','ambient','deal'],font:'serif',radius:18,featuredBookIds:['slow','garden','peace','clear'],decor:{preset:'spring',season:'spring',fxLevel:'vivid',stars:'bright',petals:true,aurora:true,paperGrain:true,cardStyle:'hardcover'}});
export type DesignSettings=z.infer<typeof designSchema>;
export function schemaFor(kind:ContentKind) {return kind==='books'?bookSchema:kind==='plans'?planSchema:kind==='videos'?videoSchema:mediaSchema;}
