import { api } from "./api.js";
let currentUser=null;
let chatRows=[];
let activeChat=null;
let realtime=null;
let authMode="phone";
let isLogin=false;

const $=id=>document.getElementById(id);
const show=s=>document.querySelectorAll(".screen").forEach(x=>x.classList.toggle("hidden",x.id!==`screen-${s}`));
const toast=(msg)=>{ $("toast").textContent=msg; $("toast").classList.remove("hidden"); setTimeout(()=>$("toast").classList.add("hidden"),2200); };

function setAuthMode(mode){
  authMode=mode;
  document.querySelectorAll(".segment").forEach(b=>b.classList.toggle("active",b.dataset.auth===mode));
  $("contact-label").textContent=mode==="email"?"البريد الإلكتروني":"رقم الهاتف";
  $("identifier").placeholder=mode==="email"?"name@example.com":"+212 6 00 00 00 00";
  $("identifier").type=mode==="email"?"email":"tel";
}
function configureAuth(){
  $("auth-title").textContent=isLogin?"تسجيل الدخول":"إنشاء حساب";
  $("auth-subtitle").textContent=isLogin?"سجّل الدخول للعودة إلى محادثاتك.":"أنشئ حسابك وابدأ المحادثة.";
  $("name-label").classList.toggle("hidden",isLogin);
  $("name").classList.toggle("hidden",isLogin);
  $("auth-submit").textContent=isLogin?"تسجيل الدخول":"إنشاء حساب";
  $("auth-switch").textContent=isLogin?"إنشاء حساب جديد":"لدي حساب بالفعل";
  document.querySelector(".segmented").classList.toggle("hidden",isLogin);
}
function nav(screen){
  if(screen==="contacts") loadContacts();
  if(screen==="chats") loadChats();
  show(screen);
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.screen===screen));
}
function connectRealtime(){
  if(!api.client) return;
  if(realtime) api.client.removeChannel(realtime);
  realtime=api.client.channel("chatter-messages")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
      const msg=payload.new;
      if(activeChat && String(activeChat.id)===String(msg.chat_id)) appendMessage(msg);
      loadChats();
    }).subscribe();
}
async function loadChats(){
  try{
    const data=await api.chats();
    chatRows=data.chats||[];
    renderChats();
  }catch(e){ if(e.status===401) logout(); else toast("تعذر تحميل المحادثات"); }
}
function renderChats(){
  const q=$("search").value.trim().toLowerCase();
  const rows=chatRows.filter(c=>(c.other_user_name||"").toLowerCase().includes(q));
  $("chat-list").innerHTML=rows.map(c=>`
    <article class="chat-row" data-id="${c.id}">
      <div class="avatar">${(c.other_user_name||"?")[0]}</div>
      <div class="chat-main"><div class="chat-line"><strong>${escapeHtml(c.other_user_name)}</strong><span class="chat-time">${time(c.last_message_at)}</span></div>
      <div class="chat-preview"><span>${escapeHtml(c.last_message||"ابدأ المحادثة")}</span></div></div>
    </article>`).join("");
  $("empty").classList.toggle("hidden",rows.length!==0);
  $("chat-list").querySelectorAll(".chat-row").forEach(r=>r.onclick=()=>openChat(Number(r.dataset.id)));
}
async function openChat(id){
  const row=chatRows.find(c=>Number(c.id)===Number(id));
  if(!row)return;
  activeChat={...row};
  $("chat-name").textContent=row.other_user_name;
  $("chat-avatar").textContent=(row.other_user_name||"?")[0];
  try{
    const data=await api.messages(id);
    $("messages").innerHTML="";
    data.messages.forEach(appendMessage);
        show("chat");
    scrollMessages();
  }catch(e){toast("تعذر تحميل الرسائل");}
}
function appendMessage(m){
  const mine=Number(m.sender_id)===Number(currentUser.id);
  const div=document.createElement("div");
  div.className=`message ${mine?"out":"in"}`;
  div.textContent=m.body;
  $("messages").appendChild(div);
  scrollMessages();
}
function scrollMessages(){ $("messages").scrollTop=$("messages").scrollHeight; }
async function loadContacts(q=""){
  try{
    const data=await api.contacts(q);
    const html=(data.contacts||[]).map(u=>`<div class="contact-row"><div class="avatar">${u.name[0]}</div><div><strong>${escapeHtml(u.name)}</strong><small>${escapeHtml(u.email||u.phone||"")}</small></div></div>`).join("");
    $("contacts").innerHTML=html||`<div class="empty-state">لا توجد جهات اتصال.</div>`;
    $("modal-contacts").innerHTML=(data.contacts||[]).map(u=>`<button data-user="${u.id}"><div class="avatar">${u.name[0]}</div>${escapeHtml(u.name)}</button>`).join("");
    $("modal-contacts").querySelectorAll("button").forEach(b=>b.onclick=()=>createChat(Number(b.dataset.user)));
  }catch(e){toast("تعذر تحميل جهات الاتصال");}
}
async function createChat(userId){
  try{
    const data=await api.createChat(userId);
    closeModal();
    await loadChats();
    openChat(data.chatId);
  }catch(e){toast("تعذر إنشاء المحادثة");}
}
function logout(){
  currentUser=null; activeChat=null; api.client.auth.signOut();
  if(realtime) { api.client.removeChannel(realtime); realtime=null; }
  isLogin=false; configureAuth(); show("auth");
}
function time(v){ if(!v)return ""; const d=new Date(v); return d.toLocaleTimeString("ar-MA",{hour:"2-digit",minute:"2-digit"}); }
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function openModal(){ $("modal").classList.remove("hidden"); loadContacts(); }
function closeModal(){ $("modal").classList.add("hidden"); }

