/* Lowf reading voices. Uses only voices supplied by this browser/device. */
(() => {
  'use strict';
  const synth=window.speechSynthesis;
  const supported=!!synth&&typeof window.SpeechSynthesisUtterance==='function';
  const panels=new Set();
  const instances=new WeakMap();
  let voices=[],generation=0,current=null,status='idle',chunks=[],index=0,settings=null;
  let message=supported?'Chọn giọng rồi bấm Đọc thành tiếng.':'Trình duyệt này chưa hỗ trợ đọc thành tiếng. Hãy thử Chrome, Edge hoặc Safari trên thiết bị có giọng đọc.';
  let prefs={gender:'auto',rate:1,voiceURI:''};
  try{const saved=JSON.parse(localStorage.getItem('lowf.reader.speech')||'{}');if(['auto','male','female'].includes(saved.gender))prefs.gender=saved.gender;if(Number.isFinite(saved.rate))prefs.rate=Math.max(.7,Math.min(1.5,saved.rate));if(typeof saved.voiceURI==='string')prefs.voiceURI=saved.voiceURI;}catch{}
  const persist=()=>{try{localStorage.setItem('lowf.reader.speech',JSON.stringify(prefs));}catch{}};
  const lang=value=>typeof value==='string'&&/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value)?value:'vi-VN';
  const base=value=>lang(value).toLowerCase().split('-')[0];
  const plain=value=>String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();
  function genderOf(voice){
    const name=String(voice.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(/\bfemale\b/.test(name))return'female';
    if(/\bmale\b/.test(name))return'male';
    if(/microsoft/.test(name)){
      if(/\b(david|mark|george|guy|christopher|ryan|eric|davis|tony|roger|nam\s?minh)\b/.test(name))return'male';
      if(/\b(zira|hazel|susan|aria|jenny|sonia|libby|michelle|ana|hoai\s?my)\b/.test(name))return'female';
    }
    // These are documented Apple system voice names, not inferred from a person's name.
    if(/^(alex|daniel|thomas|fred|oliver)(?: \(.*\))?$/.test(name))return'male';
    if(/^(samantha|karen|moira|victoria|tessa|fiona)(?: \(.*\))?$/.test(name))return'female';
    return'unknown';
  }
  function candidates(language){
    const exact=lang(language).toLowerCase();
    return voices.filter(v=>base(v.lang)===base(language)).sort((a,b)=>Number(b.lang.toLowerCase()===exact)-Number(a.lang.toLowerCase()===exact)||Number(b.default)-Number(a.default)||a.name.localeCompare(b.name));
  }
  function chooseVoice(language){
    const manual=voices.find(v=>v.voiceURI===prefs.voiceURI);
    if(manual)return manual;
    const local=candidates(language);
    return(prefs.gender!=='auto'?local.find(v=>genderOf(v)===prefs.gender):null)||local[0]||voices.find(v=>v.default)||voices[0]||null;
  }
  function availability(language){
    if(!supported)return message;
    if(!voices.length)return'Thiết bị chưa liệt kê giọng đọc. Bạn có thể thử giọng mặc định; lựa chọn nam/nữ chỉ có khi thiết bị cung cấp.';
    const local=candidates(language);
    if(!local.length)return'Chưa tìm thấy giọng cho ngôn ngữ trang này. Chọn một giọng đã cài đặt hoặc thêm giọng đọc trong cài đặt thiết bị.';
    if(prefs.voiceURI)return'Đang dùng giọng bạn đã chọn trong danh sách của thiết bị.';
    if(prefs.gender!=='auto'&&!local.some(v=>genderOf(v)===prefs.gender))return`Thiết bị chưa có giọng ${prefs.gender==='male'?'nam':'nữ'} được nhận diện cho ngôn ngữ này. Hệ thống sẽ dùng một giọng có sẵn; bạn có thể chọn lại bên dưới.`;
    return'Giọng đọc do thiết bị cung cấp. Chất lượng và các lựa chọn có thể khác nhau giữa trình duyệt.';
  }
  function splitText(text,language){
    const normalized=plain(text).replace(/\r\n?/g,'\n');
    let sentences;
    try{sentences=[...new Intl.Segmenter(lang(language),{granularity:'sentence'}).segment(normalized)].map(item=>item.segment);}catch{sentences=normalized.match(/[^.!?。！？\n]+[.!?。！？]*/gu)||[normalized];}
    const result=[];
    for(const sentence of sentences){
      let line='';
      for(const word of sentence.trim().split(/\s+/u)){
        if(!word)continue;
        if(word.length>180){
          if(line){result.push(line);line='';}
          for(const letter of word){if(line.length+letter.length>180){result.push(line);line='';}line+=letter;}
          continue;
        }
        if(line&&line.length+word.length+1>180){result.push(line);line='';}
        line+=(line?' ':'')+word;
      }
      if(line)result.push(line);
    }
    return result;
  }
  function contextFor(panel){let context={};try{context=panel.getContext()||{};}catch{}return{text:plain(context.text),language:lang(context.language),title:plain(context.title)};}
  function announce(){
    for(const panel of panels){
      panel.play.textContent=status==='paused'?'Tiếp tục đọc':status==='playing'?'Tạm dừng':'Đọc thành tiếng';
      panel.play.setAttribute('aria-label',panel.play.textContent);
      panel.stop.disabled=!supported||status==='idle';
      panel.status.textContent=message;
      panel.progress.textContent=chunks.length&&status!=='idle'?`Đoạn ${Math.min(index+1,chunks.length)} / ${chunks.length}`:'';
    }
    window.dispatchEvent(new CustomEvent('lowf:speech-state',{detail:{status,index,total:chunks.length}}));
  }
  function stop({quiet=false}={}){
    generation++;current=null;chunks=[];index=0;settings=null;status='idle';
    if(supported){try{synth.cancel();}catch{}}
    if(!quiet)message=supported?'Đã dừng đọc.':'Trình duyệt này chưa hỗ trợ đọc thành tiếng.';
    announce();
  }
  function finish(token){if(token!==generation)return;current=null;status='idle';message='Đã đọc hết nội dung này.';chunks=[];index=0;settings=null;announce();}
  function speakNext(token){
    if(token!==generation||status!=='playing')return;
    if(index>=chunks.length){finish(token);return;}
    const utterance=new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang=settings.language;utterance.rate=settings.rate;utterance.volume=1;
    if(settings.voice)utterance.voice=settings.voice;
    current=utterance;
    utterance.onend=()=>{if(token!==generation||current!==utterance)return;current=null;index++;announce();if(status==='playing')speakNext(token);};
    utterance.onerror=event=>{
      if(token!==generation||current!==utterance)return;
      const code=event.error;stop({quiet:true});
      message=code==='not-allowed'?'Trình duyệt chưa cho phát giọng đọc. Bấm Đọc thành tiếng một lần nữa.':code==='language-unavailable'||code==='voice-unavailable'?'Giọng này chưa sẵn sàng. Chọn giọng khác hoặc cài thêm giọng cho ngôn ngữ đang đọc.':code==='network'?'Giọng của thiết bị cần kết nối mạng. Kiểm tra kết nối hoặc chọn một giọng có sẵn trên máy.':'Chưa phát được giọng đọc. Hãy chọn giọng khác và thử lại.';
      announce();
    };
    try{synth.speak(utterance);}catch{stop({quiet:true});message='Không mở được giọng đọc của thiết bị. Hãy thử một giọng khác.';announce();}
  }
  function start(text,language){
    if(!supported){announce();return false;}
    const next=splitText(text,language);
    if(!next.length){message='Chưa có văn bản để đọc. Với PDF dạng ảnh, hãy dùng file có lớp văn bản hoặc chọn một đoạn để tra cứu.';announce();return false;}
    stop({quiet:true});chunks=next;index=0;settings={language:lang(language),voice:chooseVoice(language),rate:prefs.rate};status='playing';
    message=settings.voice?`Đang đọc bằng ${settings.voice.name}.`:'Đang thử giọng mặc định của thiết bị.';announce();speakNext(generation);return true;
  }
  function toggle(panel){
    if(status==='playing'){status='paused';try{synth.pause();}catch{}message='Đã tạm dừng. Bạn có thể tiếp tục từ đoạn đang đọc.';announce();return;}
    if(status==='paused'){status='playing';message='Đang tiếp tục đọc.';try{synth.resume();}catch{}announce();if(!current)speakNext(generation);return;}
    const context=contextFor(panel);start(context.text,context.language);
  }
  function updateVoices(){
    if(!supported)return;
    try{voices=synth.getVoices().filter(v=>v&&typeof v.name==='string'&&typeof v.lang==='string').sort((a,b)=>a.lang.localeCompare(b.lang)||a.name.localeCompare(b.name));}catch{voices=[];}
    for(const panel of panels)renderVoices(panel);
  }
  function renderVoices(panel){
    const context=contextFor(panel),select=panel.voices;
    select.replaceChildren();const auto=document.createElement('option');auto.value='';auto.textContent='Tự chọn theo ngôn ngữ';select.append(auto);
    for(const voice of voices){const option=document.createElement('option');option.value=voice.voiceURI;option.textContent=`${voice.name} · ${voice.lang}${voice.localService?' · trên thiết bị':''}`;select.append(option);}
    if(prefs.voiceURI&&!voices.some(v=>v.voiceURI===prefs.voiceURI))prefs.voiceURI='';
    select.value=prefs.voiceURI;select.disabled=!supported||voices.length===0;
    panel.help.textContent=availability(context.language);
    panel.gender.disabled=!supported||voices.length===0;
  }
  function mount(container,getContext){
    if(!container||typeof getContext!=='function')throw new TypeError('Speech panel needs a container and context getter.');
    for(const previous of [...panels])if(!previous.container.isConnected)previous.controls.destroy();
    const existing=instances.get(container);if(existing){existing.getContext=getContext;existing.controls.refresh();return existing.controls;}
    container.innerHTML='<div class="speech-panel"><div class="speech-controls"><label class="speech-field"><span>Ưu tiên giọng</span><select data-speech="gender"><option value="auto">Tự động</option><option value="male">Giọng nam (nếu có)</option><option value="female">Giọng nữ (nếu có)</option></select></label><label class="speech-field"><span>Giọng trên thiết bị</span><select data-speech="voice"></select></label><label class="speech-field"><span>Tốc độ <output data-speech="rate-label">1×</output></span><input data-speech="rate" type="range" min="0.7" max="1.5" step="0.1" value="1" aria-label="Tốc độ đọc thành tiếng"></label></div><p class="speech-help" data-speech="help"></p><div class="speech-actions"><button type="button" data-speech="play">Đọc thành tiếng</button><button type="button" data-speech="stop">Dừng</button><span class="speech-progress" data-speech="progress"></span></div><p class="speech-status" data-speech="status" role="status" aria-live="polite"></p></div>';
    const q=name=>container.querySelector(`[data-speech="${name}"]`);
    const panel={container,getContext,gender:q('gender'),voices:q('voice'),rate:q('rate'),rateLabel:q('rate-label'),play:q('play'),stop:q('stop'),status:q('status'),progress:q('progress'),help:q('help')};
    panel.gender.value=prefs.gender;panel.rate.value=String(prefs.rate);panel.rateLabel.textContent=prefs.rate+'×';panel.play.disabled=!supported;panel.rate.disabled=!supported;
    const onGender=()=>{prefs.gender=panel.gender.value;prefs.voiceURI='';persist();renderVoices(panel);};
    const onVoice=()=>{prefs.voiceURI=panel.voices.value;persist();renderVoices(panel);};
    const onRate=()=>{prefs.rate=Number(panel.rate.value);if(settings)settings.rate=prefs.rate;panel.rateLabel.textContent=prefs.rate+'×';persist();};
    const onPlay=()=>toggle(panel),onStop=()=>stop();
    panel.gender.addEventListener('change',onGender);panel.voices.addEventListener('change',onVoice);panel.rate.addEventListener('input',onRate);panel.play.addEventListener('click',onPlay);panel.stop.addEventListener('click',onStop);
    panel.controls={refresh(){renderVoices(panel);announce();},destroy(){panels.delete(panel);instances.delete(container);panel.gender.removeEventListener('change',onGender);panel.voices.removeEventListener('change',onVoice);panel.rate.removeEventListener('input',onRate);panel.play.removeEventListener('click',onPlay);panel.stop.removeEventListener('click',onStop);if(!panels.size)stop();}};
    panels.add(panel);instances.set(container,panel);updateVoices();renderVoices(panel);announce();return panel.controls;
  }
  if(supported){synth.addEventListener?.('voiceschanged',updateVoices);updateVoices();}
  window.LowfSpeech={mount,stop:()=>stop(),speakWord(text,language='en'){return start(plain(text).slice(0,500),language);}};
  window.addEventListener('pagehide',()=>stop({quiet:true}));
})();
