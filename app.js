// ── CHIP GROUPS ───────────────────────────────────
document.querySelectorAll('.chips').forEach(g=>{
  g.querySelectorAll('.chip').forEach(c=>{
    c.addEventListener('click',()=>{g.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');});
  });
});
function gc(id){var e=document.querySelector('#'+id+' .chip.on');return e?e.dataset.v:'';}

// ── TAB SWITCHER ──────────────────────────────────
function switchTab(id,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.getElementById('panel-'+id).classList.add('on');
  if(btn) btn.classList.add('on');
  document.getElementById('tools').scrollIntoView({behavior:'smooth',block:'start'});
}

// ── MEDIA LOAD ────────────────────────────────────
function loadMedia(inp,type,pvId,fiId,fnId,elId,inpId,zoneId){
  var f=inp.files[0];if(!f)return;
  var url=URL.createObjectURL(f);
  document.getElementById(zoneId).style.display='none';
  document.getElementById(pvId).style.display='block';
  document.getElementById(fnId).textContent=f.name+' · '+(f.size/1024/1024).toFixed(1)+'MB';
  if(type==='video'){
    var v=document.getElementById(elId);v.src=url;v.load();
    v.onloadedmetadata=()=>{document.getElementById('v-btn').disabled=false;};
  } else {
    var img=document.getElementById(elId);img.src=url;
    document.getElementById('i-btn').disabled=false;
  }
}
function dropFile(ev,type,zoneId,pvId,fiId,fnId,elId){
  ev.preventDefault();document.getElementById(zoneId).classList.remove('drag');
  var f=ev.dataTransfer.files[0];if(!f)return;
  var inp=document.getElementById(type==='video'?'v-inp':'i-inp');
  var dt=new DataTransfer();dt.items.add(f);inp.files=dt.files;
  loadMedia({files:[f]},type,pvId,fiId,fnId,elId,null,zoneId);
}
function clearMedia(pvId,elId,inpId,zoneId,isVideo){
  document.getElementById(pvId).style.display='none';
  document.getElementById(zoneId).style.display='block';
  if(inpId) document.getElementById(inpId).value='';
  if(isVideo) document.getElementById('v-btn').disabled=true;
  else document.getElementById('i-btn').disabled=true;
}
function resetPanel(outId,pvId,elId,inpId,zoneId,isVideo){
  document.getElementById(outId).style.display='none';
  clearMedia(pvId,elId,inpId,zoneId,isVideo);
}

// ── FRAME EXTRACT ─────────────────────────────────
function captureFrame(videoEl,t){
  return new Promise(res=>{
    var tmp=document.createElement('video');
    tmp.src=videoEl.src;tmp.currentTime=t;tmp.muted=true;tmp.playsInline=true;
    tmp.onloadeddata=()=>{
      var c=document.getElementById('vc');c.width=320;c.height=180;
      c.getContext('2d').drawImage(tmp,0,0,320,180);
      res(c.toDataURL('image/jpeg',.75));tmp.remove();
    };tmp.load();
  });
}
async function extractFrames(videoEl,n){
  var dur=videoEl.duration,frames=[];
  for(var i=0;i<n;i++) frames.push(captureFrame(videoEl,(((i+.5)/n)*dur)));
  return Promise.all(frames);
}

// ── API CALL ──────────────────────────────────────
// Replace this with YOUR Cloudflare Worker URL after you deploy it (see worker.js)
var PROXY_URL = 'https://tara-proxy.w15358203.workers.dev';

async function callClaude(messages,maxTok=1000){
  var r=await fetch(PROXY_URL,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:maxTok,messages})
  });
  var d=await r.json();
  if(d.error){throw new Error(d.error.message||d.error);}
  return d.content.map(b=>b.text||'').join('');
}

