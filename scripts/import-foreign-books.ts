import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from 'dotenv';
import { bookSchema } from '../lib/validation';
import { getSQL } from '../lib/db';

/** Imports only complete, attributed public-domain titles; never overwrites owner edits. */
async function main() {
  const args=process.argv.slice(2),dryRun=args.includes('--dry-run');
  const filename=args.find(arg=>!arg.startsWith('--'))||path.resolve(process.cwd(),'../foreign-books/catalog.json');
  const input:unknown=JSON.parse(await readFile(filename,'utf8'));
  if(!Array.isArray(input)||input.length<1||input.length>50)throw new Error('Expected a bounded foreign-books catalog.');
  const books=input.map(item=>bookSchema.parse(item));
  const ids=new Set<string>();
  for(const book of books){
    if(!book.id?.startsWith('en-')||ids.has(book.id))throw new Error('Each source book needs a unique English catalog ID.');
    ids.add(book.id);
    if(book.language!=='en'||book.status!=='published'||book.access!=='free'||book.format!=='Ebook Free'||book.price!==0||book.saleEnabled!==false)throw new Error('Catalog import only accepts free published English books.');
    if(!book.sourceUrl?.startsWith('https://standardebooks.org/ebooks/')||!book.licenseLabel?.includes('CC0'))throw new Error('Source and license attribution are required.');
    if(!book.chapters?.length)throw new Error('Full chapter text is required.');
    const words=book.chapters.reduce((total,chapter)=>total+chapter.paragraphs.reduce((count,paragraph)=>count+paragraph.split(/\s+/u).length,0),0);
    if(words<20000)throw new Error('Expected a complete book, not a short excerpt.');
    console.log('Validated:',book.title,`(${book.chapters.length} reading sections; ${words.toLocaleString('en-US')} words)`);
  }
  if(dryRun){console.log('Dry run complete:',books.length,'books; no database writes.');return;}
  config({path:'.env.local',quiet:true});
  const sql=getSQL();let added=0;
  for(const book of books){
    const rows=await sql`INSERT INTO lowf_content(kind,id,data,status) VALUES('books',${book.id!},${JSON.stringify(book)}::jsonb,'published') ON CONFLICT(kind,id) DO NOTHING RETURNING id`;
    added+=rows.length;console.log(rows.length?'Imported:':'Already present; preserved:',book.title);
  }
  console.log('Foreign catalog import complete:',added,'added;',books.length-added,'existing books preserved.');
}
main().catch(error=>{console.error('Foreign catalog import failed:',error instanceof Error?error.name:'UnknownError');process.exitCode=1;});