document.querySelectorAll(".segment").forEach(b=>b.onclick=()=>setAuthMode(b.dataset.auth));
$("toggle-password").onclick=()=>{const p=$("password");p.type=p.type==="password"?"text":"password";$("toggle-password").textContent=p.type==="password"?"إظهار":"إخفاء"};
$("auth-switch").onclick=()=>{isLogin=!isLogin;configureAuth()};
$("auth-form").onsubmit=async e=>{
  e.preventDefault();
  try{
    let result;
    if(isLogin) result=await api.login($("identifier").value,$("password").value);
    else result=await api.register({name:$("name").value,phone:authMode==="phone"?$("identifier").value:null,email:authMode==="email"?$("identifier").value:null,password:$("password").value});
    currentUser=result.user; connectRealtime(); await loadChats(); nav("chats");
  }catch(err){
    const map={EMAIL_CONFIRMATION_REQUIRED:"تحقق من بريدك الإلكتروني ثم سجّل الدخول",USER_EXISTS:"الحساب موجود مسبقاً",INVALID_CREDENTIALS:"بيانات الدخول غير صحيحة",PASSWORD_TOO_SHORT:"كلمة المرور يجب أن تكون 8 أحرف على الأقل",VALIDATION_ERROR:"تحقق من البيانات"};
    toast(map[err.message]||"حدث خطأ");
  }
};
$("search").oninput=renderChats;
$("contact-search").oninput=e=>loadContacts(e.target.value);
$("back").onclick=()=>nav("chats");
$("open-settings").onclick=()=>nav("settings");
$("logout").onclick=logout;
$("new-chat").onclick=openModal;
$("fab").onclick=openModal;
$("close-modal").onclick=closeModal;
document.querySelector(".modal-backdrop").onclick=closeModal;
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>nav(b.dataset.screen));
$("composer").onsubmit=async e=>{
  e.preventDefault();
  const input=$("message"), body=input.value.trim();
  if(!body||!activeChat)return;
  try{ await api.sendMessage(activeChat.id,body); input.value=""; }
  catch(e){toast("تعذر إرسال الرسالة");}
};

(async()=>{
  try{
    const {data}=await api.client.auth.getSession();
    if(data.session){ const me=await api.me(); currentUser=me.user; connectRealtime(); await loadChats(); nav("chats"); }
    else { configureAuth(); show("auth"); }
  }catch{ configureAuth(); show("auth"); }
})();