// ── RENDER SCENES ─────────────────────────────────
function renderScenes(raw,containerId,cntId,allTextVar,platform,voStyle,frames){
  var parts=raw.split(/---+/).filter(s=>s.trim());
  var html='',allText='',cnt=0;
  parts.forEach((part,idx)=>{
    var lines=part.trim().split('\n').filter(l=>l.trim());
    var title='',prompt='',camera='',lighting='',tags='',vo='',timecode='';
    lines.forEach(l=>{
      var t=l.trim();
      if(/^SCENE\s*\d+:/i.test(t)) title=t.replace(/^SCENE\s*\d+:\s*/i,'').trim();
      else if(/^TIMECODE:/i.test(t)) timecode=t.replace(/^TIMECODE:\s*/i,'').trim();
      else if(/^PROMPT:/i.test(t)) prompt=t.replace(/^PROMPT:\s*/i,'').trim();
      else if(/^VIDEO PROMPT:|^IMAGE PROMPT:|^BOTH:/i.test(t)) prompt+=(prompt?' / ':'')+t.replace(/^[^:]+:\s*/,'').trim();
      else if(/^CAMERA:/i.test(t)) camera=t.replace(/^CAMERA:\s*/i,'').trim();
      else if(/^LIGHTING:/i.test(t)) lighting=t.replace(/^LIGHTING:\s*/i,'').trim();
      else if(/^TAGS:/i.test(t)) tags=t.replace(/^TAGS:\s*/i,'').trim();
      else if(/^VOICEOVER:|^NARRATION:/i.test(t)) vo=t.replace(/^[^:]+:\s*/,'').trim();
      else if(prompt&&!camera) prompt+=' '+t;
    });
    if(!prompt) return;
    cnt++;
    var tagArr=(tags||'').split(',').map(t=>t.trim()).filter(Boolean).slice(0,5);
    var hasVO=vo&&vo.toLowerCase()!=='none'&&voStyle!=='none';
    var frame=frames&&frames[Math.min(idx,frames.length-1)];

    html+=`<div class="sc">
      <div class="sc-hd"><span class="sc-num">Scene ${cnt}${title?' — '+title:''}</span>${timecode?`<span class="sc-plat">${timecode}</span>`:''}</div>
      <div class="sc-body">
        ${frame?`<div class="sc-frame"><canvas id="sfc-${cnt}"></canvas></div>`:''}
        <div class="lbl">Prompt</div>
        <div class="prompt-box">${prompt}</div>
        ${camera||lighting?`<div class="tag-row">${camera?`<span class="t">📷 ${camera}</span>`:''}${lighting?`<span class="t">💡 ${lighting}</span>`:''}</div>`:''}
        ${tagArr.length?`<div class="tag-row">${tagArr.map(t=>`<span class="t">${t}</span>`).join('')}</div>`:''}
        ${hasVO?`<div class="lbl" style="margin-top:.85rem">Voiceover</div><div class="vo-box">${vo}</div>`:''}
        <button class="cp-sc" onclick="copyScene(this,${cnt})">Copy scene ${cnt}</button>
      </div>
    </div>`;

    allText+=`--- SCENE ${cnt}${title?' — '+title:''}${timecode?' ('+timecode+')':''} ---\nPROMPT: ${prompt}\n`;
    if(camera) allText+=`CAMERA: ${camera}\n`;
    if(lighting) allText+=`LIGHTING: ${lighting}\n`;
    if(tagArr.length) allText+=`TAGS: ${tagArr.join(', ')}\n`;
    if(hasVO) allText+=`VOICEOVER: ${vo}\n`;
    allText+='\n';
  });

  if(!cnt){
    html='<div class="sc"><div class="sc-hd"><span class="sc-num">Result</span></div><div class="sc-body"><div class="lbl">Response</div><div class="prompt-box" style="white-space:pre-wrap">'+raw.replace(/</g,'&lt;')+'</div><button class="cp-sc" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">Copy</button></div></div>';
    allText=raw;
  }
  document.getElementById(containerId).innerHTML=html;
  if(cntId) document.getElementById(cntId).textContent=cnt?cnt+' scene'+(cnt!==1?'s':''):'1 response';
  window[allTextVar]=allText;
  if(frames) frames.forEach((f,i)=>{
    var c=document.getElementById('sfc-'+(i+1));if(!c)return;
    c.width=320;c.height=180;var img=new Image();img.onload=()=>c.getContext('2d').drawImage(img,0,0,320,180);img.src=f;
    c.style.display='block';c.parentElement.style.display='block';
  });
}

// ── COPY ──────────────────────────────────────────
function copyScene(btn,num){
  var card=btn.closest('.sc');
  var p=card.querySelector('.prompt-box').textContent;
  var v=card.querySelector('.vo-box');
  var t='Scene '+num+'\n\n'+p+(v?'\n\nVoiceover: '+v.textContent:'');
  navigator.clipboard.writeText(t).then(()=>{var o=btn.textContent;btn.textContent='Copied!';setTimeout(()=>btn.textContent=o,1800);});
}
function copyAll(varName){
  var t=window[varName]||'';
  if(!t)return;
  navigator.clipboard.writeText(t.trim()).then(()=>{
    var prefix=varName.split('-')[0];
    var el=document.getElementById(prefix+'-ok');
    if(el){el.style.display='block';setTimeout(()=>el.style.display='none',2000);}
  });
}

