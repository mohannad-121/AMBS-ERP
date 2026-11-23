# AMBS ERP

هاد مشروع ويب مستقل لنظام AMBS. إعدادات Supabase بتبدأ فاضية. قاعدة البيانات اللي رح تستخدمها هي مشروع Supabase جديد من حسابك. تشغيل الواجهة على جهازك بيفتح السيرفر للعرض فقط.

## تشغيل الواجهة على جهازك

بعد فك الضغط، افتح Terminal داخل مجلد المشروع وشغّل:

```bash
npm start
```

افتح [http://127.0.0.1:4173](http://127.0.0.1:4173). قبل الربط رح تظهر شاشة **Supabase setup**.

## الربط بمشروع Supabase جديد

1. اعمل مشروع Supabase جديد خاص بالـERP.
2. اربط المجلد بالمشروع الجديد من Supabase CLI وشغّل الـmigration والـEdge Function:

   ```bash
   supabase login
   supabase link --project-ref YOUR_NEW_PROJECT_REF
   supabase db push
   supabase functions deploy ambs-erp
   ```

3. افتح `supabase/bootstrap-admin.example.sql` وبدّل الإيميل التجريبي بإيميل المسؤول. نفّذ الـSQL على **المشروع الجديد**.
4. فعّل تسجيل الدخول بالإيميل وتأكيده في Supabase Auth، واضبط **Site URL** على رابط الواجهة. البريد التجريبي المدمج في Supabase قد يقيّد المستلمين، فاضبط SMTP للمشروع إذا احتجته.
5. حط **Project URL** والـ**Publishable key** في `public/assets/config.js`. إذا بدك تنشر الواجهة، مجلد النشر هو `public`.
6. من الواجهة اختَر **Set up account**، أدخل إيميل المسؤول وكلمة سر، أكّد الإيميل، وبعدها سجّل الدخول. إذا بدك تنقل بيانات النسخة السابقة، صدّر **JSON Backup** منها واستورده من **Settings → Import Backup** بالحساب المسؤول.

## الملفات

- `public/index.html` و`public/assets/app.css` هيكل الواجهة والتصميم.
- `public/assets/app.js` كود الشاشات وعمليات النظام والربط.
- `public/assets/catalog.js` كتالوج القطع المرفق.
- `supabase/migrations/` قاعدة بيانات الـERP والصلاحيات.
- `supabase/functions/ambs-erp/` كود الـAPI والتحقق من الدخول والسجلات.
- `server.mjs` سيرفر تشغيل الواجهة محليًا.
