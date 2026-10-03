# نشر Chatter على Supabase + Vercel/Netlify

## A. Supabase
1. Create new project.
2. SQL Editor → New query.
3. Paste `supabase/schema.sql` → Run.
4. Authentication → Providers → فعّل Email أو Phone.
5. Project Settings → API → انسخ Project URL و Publishable/anon key إلى `frontend/js/config.js`.

## B. Frontend
- Vercel: ارفع مجلد `frontend` كمشروع Static، أو اربط GitHub. لا يوجد Build command.
- Netlify: Publish directory = `frontend`.
- Cloudflare Pages: Framework = None، Build command فارغ، Output directory = `frontend`.

## C. Email confirmation
إذا كان Confirm email مفعّلًا، التسجيل سيطلب من المستخدم تأكيد البريد قبل تسجيل الدخول. اضبط Site URL/Redirect URLs في Authentication > URL Configuration على رابط موقعك.

## D. الهاتف
Phone Auth يحتاج مزود SMS وإعدادًا من Supabase. لا تستخدمه في الإنتاج قبل ضبط مزود الرسائل.

## E. الأمان
RLS مفعّل في SQL. لا تستخدم Service Role Key في المتصفح.