// ── LOADING MSGS ──────────────────────────────────
function startLoad(loadId,ltxtId,msgs){
  document.getElementById(loadId).style.display='flex';
  var i=0,el=document.getElementById(ltxtId);if(!el)el=document.querySelector('#'+loadId+' .load-txt');
  return setInterval(()=>{i=(i+1)%msgs.length;if(el)el.textContent=msgs[i];},1300);
}
function stopLoad(loadId,timer){clearInterval(timer);document.getElementById(loadId).style.display='none';}

// ── VIDEO ANALYZER ────────────────────────────────
async function detectHasAudio(v){
  try{
    if(typeof v.mozHasAudio!=='undefined') return v.mozHasAudio;
    if(typeof v.webkitAudioDecodedByteCount!=='undefined'){
      var wasPaused=v.paused,startTime=v.currentTime;
      try{ await v.play(); }catch(e){}
      await new Promise(r=>setTimeout(r,200));
      v.pause();
      v.currentTime=startTime;
      var has=v.webkitAudioDecodedByteCount>0;
      if(wasPaused) v.pause();
      return has;
    }
    if(v.audioTracks) return v.audioTracks.length>0;
  }catch(e){}
  return null; // couldn't detect (unsupported browser) — let the AI infer from visual cues
}

async function analyzeVideo(){
  var v=document.getElementById('vmv');
  if(!v||!v.src)return;
  var n=parseInt(gc('v-sc')||'3');
  var platform=gc('v-pl')||'Veo 3';
  var extra=document.getElementById('v-ex').value.trim();
  var btn=document.getElementById('v-btn');
  btn.disabled=true;
  document.getElementById('v-out').style.display='none';
  var timer=startLoad('v-load','v-ltxt',['Extracting frames…','Checking audio…','Analyzing scenes…','Writing prompts…']);
  var hasAudio=await detectHasAudio(v);
  var frames=await extractFrames(v,n);
  var imgBlocks=frames.map(f=>({type:'image',source:{type:'base64',media_type:'image/jpeg',data:f.split(',')[1]}}));
  var dur=Math.round(v.duration);
  var voInstr = hasAudio===true
    ? 'This video contains audio. Write a VOICEOVER line for each scene that matches the tone, mood and content of that scene, as if narrating it.'
    : hasAudio===false
    ? 'This video has NO audio track. Do not invent a voiceover — write exactly "VOICEOVER: None" for each scene.'
    : 'If the video appears to call for narration based on its visual content, include a fitting VOICEOVER; otherwise write "VOICEOVER: None".';
  var voStyle = hasAudio===false ? 'none' : 'narrative';
  var textBlock={type:'text',text:`Analyze these ${n} video frames (total duration ~${dur}s). First identify the video's own visual style (e.g. cinematic, photorealistic, anime, documentary, vintage film, surreal, 3D render, etc.) and mood purely from what you see in the frames — do not assume a style, observe it. Then generate ${n} scene prompts for AI video generation that match and preserve that exact detected style and mood throughout. ${extra?'Extra: '+extra+'.':''} ${voInstr}\n\nFormat each scene EXACTLY as:\nSCENE [n]: [title]\nTIMECODE: [start–end]\nPROMPT: [2-3 sentence cinematic prompt matching the video's detected style]\nCAMERA: [camera move]\nLIGHTING: [lighting]\nTAGS: [3-5 tags, include the detected style as one tag]\nVOICEOVER: [script matching the scene, or "None" per the instruction above]\n\nSeparate with ---\nWrite all ${n} scenes.`};
  try{
    var raw=await callClaude([{role:'user',content:[...imgBlocks,textBlock]}], 400+n*350);
    stopLoad('v-load',timer);btn.disabled=false;
    renderScenes(raw,'v-scenes','v-cnt','v-alltext',platform,voStyle,frames);
    document.getElementById('v-out').style.display='block';
    document.getElementById('v-out').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){stopLoad('v-load',timer);btn.disabled=false;alert('Error. Please try again.');}
}

