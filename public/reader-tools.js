/* Private reading tools. Text anchors use UTF-16 offsets in the complete reader
   textContent, including chapter labels/headings. Quotes are a safe fallback when
   a publisher edits a chapter. PDF ink uses normalized page coordinates. */
(() => {
  'use strict';
  const bridge=window.LowfReaderBridge;
  if(!bridge)return;
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reader=$('#reader'),workspace=$('.reader-workspace',reader),scroll=$('#readerScroll');
  const colors={yellow:'Vàng',green:'Xanh lá',pink:'Hồng',blue:'Xanh dương'};
  const inkColors={yellow:'#ab7408',green:'#347353',pink:'#bb507a',blue:'#386ca9'};
  const languages={en:'Tiếng Anh',vi:'Tiếng Việt',fr:'Tiếng Pháp',de:'Tiếng Đức',es:'Tiếng Tây Ban Nha',it:'Tiếng Ý',pt:'Tiếng Bồ Đào Nha',ja:'Tiếng Nhật',ko:'Tiếng Hàn',zh:'Tiếng Trung',ru:'Tiếng Nga'};
  let context=bridge.getContext(),contextKey='',userKey='',annotationEpoch=0,lookupEpoch=0;
  let annotations=[],annotationMore=false,annotationOffset=0,annotationLoading=false;
  let selected=null,editId=null,color='yellow',translation=null,penMode=false,drawing=null,pen=null;
  let words=[],wordOffset=0,wordsMore=false,wordLoading=false,wordsLoadedFor='',vocabularyEpoch=0;
  const uid=()=>String(bridge.getContext().user?.id||'');
  const key=c=>[c.bookId,c.chapter,c.page,String(c.user?.id||'')].join('|');
  const samePage=a=>a.bookId===context.bookId&&a.chapter===context.chapter&&a.page===context.page;
  const textRoot=()=>context.type==='chapters'?$('#readerBody'):$('#pdfTextLayer');
  const stage=()=>context.type==='chapters'?$('#readerTextStage'):$('#pdfPageStage');
  const own=()=>{if(uid())return true;bridge.requestAuth();return false;};
  const locationLabel=()=>context.type==='chapters'?`Chương ${context.chapter+1}`:`Trang ${context.page}`;
  const toolButton=(action,text,extra='')=>`<button type="button" data-reader-tool="${action}" ${extra}>${text}</button>`;
  const ribbon=document.createElement('div');ribbon.className='reader-tool-ribbon';
  ribbon.setAttribute('aria-label','Công cụ đọc sách');
  ribbon.innerHTML=toolButton('notes','<span aria-hidden="true">▤</span> Ghi chú')+toolButton('translate','<span aria-hidden="true">Aあ</span> Dịch & IPA')+toolButton('speech','<span aria-hidden="true">◖</span> Nghe đọc')+toolButton('pen','<span aria-hidden="true">✎</span> Bút', 'aria-pressed="false"')+toolButton('vocabulary','Từ đã lưu');
  workspace.before(ribbon);
  const panel=document.createElement('aside');panel.className='reader-tools-panel';panel.hidden=true;panel.dataset.readerPanel='';panel.setAttribute('aria-label','Ghi chú, dịch và nghe sách');
  panel.innerHTML=`<div class="reader-tools-heading"><div><small>KHÔNG GIAN CỦA RIÊNG BẠN</small><h2>Bên lề trang sách</h2></div>${toolButton('panel-close','×','class="reader-tool-close" aria-label="Đóng công cụ"')}</div><div class="reader-tools-tabs" role="tablist" aria-label="Công cụ đọc"><button role="tab" id="rt-tab-notes" aria-controls="rt-pane-notes" data-reader-tool="notes" aria-selected="true">Ghi chú</button><button role="tab" id="rt-tab-translate" aria-controls="rt-pane-translate" data-reader-tool="translate" aria-selected="false">Dịch</button><button role="tab" id="rt-tab-speech" aria-controls="rt-pane-speech" data-reader-tool="speech" aria-selected="false">Nghe</button><button role="tab" id="rt-tab-vocabulary" aria-controls="rt-pane-vocabulary" data-reader-tool="vocabulary" aria-selected="false">Từ vựng</button></div><div id="rt-pane-notes" class="reader-tool-pane" role="tabpanel" aria-labelledby="rt-tab-notes"><div class="reader-location"></div><p class="reader-tool-help">Bôi chọn một đoạn để highlight hoặc ghi lại suy nghĩ của bạn. Ghi chú chỉ hiển thị với tài khoản của bạn.</p><div class="reader-quote" id="readerQuote" hidden></div><div class="reader-colors" role="group" aria-label="Màu đánh dấu">${Object.entries(colors).map(([c,label])=>toolButton('color',`<span class="reader-color-dot ${c}"></span><span class="sr-only">${label}</span>`,`data-color="${c}" aria-label="${label}" aria-pressed="${c===color}"`)).join('')}</div><label class="reader-field">Ghi chú của bạn<textarea id="readerNote" maxlength="4000" rows="4" placeholder="Một ý tưởng đáng giữ lại…"></textarea></label><div class="reader-tool-actions">${toolButton('note-save','Lưu ghi chú','class="reader-primary"')}${toolButton('note-clear','Bỏ chọn')}</div><p class="reader-tool-status" id="noteStatus" role="status"></p><div class="reader-pen-controls"><div><strong>Viết tay trên trang</strong><small>Dùng chuột, ngón tay hoặc bút cảm ứng.</small></div><div class="reader-tool-actions">${toolButton('pen-toggle','Bật bút','aria-pressed="false"')}${toolButton('pen-undo','Hoàn tác nét')}</div><p class="reader-tool-help" id="penStatus">Tắt bút để cuộn trang và chọn văn bản.</p><p class="reader-tool-help">Nét bút gắn theo vị trí trang. Highlight bám theo văn bản khi đổi cỡ chữ.</p></div><div class="reader-notes-heading"><h3>Ghi chú trang này</h3><span id="readerNoteCount">0</span></div><div id="readerNotes"></div><button type="button" data-reader-tool="notes-more" id="notesMore" hidden>Xem thêm ghi chú của sách</button></div><div id="rt-pane-translate" class="reader-tool-pane" role="tabpanel" aria-labelledby="rt-tab-translate" hidden><p class="reader-tool-help">Chọn từ hoặc đoạn ngắn trong sách. Bạn cũng có thể nhập nội dung bên dưới. IPA được tra cho từng từ tiếng Anh khi từ điển có dữ liệu.</p><label class="reader-field">Từ / đoạn cần dịch<textarea id="translateText" maxlength="500" rows="3" placeholder="Ví dụ: curiosity"></textarea></label><small class="reader-byte-count" id="translationLimit">0 / 500 byte</small><div class="reader-language-fields"><label class="reader-field">Từ<select id="translateSource">${Object.entries(languages).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><label class="reader-field">Sang<select id="translateTarget">${Object.entries(languages).map(([v,t])=>`<option value="${v}" ${v==='vi'?'selected':''}>${t}</option>`).join('')}</select></label></div>${toolButton('lookup','Dịch đoạn đã chọn','class="reader-primary reader-wide"')}<p id="translationStatus" class="reader-tool-status" role="status"></p><div id="translationResult" class="reader-translation-result" hidden></div><p class="reader-tool-help reader-provider-note">Dịch bằng MyMemory; IPA tiếng Anh từ CMU/ipa-dict và Free Dictionary. Chỉ đoạn bạn bấm dịch được gửi đi. Bản dịch tự động có thể chưa sát ngữ cảnh.</p></div><div id="rt-pane-speech" class="reader-tool-pane" role="tabpanel" aria-labelledby="rt-tab-speech" hidden><p class="reader-tool-help">Nghe chương / trang đang mở bằng giọng có sẵn trên thiết bị. Đổi chương sẽ dừng giọng đọc.</p><div id="readerSpeech"></div></div><div id="rt-pane-vocabulary" class="reader-tool-pane" role="tabpanel" aria-labelledby="rt-tab-vocabulary" hidden><p class="reader-tool-help">Từ bạn chủ động lưu khi đọc, đồng bộ theo tài khoản.</p><div class="reader-vocabulary-host"></div></div>`;
  workspace.append(panel);
  const selectionBar=document.createElement('div');selectionBar.className='reader-selection-bar';selectionBar.hidden=true;selectionBar.setAttribute('role','toolbar');selectionBar.setAttribute('aria-label','Thao tác với đoạn đã chọn');selectionBar.innerHTML=toolButton('highlight','Highlight')+toolButton('selection-note','Ghi chú')+toolButton('selection-translate','Dịch & IPA');reader.append(selectionBar);
  const vocabularyDialog=document.createElement('dialog');vocabularyDialog.id='vocabularyDialog';vocabularyDialog.className='reader-vocabulary-dialog';vocabularyDialog.setAttribute('aria-labelledby','vocabularyTitle');vocabularyDialog.innerHTML=`<div class="reader-tools-heading"><div><small>GÓP NHẶT MỖI NGÀY</small><h2 id="vocabularyTitle">Sổ từ vựng của tôi</h2></div>${toolButton('vocabulary-close','×','class="reader-tool-close" aria-label="Đóng sổ từ vựng"')}</div><p class="reader-tool-help">Đọc một cuốn sách, mang theo một vài từ mới.</p><div class="reader-vocabulary-host"></div>`;document.body.append(vocabularyDialog);
  const speech=window.LowfSpeech?.mount($('#readerSpeech'),()=>bridge.getContext());
  function status(id,message,error=false){const node=$(id);node.textContent=message;node.classList.toggle('reader-error',error);}
  function setTab(name){
    if(penMode&&name!=='notes')setPenMode(false);
    panel.hidden=false;reader.classList.add('tools-open');
    $$('[role=tab]',panel).forEach(n=>{const active=n.dataset.readerTool===name;n.setAttribute('aria-selected',String(active));n.tabIndex=active?0:-1;});
    $$('.reader-tool-pane',panel).forEach(n=>n.hidden=n.id!=='rt-pane-'+name);
    $$('button',ribbon).forEach(n=>n.classList.toggle('active',n.dataset.readerTool===name));
    if(name==='speech')speech?.refresh();
    if(name==='vocabulary')loadVocabulary();
  }
  function hidePanel(){panel.hidden=true;reader.classList.remove('tools-open');$$('button',ribbon).forEach(n=>n.classList.remove('active'));}
  function noteSelection(value){selected=value;editId=null;$('#readerQuote').hidden=!value?.quote;$('#readerQuote').textContent=value?.quote||'';$('#readerNote').value='';$('#readerNote').placeholder=value?.quote?'Điều gì khiến bạn dừng lại ở đoạn này?':'Một ý tưởng đáng giữ lại…';status('#noteStatus','');}
  function rootOffset(root,node,offset){const range=document.createRange();range.selectNodeContents(root);range.setEnd(node,offset);return range.toString().length;}
  function captureSelection(){
    if(!reader.open||!context.ready||penMode)return;
    const selection=window.getSelection();if(!selection?.rangeCount||selection.isCollapsed){selectionBar.hidden=true;return;}
    const range=selection.getRangeAt(0),root=textRoot();
    if(!root.contains(range.startContainer)||!root.contains(range.endContainer)){selectionBar.hidden=true;return;}
    const quote=range.toString();if(!quote.trim()||quote.length>3000){selectionBar.hidden=true;return;}
    const value={quote,anchor:{start:rootOffset(root,range.startContainer,range.startOffset),end:rootOffset(root,range.endContainer,range.endOffset)}};
    if(selected?.quote!==value.quote||selected?.anchor?.start!==value.anchor.start||selected?.anchor?.end!==value.anchor.end)noteSelection(value);const rect=range.getBoundingClientRect();selectionBar.hidden=false;
    const width=selectionBar.offsetWidth;selectionBar.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left+(rect.width-width)/2))+'px';selectionBar.style.top=Math.max(100,Math.min(innerHeight-72,rect.top-48))+'px';
  }
  function unwrapHighlights(root){$$('mark[data-annotation-id]',root).forEach(mark=>mark.replaceWith(...mark.childNodes));root.normalize();}
  function renderHighlights(){
    const root=textRoot();if(!root||!context.ready)return;unwrapHighlights(root);
    const content=root.textContent;
    // Walk once per note. The number of visible notes is bounded by the API page.
    for(const annotation of annotations.filter(a=>samePage(a)&&a.quote)){
      let start=annotation.anchor?.start,end=annotation.anchor?.end;
      if(!Number.isInteger(start)||content.slice(start,end)!==annotation.quote){start=content.indexOf(annotation.quote);end=start+annotation.quote.length;}
      if(start<0||end<=start||end>content.length)continue;
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,offset=0;const ranges=[];
      while((node=walker.nextNode())){const next=offset+node.length;if(next>start&&offset<end)ranges.push({node,from:Math.max(0,start-offset),to:Math.min(node.length,end-offset)});offset=next;if(offset>=end)break;}
      for(const item of ranges.reverse()){
        if(!item.node.parentNode||item.to<=item.from)continue;
        const range=document.createRange();range.setStart(item.node,item.from);range.setEnd(item.node,item.to);
        const mark=document.createElement('mark');mark.className='reader-highlight '+(colors[annotation.color]?annotation.color:'yellow');mark.dataset.annotationId=annotation.id;mark.title=annotation.note||'Đoạn đã đánh dấu';range.surroundContents(mark);
      }
    }
  }
  function renderNotes(){
    const page=annotations.filter(samePage);$('#readerNoteCount').textContent=String(page.length);
    $('#readerNotes').innerHTML=!uid()?'<p class="reader-tool-help">Đăng nhập để lưu ghi chú và nét bút riêng tư.</p>':page.length?page.map(a=>`<article class="reader-note-card"><div><span class="reader-color-dot ${colors[a.color]?a.color:'yellow'}"></span><small>${a.strokes?.length?'✎ '+a.strokes.length+' nét bút':a.note?'Ghi chú':'Đã đánh dấu'}</small></div>${a.quote?`<blockquote>${esc(a.quote)}</blockquote>`:''}${a.note?`<p>${esc(a.note)}</p>`:''}<div class="reader-note-actions">${a.strokes?.length?'':toolButton('note-edit','Sửa',`data-id="${esc(a.id)}"`)}${toolButton('note-delete','Xóa',`data-id="${esc(a.id)}" aria-label="Xóa ghi chú này"`)}</div></article>`).join(''):`<p class="reader-tool-help">${annotationLoading?'Đang tải ghi chú…':'Một trang mới, một ý tưởng mới. Ghi chú đầu tiên của bạn sẽ ở đây.'}</p>`;
    $('#notesMore').hidden=!annotationMore;
  }
  async function loadAnnotations(more=false){
    if(!context.ready||!uid())return;
    const epoch=annotationEpoch,bookId=context.bookId,user=uid();annotationLoading=true;renderNotes();
    try{
      const result=await bridge.api('/api/reader/annotations?'+new URLSearchParams({bookId,offset:String(more?annotationOffset:0)}));
      if(epoch!==annotationEpoch||bookId!==context.bookId||user!==uid())return;
      annotations=more?[...annotations,...result.annotations]:result.annotations||[];
      annotationMore=!!result.hasMore;annotationOffset=result.nextOffset||annotations.length;
      syncPen();renderHighlights();renderNotes();
    }catch(error){if(epoch===annotationEpoch)status('#noteStatus',error.message,true);}
    finally{if(epoch===annotationEpoch){annotationLoading=false;renderNotes();}}
  }
  function annotationBody(extra={}){return{bookId:context.bookId,chapter:context.chapter,page:context.page,color,...extra};}
  async function saveNote(highlight=false){
    if(!context.ready||!own())return;
    const note=highlight?'':$('#readerNote').value.trim(),quote=selected?.quote||'';
    if(!note&&!quote){status('#noteStatus','Hãy bôi chọn văn bản hoặc viết một ghi chú trước.',true);return;}
    const savedKey=contextKey,body=annotationBody({quote,note,...(selected?.anchor?{anchor:selected.anchor}:{}),...(editId?{id:editId}:{})});
    const button=$('[data-reader-tool=note-save]',panel);button.disabled=true;status('#noteStatus','Đang lưu…');
    try{
      const result=await bridge.api('/api/reader/annotations',{method:'POST',body});
      if(savedKey!==contextKey)return;
      annotationEpoch++;annotationLoading=false;annotations=[result.annotation,...annotations.filter(a=>a.id!==result.annotation.id)];noteSelection(null);window.getSelection()?.removeAllRanges();selectionBar.hidden=true;renderHighlights();renderNotes();status('#noteStatus',highlight?'Đã lưu đoạn highlight.':'Đã lưu ghi chú riêng tư.');
    }catch(error){if(savedKey===contextKey)status('#noteStatus',error.message,true);}
    finally{button.disabled=false;}
  }
  function editNote(id){const item=annotations.find(a=>a.id===id);if(!item)return;setTab('notes');noteSelection({quote:item.quote,anchor:item.anchor});editId=item.id;$('#readerNote').value=item.note||'';chooseColor(item.color||'yellow');$('#readerNote').focus();}
  async function deleteNote(id){if(!own())return;await bridge.api('/api/reader/annotations/'+encodeURIComponent(id),{method:'DELETE'});annotationEpoch++;annotationLoading=false;annotations=annotations.filter(a=>a.id!==id);if(editId===id)noteSelection(null);syncPen();renderHighlights();renderNotes();status('#noteStatus','Đã xóa ghi chú.');}
  function chooseColor(value){if(!colors[value])return;color=value;$$('[data-reader-tool=color]',panel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===value)));}
  const svgNS='http://www.w3.org/2000/svg';
  for(const id of ['readerTextStage','pdfPageStage']){const overlay=document.createElementNS(svgNS,'svg');overlay.classList.add('reader-ink');overlay.setAttribute('viewBox','0 0 1000 1000');overlay.setAttribute('preserveAspectRatio','none');overlay.setAttribute('aria-label','Vùng viết tay trên trang');overlay.setAttribute('role','img');$('#'+id).append(overlay);overlay.addEventListener('pointerdown',penDown);overlay.addEventListener('pointermove',penMove);overlay.addEventListener('pointerup',penEnd);overlay.addEventListener('pointercancel',penEnd);}
  function pathFor(stroke){return stroke.points.map((p,i)=>(i?'L':'M')+(p.x*1000).toFixed(2)+' '+(p.y*1000).toFixed(2)).join(' ')+(stroke.points.length===1?'l.01 .01':'');}
  function drawInk(){const overlay=$('.reader-ink',stage());if(!overlay)return;overlay.replaceChildren();for(const stroke of pen?.strokes||[]){const path=document.createElementNS(svgNS,'path');path.setAttribute('d',pathFor(stroke));path.setAttribute('stroke',stroke.color);path.setAttribute('stroke-width',stroke.width);path.setAttribute('fill','none');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');path.setAttribute('vector-effect','non-scaling-stroke');overlay.append(path);}$('#penStatus').textContent=penMode?'Bút đang bật. Tắt bút để cuộn trang. Nét bút được lưu sau khi nhấc bút.':'Tắt bút để cuộn trang và chọn văn bản.';}
  function syncPen(){const record=annotations.find(a=>samePage(a)&&a.strokes?.length);if(pen?.key===contextKey&&pen.saving)return;pen={key:contextKey,bookId:context.bookId,chapter:context.chapter,page:context.page,record:record||null,strokes:record?.strokes?structuredClone(record.strokes):[],queue:Promise.resolve(),saving:0};drawInk();}
  function setPenMode(enabled){penMode=!!enabled;$$('.reader-ink').forEach(n=>n.classList.toggle('drawing-enabled',penMode));$$('[data-reader-tool=pen],[data-reader-tool=pen-toggle]').forEach(n=>n.setAttribute('aria-pressed',String(penMode)));$('[data-reader-tool=pen-toggle]',panel).textContent=penMode?'Tắt bút':'Bật bút';if(penMode){window.getSelection()?.removeAllRanges();selectionBar.hidden=true;}drawInk();}
  function point(event,element){const rect=element.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};}
  function penDown(event){
    if(!penMode||!context.ready||event.button!==0||!pen)return;if(!own()){setPenMode(false);return;}
    if(pen.strokes.length>=30){status('#penStatus','Trang này đã có 30 nét. Hoàn tác một nét trước khi viết thêm.',true);return;}
    if(pen.strokes.reduce((n,s)=>n+s.points.length,0)>=3990){status('#penStatus','Trang này đã nhiều nét. Hoàn tác bớt để viết tiếp.',true);return;}
    event.preventDefault();const overlay=event.currentTarget;overlay.setPointerCapture(event.pointerId);
    const stroke={points:[point(event,overlay)],color:inkColors[color],width:2.5};pen.strokes.push(stroke);drawing={pointer:event.pointerId,overlay,stroke,pen};drawInk();
  }
  function penMove(event){if(!drawing||event.pointerId!==drawing.pointer)return;const p=point(event,drawing.overlay),points=drawing.stroke.points,last=points[points.length-1],rect=drawing.overlay.getBoundingClientRect();if(Math.hypot((p.x-last.x)*rect.width,(p.y-last.y)*rect.height)<2)return;if(points.length>=500||drawing.pen.strokes.reduce((n,s)=>n+s.points.length,0)>=4000)return;points.push(p);drawing.overlay.lastElementChild?.setAttribute('d',pathFor(drawing.stroke));}
  function penEnd(event){if(!drawing||event.pointerId!==drawing.pointer)return;const controller=drawing.pen;drawing=null;saveInk(controller);}
  function saveInk(controller){
    const strokes=structuredClone(controller.strokes);controller.saving++;status('#penStatus','Đang lưu nét bút…');
    controller.queue=controller.queue.then(async()=>{
      if(strokes.length){const result=await bridge.api('/api/reader/annotations',{method:'POST',body:{...(controller.record?{id:controller.record.id}:{}),bookId:controller.bookId,chapter:controller.chapter,page:controller.page,quote:'',note:'',color:'green',strokes}});controller.record=result.annotation;}
      else if(controller.record){await bridge.api('/api/reader/annotations/'+encodeURIComponent(controller.record.id),{method:'DELETE'});const oldId=controller.record.id;controller.record=null;if(controller.key===contextKey)annotations=annotations.filter(a=>a.id!==oldId);}
      if(controller.key===contextKey){annotationEpoch++;annotationLoading=false;if(controller.record)annotations=[controller.record,...annotations.filter(a=>a.id!==controller.record.id)];renderNotes();status('#penStatus','Đã lưu nét bút riêng tư.');}
    }).catch(error=>{if(controller.key===contextKey)status('#penStatus','Chưa lưu được: '+error.message+' Bấm “Lưu lại nét” để thử lại.',true);$('#retryInk')?.remove();if(controller.key===contextKey){const retry=document.createElement('button');retry.id='retryInk';retry.textContent='Lưu lại nét';retry.dataset.readerTool='pen-retry';$('.reader-pen-controls',panel).append(retry);}}).finally(()=>controller.saving--);
  }
  function translationLimit(){const count=new TextEncoder().encode($('#translateText').value).length;$('#translationLimit').textContent=count+' / 500 byte';$('#translationLimit').classList.toggle('reader-error',count>500);}
  function selectForTranslation(){setTab('translate');if(selected?.quote){$('#translateText').value=selected.quote.slice(0,500);translationLimit();}$('#translateText').focus();selectionBar.hidden=true;}
  async function lookup(){
    const text=$('#translateText').value.trim(),source=$('#translateSource').value,target=$('#translateTarget').value;
    if(!text){status('#translationStatus','Hãy chọn hoặc nhập một từ / đoạn ngắn.',true);return;}
    if(new TextEncoder().encode(text).length>500){status('#translationStatus','Đoạn này dài hơn 500 byte. Hãy chọn ít từ hơn.',true);return;}
    if(source===target){status('#translationStatus','Hãy chọn hai ngôn ngữ khác nhau.',true);return;}
    const epoch=++lookupEpoch;translation=null;$('#translationResult').hidden=true;status('#translationStatus','Đang dịch và tra phát âm…');$('[data-reader-tool=lookup]',panel).disabled=true;
    try{
      const result=await bridge.api('/api/reader/translate?'+new URLSearchParams({text,source,target}));if(epoch!==lookupEpoch)return;translation={...result,bookId:context.bookId};
      $('#translationResult').hidden=false;$('#translationResult').innerHTML=`<strong>${esc(result.text)}</strong>${result.ipa?`<div class="reader-ipa">${esc(result.ipa)}</div>`:''}<p>${esc(result.translation)}</p><div class="reader-tool-actions">${toolButton('pronounce','Nghe phát âm')}${result.text.length<=200?toolButton('word-save','Lưu từ vựng','class="reader-primary"'):''}</div>${!result.ipa&&source==='en'?'<small>Chưa có IPA cho đoạn này. Chọn riêng một từ tiếng Anh để tra.</small>':''}${result.text.length>200?'<small>Chọn từ hoặc cụm từ tối đa 200 ký tự để lưu vào sổ.</small>':''}`;
      status('#translationStatus',(result.warnings||[]).join(' '));
    }catch(error){if(epoch===lookupEpoch)status('#translationStatus',error.message,true);}
    finally{if(epoch===lookupEpoch)$('[data-reader-tool=lookup]',panel).disabled=false;}
  }
  async function saveWord(){
    if(!translation||!own())return;const {text,translation:meaning,ipa,sourceLang,targetLang,bookId}=translation;
    const result=await bridge.api('/api/reader/vocabulary',{method:'POST',body:{word:text,translation:meaning,ipa:ipa||'',sourceLang,targetLang,...(bookId?{bookId}:{})}});
    words=[result.word,...words.filter(w=>w.id!==result.word.id)];renderVocabulary();status('#translationStatus','Đã lưu vào sổ từ vựng của bạn.');
  }
  function vocabularyHosts(){return $$('.reader-vocabulary-host');}
  function renderVocabulary(){
    for(const host of vocabularyHosts()){
      const query=$('input',host)?.value||'';
      host.innerHTML=!uid()?`<p class="reader-tool-help">Đăng nhập để lưu từ vựng và ôn lại trên mọi thiết bị.</p>${toolButton('sign-in','Đăng nhập / Tạo tài khoản','class="reader-primary"')}`:`<label class="reader-field">Tìm trong sổ<input type="search" class="reader-vocabulary-search" placeholder="Tìm từ hoặc nghĩa…" value="${esc(query)}"></label><div class="reader-word-list"></div><p class="reader-vocabulary-status" role="status">${wordLoading?'Đang tải từ vựng…':words.length?words.length+' từ / cụm từ đã lưu':'Chưa có từ nào. Mở sách, chọn một từ và bấm Dịch & IPA để bắt đầu.'}</p>${wordsMore?toolButton('words-more','Tải thêm từ vựng'):''}`;
      renderWordList(host,query);
    }
  }
  function renderWordList(host,query=''){
    const list=$('.reader-word-list',host);if(!list)return;const search=query.toLocaleLowerCase('vi');
    const filtered=words.filter(w=>(w.word+' '+w.translation).toLocaleLowerCase('vi').includes(search));
    list.innerHTML=filtered.map(w=>`<article class="reader-word-card"><div><strong>${esc(w.word)}</strong>${w.ipa?`<span class="reader-ipa">${esc(w.ipa)}</span>`:''}<small>${esc(languages[w.sourceLang]||w.sourceLang)} → ${esc(languages[w.targetLang]||w.targetLang)}</small></div><p>${esc(w.translation)}</p><div class="reader-note-actions">${toolButton('word-speak','Nghe phát âm',`data-id="${esc(w.id)}"`)}${toolButton('word-delete','Xóa',`data-id="${esc(w.id)}" aria-label="Xóa từ ${esc(w.word)}"`)}</div></article>`).join('')||(search?'<p class="reader-tool-help">Chưa tìm thấy từ phù hợp.</p>':'');
  }
  async function loadVocabulary(more=false,force=false){
    if(!uid()){words=[];renderVocabulary();return;}if(wordLoading)return;
    if(!force&&!more&&wordsLoadedFor===uid()){renderVocabulary();return;}
    const epoch=++vocabularyEpoch,user=uid();wordLoading=true;renderVocabulary();
    try{const result=await bridge.api('/api/reader/vocabulary?offset='+String(more?wordOffset:0));if(epoch!==vocabularyEpoch||user!==uid())return;words=more?[...words,...result.words]:result.words||[];wordsMore=!!result.hasMore;wordOffset=(result.offset||0)+(result.words?.length||0);wordsLoadedFor=user;}
    catch(error){bridge.toast(error.message);}
    finally{if(epoch===vocabularyEpoch){wordLoading=false;renderVocabulary();}}
  }
  async function deleteWord(id){if(!own())return;await bridge.api('/api/reader/vocabulary/'+encodeURIComponent(id),{method:'DELETE'});words=words.filter(w=>w.id!==id);renderVocabulary();}
  function openVocabulary(){vocabularyDialog.showModal();loadVocabulary(false,true);}
  function resizePDF(){const layer=$('#pdfTextLayer'),renderWidth=Number(layer.dataset.renderWidth);if(renderWidth){const width=$('#pdfPageStage').clientWidth;if(width)layer.style.transform=`scale(${width/renderWidth})`;}}
  const resizeObserver=new ResizeObserver(resizePDF);resizeObserver.observe($('#pdfPageStage'));
  function readerChanged(){
    const next=bridge.getContext(),nextKey=key(next);context=next;
    if(nextKey!==contextKey){contextKey=nextKey;annotationEpoch++;annotations=[];annotationMore=false;annotationOffset=0;annotationLoading=false;pen=null;drawing=null;noteSelection(null);lookupEpoch++;translation=null;$('#translationResult').hidden=true;$('[data-reader-tool=lookup]',panel).disabled=false;$('#translateText').value='';status('#translationStatus','');const lang=next.language?.split('-')[0];$('#translateSource').value=languages[lang]?lang:'en';$('#translateTarget').value=lang==='vi'?'en':'vi';translationLimit();setPenMode(false);}
    $$('.reader-location',panel).forEach(n=>n.textContent=locationLabel());selectionBar.hidden=true;speech?.refresh();resizePDF();syncPen();renderNotes();if(context.ready&&uid())loadAnnotations();
    if(context.type!=='chapters'&&context.ready&&!context.text.trim())status('#noteStatus','PDF này chưa có lớp chữ đọc được. Bạn vẫn có thể viết tay, ghi chú trang hoặc nhập từ trong mục Dịch.');
  }
  async function handle(button){
    const action=button.dataset.readerTool,id=button.dataset.id;
    if(['notes','translate','speech','vocabulary'].includes(action)){setTab(action);return;}
    if(action==='panel-close'){hidePanel();return;}
    if(action==='color'){chooseColor(button.dataset.color);return;}
    if(action==='highlight'){setTab('notes');await saveNote(true);return;}
    if(action==='selection-note'){setTab('notes');selectionBar.hidden=true;$('#readerNote').focus();return;}
    if(action==='selection-translate'){selectForTranslation();await lookup();return;}
    if(action==='note-save'){await saveNote();return;}
    if(action==='note-clear'){noteSelection(null);selectionBar.hidden=true;window.getSelection()?.removeAllRanges();return;}
    if(action==='note-edit'){editNote(id);return;}
    if(action==='note-delete'){await deleteNote(id);return;}
    if(action==='notes-more'){await loadAnnotations(true);return;}
    if(action==='pen'||action==='pen-toggle'){if(!context.ready)return;if(!own())return;if(action==='pen')setTab('notes');setPenMode(!penMode);if(penMode&&matchMedia('(max-width:760px)').matches)hidePanel();return;}
    if(action==='pen-undo'){if(!pen?.strokes.length)return;pen.strokes.pop();drawInk();saveInk(pen);return;}
    if(action==='pen-retry'){button.remove();if(pen)saveInk(pen);return;}
    if(action==='lookup'){await lookup();return;}
    if(action==='pronounce'){if(translation&&!window.LowfSpeech?.speakWord(translation.text,translation.sourceLang))status('#translationStatus','Thiết bị chưa thể phát giọng đọc. Hãy kiểm tra giọng đã cài đặt.',true);return;}
    if(action==='word-save'){await saveWord();return;}
    if(action==='words-more'){await loadVocabulary(true);return;}
    if(action==='word-delete'){await deleteWord(id);return;}
    if(action==='word-speak'){const word=words.find(w=>w.id===id);if(word&&!window.LowfSpeech?.speakWord(word.word,word.sourceLang))bridge.toast('Thiết bị chưa hỗ trợ giọng đọc.');return;}
    if(action==='vocabulary-close'){vocabularyDialog.close();window.LowfSpeech?.stop();return;}
    if(action==='sign-in'){vocabularyDialog.close();bridge.requestAuth();}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-reader-tool]');if(button&&!button.disabled){handle(button).catch(error=>bridge.toast(error.message));return;}const mark=event.target.closest('mark[data-annotation-id]');if(mark&&reader.open&&window.getSelection()?.isCollapsed)editNote(mark.dataset.annotationId);});
  selectionBar.addEventListener('pointerdown',event=>event.preventDefault());
  reader.addEventListener('pointerup',event=>{if(!event.target.closest('[data-reader-panel],.reader-tool-ribbon,.reader-selection-bar,.reader-ink'))setTimeout(captureSelection,0);});
  let selectionFrame=0;
  document.addEventListener('selectionchange',()=>{if(!reader.open||selectionFrame)return;selectionFrame=requestAnimationFrame(()=>{selectionFrame=0;captureSelection();});});
  reader.addEventListener('keyup',event=>{if(event.key==='Shift'||event.key.startsWith('Arrow'))captureSelection();});
  scroll.addEventListener('scroll',()=>{selectionBar.hidden=true;},{passive:true});
  panel.addEventListener('keydown',event=>{const tab=event.target.closest('[role=tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('[role=tab]',panel),index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next].dataset.readerTool);tabs[next].focus();});
  document.addEventListener('input',event=>{if(event.target.id==='translateText')translationLimit();if(event.target.classList.contains('reader-vocabulary-search'))renderWordList(event.target.closest('.reader-vocabulary-host'),event.target.value);});
  window.addEventListener('lowf:readerchange',readerChanged);
  window.addEventListener('lowf:readerloading',()=>{context=bridge.getContext();setPenMode(false);selectionBar.hidden=true;window.LowfSpeech?.stop();});
  window.addEventListener('lowf:readerclose',()=>{annotationEpoch++;lookupEpoch++;contextKey='';context=bridge.getContext();selectionBar.hidden=true;setPenMode(false);hidePanel();window.LowfSpeech?.stop();});
  window.addEventListener('lowf:userchange',()=>{const next=uid();if(next===userKey)return;userKey=next;vocabularyEpoch++;wordLoading=false;wordsLoadedFor='';words=[];renderVocabulary();if(reader.open)readerChanged();if(vocabularyDialog.open)loadVocabulary();});
  vocabularyDialog.addEventListener('cancel',()=>window.LowfSpeech?.stop());
  window.addEventListener('pagehide',()=>{window.LowfSpeech?.stop();resizeObserver.disconnect();});
  window.LowfReaderTools=Object.freeze({openVocabulary});
  userKey=uid();renderVocabulary();if(reader.open)readerChanged();
})();
