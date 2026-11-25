import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { getSQL } from '../lib/db';
import { defaultDesign } from '../lib/validation';
async function main(){
const sql=getSQL();
const statements=[
`CREATE TABLE IF NOT EXISTS lowf_profiles(user_id text PRIMARY KEY,display_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS lowf_content(kind text NOT NULL CHECK(kind IN ('books','tracks','videos','plans')),id text NOT NULL,data jsonb NOT NULL,status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(kind,id))`,
`CREATE TABLE IF NOT EXISTS lowf_assets(id uuid PRIMARY KEY,owner_id text NOT NULL,pathname text NOT NULL UNIQUE,kind text NOT NULL CHECK(kind IN ('image','pdf','audio','video')),content_type text NOT NULL,byte_size bigint NOT NULL CHECK(byte_size>0),original_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS lowf_user_data(user_id text PRIMARY KEY,saved jsonb NOT NULL DEFAULT '[]',progress jsonb NOT NULL DEFAULT '{}',updated_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS lowf_reading_days(user_id text NOT NULL,day date NOT NULL,seconds integer NOT NULL DEFAULT 0 CHECK(seconds>=0 AND seconds<=86400),PRIMARY KEY(user_id,day))`,
`CREATE TABLE IF NOT EXISTS lowf_reading_clock(user_id text PRIMARY KEY,session_id uuid NOT NULL,last_ping timestamptz NOT NULL DEFAULT now(),active boolean NOT NULL DEFAULT false)`,
`CREATE TABLE IF NOT EXISTS lowf_messages(id uuid PRIMARY KEY,user_id text NOT NULL,text text NOT NULL CHECK(char_length(text) BETWEEN 1 AND 500),created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE INDEX IF NOT EXISTS lowf_messages_created_idx ON lowf_messages(created_at DESC)`,
`CREATE TABLE IF NOT EXISTS lowf_memberships(user_id text PRIMARY KEY,plan_id text NOT NULL,status text NOT NULL DEFAULT 'active',access text NOT NULL DEFAULT 'free' CHECK(access IN ('free','member')),expires_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS lowf_design_versions(id uuid PRIMARY KEY,settings jsonb NOT NULL,status text NOT NULL CHECK(status IN ('draft','published','historical')),created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE UNIQUE INDEX IF NOT EXISTS lowf_single_published_design ON lowf_design_versions(status) WHERE status='published'`,
`CREATE INDEX IF NOT EXISTS lowf_content_status_idx ON lowf_content(kind,status)`,
`CREATE TABLE IF NOT EXISTS lowf_rate_limits(key text PRIMARY KEY,hits integer NOT NULL,reset_at timestamptz NOT NULL)`
];
for(const statement of statements)await sql.query(statement,[]);
const context={window:{} as {BOOKS?:Array<Record<string,unknown>>}};
vm.runInNewContext(await readFile('scripts/data/catalog.js','utf8'),context,{timeout:1000});
for(const original of context.window.BOOKS||[]){
 const {rating,readers,oldPrice,tag,...book}=original;
 const data={...book,access:'free',status:'published',note:'Nội dung, bìa và tác giả minh họa do Lowf biên soạn. Đọc miễn phí; chưa mở bán sản phẩm mẫu.'};
 await sql`INSERT INTO lowf_content(kind,id,data,status) VALUES('books',${String(book.id)},${JSON.stringify(data)}::jsonb,'published') ON CONFLICT(kind,id) DO NOTHING`;
}
const plans=[{id:'free',name:'Lowf Free',description:'Một nơi để bắt đầu thói quen đọc mỗi ngày.',price:0,interval:'once',features:['Tài khoản và kệ sách đồng bộ','Đọc sách miễn phí','Nhạc nền và cộng đồng'],enabled:true,status:'published'},{id:'plus',name:'Lowf Plus',description:'Đang chuẩn bị. Chưa mở đăng ký trả phí.',price:49000,interval:'month',features:['Thư viện dành cho hội viên','Đọc sách mở rộng'],enabled:false,status:'draft'}];
for(const p of plans)await sql`INSERT INTO lowf_content(kind,id,data,status) VALUES('plans',${p.id},${JSON.stringify(p)}::jsonb,${p.status}) ON CONFLICT(kind,id) DO NOTHING`;
await sql`INSERT INTO lowf_design_versions(id,settings,status,created_by) SELECT gen_random_uuid(),${JSON.stringify(defaultDesign)}::jsonb,'published','system' WHERE NOT EXISTS(SELECT 1 FROM lowf_design_versions WHERE status='published')`;
console.log('Lowf database initialized: schema, original sample books, free plan, disabled paid-plan draft and published design. No users, activity, messages or orders seeded.');

}
main().catch(error=>{console.error("Database initialization failed",error instanceof Error?error.name:"UnknownError");process.exitCode=1;});