// ── IMAGE ANALYZER ────────────────────────────────
async function analyzeImage(){
  var img=document.getElementById('iimg');
  if(!img||!img.src)return;
  var platform=gc('i-pl')||'Veo 3';
  var outputType=gc('i-ot')||'video prompt';
  var extra=document.getElementById('i-ex').value.trim();
  var btn=document.getElementById('i-btn');
  btn.disabled=true;
  document.getElementById('i-out').style.display='none';
  var timer=startLoad('i-load','i-ltxt',['Analyzing image…','Reading visual details…','Crafting prompt…']);
  var c=document.createElement('canvas');
  var im=new Image();
  im.onload=async()=>{
    c.width=Math.min(im.width,800);c.height=Math.round(im.height*(c.width/im.width));
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    var b64=c.toDataURL('image/jpeg',.8).split(',')[1];
    var promptInstr=outputType==='both'
      ?'Generate BOTH a video prompt AND an image prompt. Format:\nVIDEO PROMPT: [detailed]\nIMAGE PROMPT: [detailed]\nCAMERA: [move]\nLIGHTING: [lighting]\nTAGS: [5 tags]\nVOICEOVER: [one sentence narration]'
      :outputType==='image prompt'
      ?'Generate an IMAGE PROMPT. Format:\nPROMPT: [detailed image generation prompt]\nTAGS: [5 style tags]\nLIGHTING: [lighting]'
      :`Generate a VIDEO PROMPT for AI video generation, choosing the camera move that best fits this image's existing composition. Format:\nSCENE 1: Visual analysis\nPROMPT: [detailed cinematic video prompt, 3-4 sentences]\nCAMERA: [best-fit camera move]\nLIGHTING: [lighting]\nTAGS: [5 tags]\nVOICEOVER: [one evocative sentence]`;
    var txt=`Analyze this image. First identify its own visual style (e.g. cinematic, photorealistic, anime, documentary, vintage film, surreal, 3D render, etc.) purely from what you see — do not assume a style, observe it. Then ${promptInstr}\nMake sure the output matches and preserves the image's detected style exactly.${extra?' '+extra:''}`;
    try{
      var raw=await callClaude([{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}},{type:'text',text:txt}]}]);
      stopLoad('i-load',timer);btn.disabled=false;
      if(outputType==='image prompt'){
        window['i-alltext']=raw;
        document.getElementById('i-scenes').innerHTML=`<div class="sc"><div class="sc-hd"><span class="sc-num">Image Prompt</span></div><div class="sc-body"><div class="lbl">Prompt</div><div class="prompt-box">${raw.replace(/\n/g,'<br>')}</div><button class="cp-sc" onclick="copyScene(this,1)">Copy prompt</button></div></div>`;
      } else {
        renderScenes(raw,'i-scenes',null,'i-alltext',platform,'narrative',null);
      }
      document.getElementById('i-out').style.display='block';
      document.getElementById('i-out').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){stopLoad('i-load',timer);btn.disabled=false;alert('Error. Please try again.');}
  };
  im.src=img.src;
}

// ── TEXT TO PROMPT ────────────────────────────────
async function generateText(){
  var desc=document.getElementById('t-desc').value.trim();
  if(!desc){document.getElementById('t-desc').style.borderColor='var(--acc)';setTimeout(()=>document.getElementById('t-desc').style.borderColor='',1500);return;}
  var n=parseInt(gc('t-sc')||'3');
  var platform=gc('t-pl')||'Veo 3';
  var voStyle=gc('t-vo')||'none';
  var extra=document.getElementById('t-ex').value.trim();
  document.getElementById('t-out').style.display='none';
  var timer=startLoad('t-load','t-ltxt',['Writing prompts…','Crafting scenes…','Adding voiceover…','Polishing output…']);
  var voInstr=voStyle==='none'?'No voiceover.':'Include a '+voStyle+' VOICEOVER for each scene, 1-2 sentences.';
  var msg=`Generate exactly ${n} scene prompts for this video description. Infer the visual style and mood entirely from the description's own wording and content — do not impose an unrelated style.\n\nDescription: ${desc}\n\n${extra?'Extra: '+extra+'.':''} ${voInstr}\n\nFormat each scene EXACTLY:\nSCENE [n]: [title]\nPROMPT: [2-3 sentence cinematic prompt matching the description's own style]\nCAMERA: [camera movement]\nLIGHTING: [lighting]\nTAGS: [3-5 comma-separated tags]\n${voStyle!=='none'?'VOICEOVER: ['+voStyle+' script]\n':''}\nSeparate with ---\nWrite all ${n} scenes now.`;
  try{
    var raw=await callClaude([{role:'user',content:msg}], 400+n*350);
    stopLoad('t-load',timer);
    renderScenes(raw,'t-scenes','t-cnt','t-alltext',platform,voStyle,null);
    document.getElementById('t-out').style.display='block';
    document.getElementById('t-out').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){stopLoad('t-load',timer);alert('Error. Please try again.');}
}

