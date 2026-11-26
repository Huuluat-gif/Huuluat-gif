const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public');
const lucide=require('lucide');
const source=fs.readFileSync(path.join(dir,'lowf.html'),'utf8')+fs.readFileSync(path.join(dir,'lowf.js'),'utf8');
const names=new Set([...source.matchAll(/(?:data-lucide=["']|icon\(["'])([a-z0-9-]+)/g)].map(x=>x[1]));
['piano','cloud-rain','disc-3','play','pause','check','leaf','sparkles','book-open','user-round','wifi-off','file-warning','notebook-pen','clapperboard','eye','eye-off'].forEach(n=>names.add(n));
const nodes={};for(const name of names){const key=name.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join('');if(lucide.icons[key])nodes[name]=lucide.icons[key];else throw new Error('Missing icon '+name)}
const runtime=`/* Lucide Icons, ISC license. Copyright Lucide Contributors. */\n(()=>{const nodes=${JSON.stringify(nodes)};window.lucide={createIcons(){document.querySelectorAll('[data-lucide]').forEach(el=>{const name=el.dataset.lucide;if(!nodes[name])return;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [key,value]of Object.entries({xmlns:'http://www.w3.org/2000/svg',width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round',class:'lucide lucide-'+name+' '+(el.getAttribute('class')||''),'aria-hidden':'true'}))svg.setAttribute(key,value);nodes[name].forEach(([tag,attrs])=>{const item=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([key,value])=>item.setAttribute(key,value));svg.append(item)});el.replaceWith(svg)})}}})();`;
fs.writeFileSync(path.join(dir,'icons.js'),runtime);
console.log('Bundled '+names.size+' public icon nodes.');
