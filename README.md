# 🏪 منصة إدارة المتاجر SaaS

نظام سحابي متعدد المتاجر — كل متجر مستقل ببيانات وحسابات منفصلة، مع لوحة تحكم مركزية للمشرف العام.

---

## 🚀 النشر السريع (5 دقائق)

### الخيار 1: Railway.app (الأسهل والأسرع) ⭐ مُوصى به

1. **سجّل في Railway**: https://railway.app
2. **ارفع الملفات** إلى GitHub
3. في Railway اختر **"Deploy from GitHub"**
4. اختر المستودع — سيبدأ تلقائياً
5. في **Variables** أضف:
   ```
   PORT=3000
   SESSION_SECRET=your_random_secret_here
   ```
6. في **Volumes** أنشئ Volume وربطه بـ `/app/data`
7. **احصل على الرابط** من القسم **Deployments** ✅

---

### الخيار 2: Render.com (مجاني مع قرص دائم)

1. **سجّل في Render**: https://render.com
2. اختر **New → Web Service**
3. ربط GitHub Repository
4. Render سيقرأ `render.yaml` تلقائياً
5. **Start Command**: `node server.js`
6. اضغط **Deploy** ✅

> ملاحظة: الخطة المجانية على Render تُوقف التطبيق بعد 15 دقيقة خمول.

---

### الخيار 3: VPS / خادم خاص (Ubuntu)

```bash
# 1. ثبّت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. ارفع الملفات
git clone https://github.com/your-repo/matjar-saas.git
cd matjar-saas

# 3. شغّل مؤقتاً للاختبار
node server.js

# 4. تشغيل دائم مع PM2
sudo npm install -g pm2
pm2 start server.js --name matjar
pm2 save
pm2 startup

# 5. Nginx كـ Reverse Proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/matjar
```

**إعداد Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/matjar /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. HTTPS مجاني مع Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

### الخيار 4: محلياً (للتطوير والشبكة المحلية)

```bash
node server.js
# أو بمنفذ مخصص:
PORT=8080 node server.js
```

---

## 📋 بيانات الدخول الافتراضية

### المشرف العام (لوحة التحكم)
```
الرابط:    /admin
المستخدم:  superadmin
كلمة المرور: superadmin123
```
> **غيّر كلمة المرور فوراً** من لوحة التحكم → الإعدادات

---

## 🏗 هيكل النظام

```
منصة المتاجر SaaS
├── /                   ← صفحة الهبوط (تسجيل متاجر جديدة)
├── /admin              ← لوحة تحكم المشرف العام
└── /store/{slug}       ← واجهة كل متجر

ملفات الخادم:
├── server.js           ← الخادم الرئيسي (Node.js بدون مكتبات)
├── package.json
├── Procfile            ← للنشر على Heroku
├── railway.json        ← للنشر على Railway
├── render.yaml         ← للنشر على Render
├── data/
│   ├── saas.json       ← قاعدة بيانات المنصة (المتاجر، المشرفون)
│   └── stores/
│       └── {id}.json   ← قاعدة بيانات كل متجر منفصلة
└── public/
    ├── index.html      ← صفحة الهبوط
    ├── admin.html      ← لوحة تحكم المشرف
    ├── store.html      ← واجهة المتجر
    ├── css/styles.css
    └── js/
        ├── app.js      ← منطق التطبيق + نظام الأدوار
        └── sections2.js← الأقسام (مبيعات، مخزون، تقارير...)
```

---

## 👥 نظام الأدوار (داخل كل متجر)

| الدور | الصلاحيات |
|---|---|
| 👑 **مدير عام** | كل الصلاحيات |
| 🧑‍💼 **مدير مساعد** | كل شيء إلا المستخدمين والإعدادات |
| 🛒 **بائع** | فواتير البيع + عرض المخزون + الزبناء |
| 📦 **مشتري** | فواتير الشراء + المخزون + الموردون |
| 💰 **محاسب** | المبيعات + المشتريات + الدفعات + التقارير |

---

## 📊 خطط الاشتراك (قابلة للتخصيص)

| الخطة | المتجر | المستخدمون | الميزات |
|---|---|---|---|
| 🆓 **مجاني** | 1 | حتى 3 | كل المميزات الأساسية |
| ⭐ **احترافي** | 1 | غير محدود | + تقارير متقدمة + أولوية الدعم |
| 🏢 **مؤسسي** | غير محدود | غير محدود | + API + تخصيص كامل |

---

## ⚙️ متغيرات البيئة

| المتغير | الوصف | الافتراضي |
|---|---|---|
| `PORT` | منفذ الخادم | 3000 |
| `HOST` | عنوان الاستماع | 0.0.0.0 |
| `SESSION_SECRET` | مفتاح تشفير الجلسات | عشوائي |
| `DATA_DIR` | مسار البيانات | ./data |

---

## 🔒 الأمان

- كلمات المرور مشفرة بـ **PBKDF2-SHA256** (100,000 تكرار)
- الجلسات آمنة بـ **HttpOnly Cookies**
- كل متجر معزول تماماً عن الآخرين
- لا توجد مكتبات خارجية = سطح هجوم أصغر

---

## 🔄 النسخ الاحتياطي

من لوحة التحكم يمكن تصدير بيانات أي متجر كـ JSON.

للنسخ الاحتياطي الكامل للخادم:
```bash
# نسخ مجلد data
cp -r /app/data /backup/data-$(date +%Y%m%d)

# أو ضغطه
tar -czf backup-$(date +%Y%m%d).tar.gz /app/data
```