// ── VOICEOVER GENERATOR ───────────────────────────
async function generateVoiceover(){
  var desc=document.getElementById('vo-desc').value.trim();
  if(!desc){document.getElementById('vo-desc').style.borderColor='var(--acc)';setTimeout(()=>document.getElementById('vo-desc').style.borderColor='',1500);return;}
  var tone=gc('vo-tone')||'warm and narrative';
  var len=gc('vo-len')||'30 seconds';
  var gen=document.getElementById('vo-gen').value;
  var aud=document.getElementById('vo-aud').value;
  var cta=document.getElementById('vo-cta').value.trim();
  document.getElementById('vo-out').style.display='none';
  var timer=startLoad('vo-load',null,['Writing your script…','Refining tone…','Finalizing narration…']);
  var msg=`Write a professional voiceover script for the following video.\n\nVideo description: ${desc}\nTone: ${tone}\nLength: ${len}\nVoice: ${gen}\nAudience: ${aud}${cta?'\nCall to action: '+cta:''}\n\nWrite ONLY the voiceover script itself — the actual words to be spoken. Include timing cues like [0:00], [0:15] etc. Make it natural, engaging, and perfectly paced for ${len}.`;
  try{
    var raw=await callClaude([{role:'user',content:msg}],800);
    stopLoad('vo-load',timer);
    window['vo-alltext']=raw;
    document.getElementById('vo-scenes').innerHTML=`<div class="sc"><div class="sc-hd"><span class="sc-num">Voiceover Script</span><span class="sc-plat">${len} · ${tone}</span></div><div class="sc-body"><div class="lbl">Script</div><div class="vo-box" style="white-space:pre-wrap">${raw}</div><button class="cp-sc" onclick="navigator.clipboard.writeText(document.querySelector('.vo-box').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy script',1800)})">Copy script</button></div></div>`;
    document.getElementById('vo-out').style.display='block';
    document.getElementById('vo-out').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){stopLoad('vo-load',timer);alert('Error. Please try again.');}
}

// ── STORYBOARD ────────────────────────────────────
async function generateStoryboard(){
  var desc=document.getElementById('sb-desc').value.trim();
  if(!desc){document.getElementById('sb-desc').style.borderColor='var(--acc)';setTimeout(()=>document.getElementById('sb-desc').style.borderColor='',1500);return;}
  var n=parseInt(gc('sb-sc')||'6');
  var platform=gc('sb-pl')||'Veo 3';
  document.getElementById('sb-out').style.display='none';
  var timer=startLoad('sb-load',null,['Building storyboard…','Writing shot list…','Adding camera notes…']);
  var msg=`Create a ${n}-shot storyboard for the following project. Infer the visual style entirely from the project description's own wording and content — do not impose an unrelated style.\n\nProject: ${desc}\n\nFor each shot, format EXACTLY as:\nSCENE [n]: [shot title]\nPROMPT: [Detailed visual description and AI video prompt matching the project's own style, 2-3 sentences]\nCAMERA: [camera angle and movement]\nLIGHTING: [lighting setup]\nACTION: [what happens in this shot, character action, dialogue cue]\nTAGS: [3-4 tags]\n\nSeparate with ---\nWrite all ${n} shots.`;
  try{
    var raw=await callClaude([{role:'user',content:msg}],400+n*350);
    stopLoad('sb-load',timer);
    renderScenes(raw,'sb-scenes','sb-cnt','sb-alltext',platform,'none',null);
    document.getElementById('sb-out').style.display='block';
    document.getElementById('sb-out').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){stopLoad('sb-load',timer);alert('Error. Please try again.');}
}

