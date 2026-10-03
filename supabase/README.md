# إعداد Supabase لـ Chatter

1. أنشئ مشروعًا في Supabase.
2. افتح SQL Editor وشغّل `schema.sql` كاملًا.
3. من Project Settings > API انسخ Project URL و anon/publishable key.
4. افتح `frontend/js/config.js` وضع القيم مكان العناصر الموجودة.
5. من Authentication > Providers فعّل Email أو Phone حسب ما تريد.
6. إذا فعّلت Email confirmation، يجب على المستخدم تأكيد البريد قبل الدخول.
7. فعّل Realtime لجدول `messages` (الـSQL يضيفه إلى publication).

لا تضع Service Role Key داخل الواجهة. استخدم فقط المفتاح العام (anon/publishable).
