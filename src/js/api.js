import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Chatter: missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const api = {
  client: sb,
  async register(payload) {
    const credentials = payload.email
      ? { email: payload.email, password: payload.password }
      : { phone: payload.phone, password: payload.password };
    const { data, error } = await sb.auth.signUp({
      ...credentials,
      options: { data: { name: payload.name } }
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("EMAIL_CONFIRMATION_REQUIRED");
    return { token: data.session.access_token, user: normalizeUser(data.user) };
  },
  async login(identifier,password) {
    const credentials = identifier.includes("@")
      ? { email: identifier, password }
      : { phone: identifier, password };
    const { data, error } = await sb.auth.signInWithPassword(credentials);
    if (error) throw new Error(error.message);
    return { token: data.session.access_token, user: normalizeUser(data.user) };
  },
  async me() {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) throw new Error("UNAUTHENTICATED");
    const { data: profile, error: pe } = await sb.from("profiles").select("*").eq("id",user.id).single();
    if (pe) throw pe;
    return { user: { ...normalizeUser(user), ...profile } };
  },
  async chats() {
    const { data: memberships, error } = await sb.from("chat_members").select("chat_id, user_id, chats(id, created_at)");
    if (error) throw error;
    const mine = memberships || [];
    const chatIds = mine.map(x=>x.chat_id);
    if (!chatIds.length) return { chats: [] };
    const { data: members, error: me } = await sb.from("chat_members").select("chat_id,user_id,profiles(id,name,email,phone)").in("chat_id",chatIds);
    if (me) throw me;
    const { data: messages, error: msgErr } = await sb.from("messages").select("id,chat_id,sender_id,body,created_at").in("chat_id",chatIds).order("created_at",{ascending:false});
    if (msgErr) throw msgErr;
    const lastByChat = {};
    (messages||[]).forEach(m=>{ if(!lastByChat[m.chat_id]) lastByChat[m.chat_id]=m; });
    const userId=(await sb.auth.getUser()).data.user.id;
    const result=chatIds.map(id=>{
      const other=(members||[]).find(m=>m.chat_id===id && m.user_id!==userId);
      const last=lastByChat[id];
      return {id,other_user_id:other?.user_id,other_user_name:other?.profiles?.name||"محادثة",last_message:last?.body||"",last_message_at:last?.created_at||null};
    }).sort((a,b)=>new Date(b.last_message_at||0)-new Date(a.last_message_at||0));
    return {chats:result};
  },
  async messages(chatId) {
    const { data, error } = await sb.from("messages").select("id,chat_id,sender_id,body,created_at").eq("chat_id",chatId).order("created_at",{ascending:true});
    if(error) throw error;
    return {messages:data||[]};
  },
  async sendMessage(chatId,body) {
    const { data: { user }, error: ue }=await sb.auth.getUser();
    if(ue||!user) throw new Error("UNAUTHENTICATED");
    const {data,error}=await sb.from("messages").insert({chat_id:chatId,sender_id:user.id,body}).select("id,chat_id,sender_id,body,created_at").single();
    if(error) throw error;
    return {message:data};
  },
  async contacts(q="") {
    let query=sb.from("profiles").select("id,name,email,phone").neq("id",(await sb.auth.getUser()).data.user.id).order("name").limit(50);
    if(q) query=query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    const {data,error}=await query;
    if(error) throw error;
    return {contacts:data||[]};
  },
  async createChat(userId) {
    const {data,error}=await sb.rpc("get_or_create_chat",{other_user:userId});
    if(error) throw error;
    return {chatId:data};
  }
};
function normalizeUser(user){ return {id:user.id,name:user.user_metadata?.name||user.phone||user.email||"Chatter User",email:user.email||null,phone:user.phone||null}; }