// ── AUTH MODAL ────────────────────────────────────
function showAuth(tab){
  document.getElementById('auth-modal').style.display='flex';
  document.getElementById('auth-ok').style.display='none';
  document.getElementById('auth-su').style.display=tab==='signup'?'block':'none';
  document.getElementById('auth-li').style.display=tab==='login'?'block':'none';
  setAuthTab(tab);
}
function setAuthTab(tab){
  document.getElementById('auth-su').style.display=tab==='signup'?'block':'none';
  document.getElementById('auth-li').style.display=tab==='login'?'block':'none';
  document.getElementById('auth-sub').textContent=tab==='signup'?'Create your free account':'Welcome back';
  document.getElementById('tab-su').style.background=tab==='signup'?'var(--acc)':'transparent';
  document.getElementById('tab-su').style.color=tab==='signup'?'#fff':'var(--s2)';
  document.getElementById('tab-li').style.background=tab==='login'?'var(--acc)':'transparent';
  document.getElementById('tab-li').style.color=tab==='login'?'#fff':'var(--s2)';
}

async function doAuth(type,btn){
  var endpoint, payload;
  if(type==='signup'){
    var name=document.getElementById('au-name').value.trim();
    var email=document.getElementById('au-email').value.trim();
    var pass=document.getElementById('au-pass').value;
    if(!name||!email||pass.length<8){alert('Please fill in all fields (password min 8 chars).');return;}
    endpoint='/auth/signup';
    payload={name:name,email:email,password:pass};
  }else{
    var lemail=document.getElementById('li-email').value.trim();
    var lpass=document.getElementById('li-pass').value;
    if(!lemail||!lpass){alert('Please fill in all fields.');return;}
    endpoint='/auth/login';
    payload={email:lemail,password:lpass};
  }
  var oldTxt=btn.textContent;btn.textContent='Please wait…';btn.disabled=true;
  try{
    var r=await fetch(PROXY_URL+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var d=await r.json();
    if(!r.ok){alert(d.error||'Something went wrong. Please try again.');btn.textContent=oldTxt;btn.disabled=false;return;}
    localStorage.setItem('tara_token',d.token);
    localStorage.setItem('tara_user',JSON.stringify(d.user));
    document.getElementById('auth-su').style.display='none';
    document.getElementById('auth-li').style.display='none';
    document.getElementById('auth-ok').style.display='block';
    document.getElementById('auth-ok-title').textContent=type==='signup'?'Account created! 🎉':'Welcome back! 👋';
    updateAuthUI();
    setTimeout(()=>document.getElementById('auth-modal').style.display='none',1800);
  }catch(e){
    alert('Network error. Please try again.');
  }
  btn.textContent=oldTxt;btn.disabled=false;
}

function logout(){
  var token=localStorage.getItem('tara_token');
  if(token) fetch(PROXY_URL+'/auth/logout',{method:'POST',headers:{'Authorization':'Bearer '+token}}).catch(()=>{});
  localStorage.removeItem('tara_token');
  localStorage.removeItem('tara_user');
  updateAuthUI();
}

function updateAuthUI(){
  var token=localStorage.getItem('tara_token');
  var userRaw=localStorage.getItem('tara_user');
  var navRight=document.querySelector('.nav-right');
  if(token&&userRaw){
    var user=JSON.parse(userRaw);
    navRight.innerHTML='<span style="font-size:13.5px;color:var(--s2);margin-right:4px">Hi, '+user.name.split(' ')[0]+'</span><button class="nbtn ghost" onclick="logout()">Log out</button>';
  }else{
    navRight.innerHTML='<button class="nbtn ghost" onclick="showAuth(\'login\')">Log in</button><button class="nbtn solid" onclick="showAuth(\'signup\')">Sign up free</button>';
  }
}

// Show logged-in/out state immediately from localStorage — no waiting on network
updateAuthUI();

// Quietly verify the session in the background. Only log the user out if the
// server explicitly says the session is invalid/expired (401) — never on a
// network hiccup or slow connection, so a new tab doesn't wrongly log you out.
(async function verifySession(){
  var token=localStorage.getItem('tara_token');
  if(!token)return;
  try{
    var r=await fetch(PROXY_URL+'/auth/me',{headers:{'Authorization':'Bearer '+token}});
    if(r.status===401){
      localStorage.removeItem('tara_token');
      localStorage.removeItem('tara_user');
      updateAuthUI();
    }else if(r.ok){
      var d=await r.json();
      localStorage.setItem('tara_user',JSON.stringify(d.user));
      updateAuthUI();
    }
    // any other response (network issue, server hiccup) — stay logged in, don't touch it
  }catch(e){ /* network error — stay logged in */ }
})();
