import { config } from 'dotenv';
import { getSQL } from '../lib/db';
import { readerSchemaStatements } from '../lib/reader/schema';
config({path:'.env.local',quiet:true});
async function main(){const sql=getSQL();for(const statement of readerSchemaStatements)await sql.query(statement,[]);console.log('Reader notes, highlights, pen strokes and vocabulary tables initialized. No personal data seeded.');}
main().catch(error=>{console.error('Reader initialization failed:',error instanceof Error?error.name:'UnknownError');process.exitCode=1;});
