const fs=require('node:fs'),path=require('node:path'),{zipSync,strToU8}=require('fflate');
const root=path.resolve(__dirname,'..'),files={};
const roots=['app','lib','public','scripts','tests'];
const top=['package.json','package-lock.json','tsconfig.json','next.config.ts','next-env.d.ts','README.md','AGENTS.md','.gitignore','.vercelignore'];
const extensions=new Set(['.ts','.tsx','.js','.mjs','.cjs','.css','.html','.json','.md','.txt']);
function add(relative){
 const filename=path.join(root,relative),stat=fs.lstatSync(filename);
 if(stat.isSymbolicLink())throw new Error('Source archive does not follow symbolic links.');
 if(stat.isDirectory()){for(const name of fs.readdirSync(filename).sort()){if(name.startsWith('.')||name==='node_modules'||name==='private-generated')continue;add(path.posix.join(relative,name));}return;}
 if(!stat.isFile()||(!top.includes(relative)&&!extensions.has(path.extname(relative))))return;
 if(stat.size>5*1024*1024)throw new Error('Unexpected large source file.');
 files['lowf-source/'+relative]=new Uint8Array(fs.readFileSync(filename));
}
for(const dir of roots)if(fs.existsSync(path.join(root,dir)))add(dir);
for(const file of top)if(fs.existsSync(path.join(root,file)))add(file);
files['lowf-source/SOURCE-SNAPSHOT.txt']=strToU8('Source snapshot of this Lowf deployment. Runtime environment values, payment credentials, database records and uploaded media are not included.\nGenerated: '+new Date().toISOString()+'\n');
const output=path.join(root,'private-generated');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'lowf-source.zip'),zipSync(files,{level:6}));
console.log('Packaged owner source backup:',Object.keys(files).length,'files.');
