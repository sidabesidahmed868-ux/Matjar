#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   نظام متاجر SaaS — الخادم الرئيسي                 ║
 * ║   يخدم عدة متاجر على نفس الخادم                    ║
 * ║   بدون مكتبات خارجية (Node.js stdlib فقط)          ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * التشغيل:    node server.js
 * المنفذ:     http://localhost:3000
 * لوحة التحكم: http://localhost:3000/admin
 *
 * هيكل البيانات:
 *   data/
 *     saas.json          ← قاعدة بيانات النظام (المتاجر والمشرفون)
 *     stores/
 *       {storeId}.json   ← قاعدة بيانات كل متجر منفصلة
 */

"use strict";

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");
const urlMod = require("url");
const os     = require("os");

/* ══════════════════════════════════════════
   الإعدادات
══════════════════════════════════════════ */
const PORT        = parseInt(process.env.PORT || 3000);
const HOST        = "0.0.0.0";
const DATA_DIR    = path.join(__dirname, "data");
const STORES_DIR  = path.join(DATA_DIR, "stores");
const SAAS_FILE   = path.join(DATA_DIR, "saas.json");
const PUBLIC_DIR  = path.join(__dirname, "public");
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 ساعات

/* ══════════════════════════════════════════
   تشفير PBKDF2
══════════════════════════════════════════ */
function pwHash(pw, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(pw, salt, 100000, 32, "sha256");
  return { hash: hash.toString("hex"), salt: salt.toString("hex") };
}
function pwVerify(pw, hash, salt) {
  return pwHash(pw, salt).hash === hash;
}

/* ══════════════════════════════════════════
   قاعدة بيانات النظام (SaaS)
   تحتوي على: المتاجر، المشرف العام
══════════════════════════════════════════ */
const SaasDB = {
  _d: null,

  _defaults() {
    return {
      version: 1,
      superadmin: {
        username: "superadmin",
        password_hash: null,
        salt: null,
        email: "admin@matjar.app",
      },
      stores: [],           // قائمة المتاجر المسجلة
      counters: { stores: 0 },
      settings: {
        app_name: "منصة المتاجر",
        app_url: `http://localhost:${PORT}`,
        allow_registration: true,
        max_stores: 100,
        plan_labels: { free: "مجاني", pro: "احترافي", enterprise: "مؤسسي" },
      },
    };
  },

  get() {
    if (this._d) return this._d;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (!fs.existsSync(STORES_DIR)) fs.mkdirSync(STORES_DIR, { recursive: true });
      if (fs.existsSync(SAAS_FILE)) {
        this._d = JSON.parse(fs.readFileSync(SAAS_FILE, "utf8"));
        return this._d;
      }
    } catch (e) { console.error("[SaasDB]", e.message); }
    this._d = this._defaults();
    // تهيئة كلمة مرور المشرف
    if (!this._d.superadmin.password_hash) {
      const { hash, salt } = pwHash("superadmin123");
      this._d.superadmin.password_hash = hash;
      this._d.superadmin.salt = salt;
    }
    this.flush();
    return this._d;
  },

  save()  { setTimeout(() => this.flush(), 300); },
  flush() {
    try { fs.writeFileSync(SAAS_FILE, JSON.stringify(this._d, null, 2)); }
    catch (e) { console.error("[SaasDB flush]", e.message); }
  },

  nextId(col) {
    const d = this.get();
    d.counters[col] = (d.counters[col] || 0) + 1;
    return d.counters[col];
  },

  getStore(id)   { return this.get().stores.find(s => String(s.id) === String(id)) || null; },
  getStoreBySlug(slug) { return this.get().stores.find(s => s.slug === slug) || null; },
};

/* ══════════════════════════════════════════
   قاعدة بيانات المتجر الواحد
══════════════════════════════════════════ */
const StoreDB = {
  _cache: {},

  _file(storeId) { return path.join(STORES_DIR, `${storeId}.json`); },

  _defaults(store) {
    return {
      products: [], customers: [], suppliers: [],
      sales: [], purchases: [], payments: [], users: [],
      settings: {
        store_name: store.name,
        store_address: store.address || "",
        store_phone: store.phone || "",
        low_stock_default: 5,
        next_sale_number: 1,
        next_purchase_number: 1,
      },
      counters: { products:0,customers:0,suppliers:0,sales:0,purchases:0,payments:0,users:0 },
    };
  },

  get(storeId) {
    if (this._cache[storeId]) return this._cache[storeId];
    const file = this._file(storeId);
    try {
      if (fs.existsSync(file)) {
        this._cache[storeId] = JSON.parse(fs.readFileSync(file, "utf8"));
        return this._cache[storeId];
      }
    } catch (e) { console.error(`[StoreDB ${storeId}]`, e.message); }
    return null;
  },

  init(storeId, storeMeta) {
    if (this._cache[storeId]) return this._cache[storeId];
    const data = this._defaults(storeMeta);
    this._cache[storeId] = data;
    this.flush(storeId);
    return data;
  },

  save(storeId)  {
    clearTimeout(this._timers?.[storeId]);
    this._timers = this._timers || {};
    this._timers[storeId] = setTimeout(() => this.flush(storeId), 400);
  },

  flush(storeId) {
    const data = this._cache[storeId];
    if (!data) return;
    try { fs.writeFileSync(this._file(storeId), JSON.stringify(data, null, 2)); }
    catch (e) { console.error(`[StoreDB flush ${storeId}]`, e.message); }
  },

  nextId(storeId, col) {
    const d = this.get(storeId);
    if (!d) return 1;
    d.counters[col] = (d.counters[col] || 0) + 1;
    return d.counters[col];
  },

  findById(list, id) { return list.find(x => Number(x.id) === Number(id)) || null; },

  invoiceNo(storeId, kind) {
    const d = this.get(storeId);
    if (!d) return "ERR";
    const year = new Date().getFullYear();
    const pfx  = kind === "sale" ? "INV" : "PUR";
    const key  = kind === "sale" ? "next_sale_number" : "next_purchase_number";
    const n    = d.settings[key] || 1;
    d.settings[key] = n + 1;
    return `${pfx}-${year}-${String(n).padStart(5,"0")}`;
  },

  /* أحجام قواعد البيانات للإحصائيات */
  getStats(storeId) {
    const d = this.get(storeId);
    if (!d) return {};
    const today = new Date().toISOString().slice(0,10);
    return {
      products:  d.products.length,
      customers: d.customers.length,
      suppliers: d.suppliers.length,
      sales:     d.sales.length,
      purchases: d.purchases.length,
      users:     d.users.length,
      todaySales: d.sales.filter(s => (s.date||"").slice(0,10) === today).length,
      todayRevenue: d.sales.filter(s => (s.date||"").slice(0,10) === today)
                          .reduce((sum,s) => sum + Number(s.grand_total||0), 0),
    };
  },
};

/* ══════════════════════════════════════════
   الجلسات
══════════════════════════════════════════ */
const sessions = new Map();

function sessCreate(payload) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { ...payload, at: Date.now() });
  return token;
}
function sessGet(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || Date.now() - s.at > SESSION_TTL) { sessions.delete(token); return null; }
  return s;
}
function sessDel(token) { sessions.delete(token); }

function getCookie(req, name) {
  const m = (req.headers.cookie||"").match(new RegExp(`${name}=([^;]+)`));
  return m ? m[1] : null;
}
function setCookie(res, name, value, maxAge = SESSION_TTL/1000) {
  res.setHeader("Set-Cookie", `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}
function clearCookie(res, name) {
  res.setHeader("Set-Cookie", `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

// الحصول على بيانات الجلسة (قد تكون متجر أو superadmin)
function getSession(req) {
  const token = getCookie(req, "msession");
  return sessGet(token);
}

/* ══════════════════════════════════════════
   مساعدات HTTP
══════════════════════════════════════════ */
function readBody(req) {
  return new Promise((res, rej) => {
    let d = "";
    req.on("data", c => { d += c; if (d.length > 10e6) rej(new Error("too large")); });
    req.on("end",  () => { try { res(JSON.parse(d||"{}")); } catch { res({}); } });
    req.on("error", rej);
  });
}

function json(res, data, code = 200) {
  const b = JSON.stringify(data);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(b) });
  res.end(b);
}

function now() {
  const d=new Date(), p=x=>String(x).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function today() {
  const d=new Date(), p=x=>String(x).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

/* ══════════════════════════════════════════
   MIME types
══════════════════════════════════════════ */
const MIME = {
  ".html":"text/html;charset=utf-8", ".js":"application/javascript;charset=utf-8",
  ".css":"text/css;charset=utf-8",   ".json":"application/json",
  ".png":"image/png", ".ico":"image/x-icon", ".svg":"image/svg+xml",
};

function serveFile(res, fp) {
  const ext = path.extname(fp);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not Found"); return; }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

/* ══════════════════════════════════════════
   توليد Slug من اسم المتجر
══════════════════════════════════════════ */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || `store${Date.now()}`;
}

function uniqueSlug(base) {
  const saas = SaasDB.get();
  let slug = toSlug(base), i = 2;
  while (saas.stores.some(s => s.slug === slug)) slug = toSlug(base) + i++;
  return slug;
}

/* ══════════════════════════════════════════
   Router
══════════════════════════════════════════ */
const routes = {};
const R = (m, p, fn) => { routes[`${m} ${p}`] = fn; };

function matchRoute(method, pathname) {
  const key = `${method} ${pathname}`;
  if (routes[key]) return { fn: routes[key], pm: {} };
  for (const [k, fn] of Object.entries(routes)) {
    const [m, p] = k.split(" ");
    if (m !== method || !p.includes(":")) continue;
    const rp = p.split("/"), pp = pathname.split("/");
    if (rp.length !== pp.length) continue;
    const pm = {}; let ok = true;
    for (let i = 0; i < rp.length; i++) {
      if (rp[i].startsWith(":")) pm[rp[i].slice(1)] = pp[i];
      else if (rp[i] !== pp[i]) { ok = false; break; }
    }
    if (ok) return { fn, pm };
  }
  return null;
}

/* ══════════════════════════════════════════
   ─── API لوحة التحكم المركزية (SuperAdmin) ───
══════════════════════════════════════════ */

/* تسجيل دخول المشرف العام */
R("POST", "/admin/api/login", async (req, res) => {
  const { username, password } = await readBody(req);
  const sa = SaasDB.get().superadmin;
  if (username !== sa.username || !pwVerify(password, sa.password_hash, sa.salt))
    return json(res, { success: false, message: "بيانات الدخول غير صحيحة" }, 401);
  const token = sessCreate({ type: "superadmin" });
  setCookie(res, "sadmin", token);
  json(res, { success: true });
});

R("POST", "/admin/api/logout", (req, res) => {
  sessDel(getCookie(req, "sadmin"));
  clearCookie(res, "sadmin");
  json(res, { success: true });
});

R("GET", "/admin/api/me", (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  json(res, { success: true, role: "superadmin" });
});

/* ── قائمة المتاجر ── */
R("GET", "/admin/api/stores", (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  const stores = SaasDB.get().stores.map(store => ({
    ...store,
    stats: StoreDB.getStats(store.id),
  }));
  json(res, { success: true, data: stores });
});

/* ── إنشاء متجر جديد ── */
R("POST", "/admin/api/stores", async (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);

  const b = await readBody(req);
  const { name, owner_name, owner_email, owner_phone, address, phone, plan = "free" } = b;
  if (!name || !owner_name) return json(res, { success: false, message: "اسم المتجر واسم المالك مطلوبان" }, 400);

  const saas  = SaasDB.get();
  const id    = SaasDB.nextId("stores");
  const slug  = uniqueSlug(name);
  const store = {
    id, slug, name, owner_name, owner_email: owner_email || "",
    owner_phone: owner_phone || "", address: address || "",
    phone: phone || "", plan,
    status: "active",
    created_at: now(),
    last_activity: now(),
  };
  saas.stores.push(store);
  SaasDB.save();

  // تهيئة قاعدة بيانات المتجر
  const storeData = StoreDB.init(id, store);

  // إنشاء مستخدم مدير افتراضي للمتجر
  const { hash, salt } = pwHash("admin123");
  storeData.users.push({
    id: StoreDB.nextId(id, "users"),
    username: "admin",
    full_name: owner_name,
    role: "admin",
    password_hash: hash,
    salt,
    active: true,
  });
  StoreDB.flush(id);

  json(res, {
    success: true,
    data: store,
    access_url: `/store/${slug}`,
    message: `تم إنشاء المتجر "${name}" بنجاح`,
  });
});

/* ── تعديل متجر ── */
R("PUT", "/admin/api/stores/:id", async (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);

  const b = await readBody(req);
  const store = SaasDB.getStore(req._pm.id);
  if (!store) return json(res, { success: false, message: "المتجر غير موجود" }, 404);

  const allowed = ["name","owner_name","owner_email","owner_phone","address","phone","plan","status"];
  for (const k of allowed) if (k in b) store[k] = b[k];
  store.last_activity = now();

  // تحديث اسم المتجر في قاعدة بياناته
  const storeData = StoreDB.get(store.id);
  if (storeData && b.name) storeData.settings.store_name = b.name;
  if (storeData) StoreDB.save(store.id);

  SaasDB.save();
  json(res, { success: true, data: store });
});

/* ── تعليق / تفعيل متجر ── */
R("PUT", "/admin/api/stores/:id/status", async (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  const { status } = await readBody(req);
  const store = SaasDB.getStore(req._pm.id);
  if (!store) return json(res, { success: false, message: "المتجر غير موجود" }, 404);
  store.status = status;
  SaasDB.save();
  json(res, { success: true, message: `تم تغيير حالة المتجر إلى "${status}"` });
});

/* ── إحصائيات عامة ── */
R("GET", "/admin/api/stats", (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  const stores = SaasDB.get().stores;
  const active = stores.filter(s => s.status === "active").length;
  const plans  = { free: 0, pro: 0, enterprise: 0 };
  for (const st of stores) plans[st.plan] = (plans[st.plan] || 0) + 1;
  json(res, { success: true, data: { total: stores.length, active, suspended: stores.length - active, plans } });
});

/* ── تغيير كلمة مرور المشرف ── */
R("PUT", "/admin/api/password", async (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  const { current, newPassword } = await readBody(req);
  const sa = SaasDB.get().superadmin;
  if (!pwVerify(current, sa.password_hash, sa.salt))
    return json(res, { success: false, message: "كلمة المرور الحالية غير صحيحة" }, 401);
  const r = pwHash(newPassword);
  sa.password_hash = r.hash; sa.salt = r.salt;
  SaasDB.save();
  json(res, { success: true, message: "تم تغيير كلمة المرور بنجاح" });
});

/* ── إعدادات المنصة ── */
R("GET", "/admin/api/settings", (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  json(res, { success: true, data: SaasDB.get().settings });
});

R("PUT", "/admin/api/settings", async (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  const b = await readBody(req);
  Object.assign(SaasDB.get().settings, b);
  SaasDB.save();
  json(res, { success: true, message: "تم حفظ الإعدادات" });
});

/* ── تصدير بيانات متجر ── */
R("GET", "/admin/api/stores/:id/export", (req, res) => {
  const s = sessGet(getCookie(req, "sadmin"));
  if (!s || s.type !== "superadmin") return json(res, { success: false }, 401);
  const store = SaasDB.getStore(req._pm.id);
  if (!store) return json(res, { success: false, message: "المتجر غير موجود" }, 404);
  const data = StoreDB.get(store.id);
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Content-Disposition": `attachment; filename="store_${store.slug}_${today()}.json"`,
  });
  res.end(JSON.stringify({ store, data }, null, 2));
});

/* ══════════════════════════════════════════
   ─── API المتجر (Store API) ───
   كل طلب يتحقق من الـ slug أولاً
══════════════════════════════════════════ */

function getStoreFromReq(req) {
  // نستخرج slug من /store/:slug/api/...
  const m = req.url.match(/^\/store\/([^\/]+)\//);
  if (!m) return null;
  return SaasDB.getStoreBySlug(m[1]) || null;
}

function getStoreUser(req) {
  const token = getCookie(req, "msession");
  const sess  = sessGet(token);
  if (!sess || sess.type !== "store") return null;
  const store = SaasDB.getStoreBySlug(sess.storeSlug);
  if (!store) return null;
  const data  = StoreDB.get(store.id);
  if (!data) return null;
  const user = StoreDB.findById(data.users, sess.userId);
  return user && user.active !== false ? { user, store, data } : null;
}

// Middleware بسيط لحقن _pm على الـ req
function injectParams(req, pm) { req._pm = pm; }

/* ── Auth المتجر ── */
R("POST", "/store/:slug/api/auth/login", async (req, res) => {
  const slug = req._pm.slug;
  const store = SaasDB.getStoreBySlug(slug);
  if (!store || store.status !== "active")
    return json(res, { success: false, message: "المتجر غير متاح أو موقوف" }, 403);

  const { username, password } = await readBody(req);
  const data = StoreDB.get(store.id);
  if (!data) return json(res, { success: false, message: "خطأ في قاعدة البيانات" }, 500);

  const u = data.users.find(x => x.username.toLowerCase() === (username||"").toLowerCase());
  if (!u || !u.active || !pwVerify(password, u.password_hash, u.salt))
    return json(res, { success: false, message: "بيانات الدخول غير صحيحة" }, 401);

  // تحديث آخر نشاط للمتجر
  store.last_activity = now();
  SaasDB.save();

  const token = sessCreate({ type: "store", storeSlug: slug, storeId: store.id, userId: u.id });
  setCookie(res, "msession", token);
  json(res, { success: true, user: { id:u.id, username:u.username, full_name:u.full_name, role:u.role }, store: { id:store.id, name:store.name, slug } });
});

R("POST", "/store/:slug/api/auth/logout", (req, res) => {
  sessDel(getCookie(req, "msession"));
  clearCookie(res, "msession");
  json(res, { success: true });
});

R("GET", "/store/:slug/api/auth/me", (req, res) => {
  const ctx = getStoreUser(req);
  if (!ctx) return json(res, { success: false }, 401);
  json(res, { success: true, user: { id:ctx.user.id, username:ctx.user.username, full_name:ctx.user.full_name, role:ctx.user.role }, store: { name:ctx.store.name, slug:ctx.store.slug } });
});

/* ── بناء Routes للمتجر تلقائياً ── */
function storeRoute(method, path_, fn) {
  R(method, `/store/:slug${path_}`, async (req, res) => {
    const ctx = getStoreUser(req);
    if (!ctx) return json(res, { success: false, message: "يرجى تسجيل الدخول", redirect: `/store/${req._pm.slug}` }, 401);
    // تحقق من أن الـ slug يطابق جلسة المستخدم
    if (ctx.store.slug !== req._pm.slug) return json(res, { success: false }, 403);
    await fn(req, res, ctx, req._pm);
  });
}

/* ── الإعدادات ── */
storeRoute("GET",  "/api/settings", (req,res,ctx) => json(res,{success:true,data:ctx.data.settings}));
storeRoute("PUT",  "/api/settings", async (req,res,ctx) => {
  const b = await readBody(req);
  const allowed = ["store_name","store_address","store_phone","low_stock_default"];
  for (const k of allowed) if (k in b) ctx.data.settings[k] = b[k];
  StoreDB.save(ctx.store.id);
  json(res,{success:true,message:"تم حفظ الإعدادات"});
});

/* ── المنتجات ── */
storeRoute("GET","  /api/products",(req,res,ctx)=>json(res,{success:true,data:ctx.data.products}));
storeRoute("GET",  "/api/products",(req,res,ctx)=>json(res,{success:true,data:ctx.data.products}));
storeRoute("POST", "/api/products",async(req,res,ctx)=>{
  const b=await readBody(req); if(!b.name)return json(res,{success:false,message:"الاسم مطلوب"},400);
  const p={id:StoreDB.nextId(ctx.store.id,"products"),name:b.name.trim(),category:(b.category||"").trim(),unit:(b.unit||"").trim(),quantity:Number(b.quantity)||0,purchase_price:Number(b.purchase_price)||0,sale_price:Number(b.sale_price)||0,min_stock:Number(b.min_stock)||0};
  ctx.data.products.push(p); StoreDB.save(ctx.store.id); json(res,{success:true,data:p});
});
storeRoute("PUT",  "/api/products/:pid",async(req,res,ctx,pm)=>{
  const b=await readBody(req); const p=StoreDB.findById(ctx.data.products,pm.pid);
  if(!p)return json(res,{success:false,message:"غير موجود"},404);
  for(const f of["name","category","unit","purchase_price","sale_price","min_stock"])if(f in b)p[f]=["purchase_price","sale_price","min_stock"].includes(f)?Number(b[f]):b[f];
  StoreDB.save(ctx.store.id); json(res,{success:true,data:p});
});
storeRoute("PUT",  "/api/products/:pid/adjust",async(req,res,ctx,pm)=>{
  const{quantity}=await readBody(req); const p=StoreDB.findById(ctx.data.products,pm.pid);
  if(!p)return json(res,{success:false,message:"غير موجود"},404);
  p.quantity=Number(quantity)||0; StoreDB.save(ctx.store.id); json(res,{success:true,data:p});
});
storeRoute("DELETE","/api/products/:pid",(req,res,ctx,pm)=>{
  const p=StoreDB.findById(ctx.data.products,pm.pid); if(!p)return json(res,{success:false,message:"غير موجود"},404);
  const used=ctx.data.sales.some(s=>s.items.some(it=>Number(it.product_id)===Number(pm.pid)))||ctx.data.purchases.some(x=>x.items.some(it=>Number(it.product_id)===Number(pm.pid)));
  if(used)return json(res,{success:false,message:"لا يمكن الحذف، المنتج مستخدم في فواتير"},409);
  ctx.data.products=ctx.data.products.filter(x=>Number(x.id)!==Number(pm.pid)); StoreDB.save(ctx.store.id); json(res,{success:true});
});

/* ── الزبناء ── */
storeRoute("GET",  "/api/customers",(req,res,ctx)=>json(res,{success:true,data:ctx.data.customers}));
storeRoute("POST", "/api/customers",async(req,res,ctx)=>{
  const b=await readBody(req); if(!b.name)return json(res,{success:false,message:"الاسم مطلوب"},400);
  const c={id:StoreDB.nextId(ctx.store.id,"customers"),name:b.name.trim(),phone:(b.phone||"").trim(),address:(b.address||"").trim(),debt:Number(b.opening_debt)||0};
  ctx.data.customers.push(c); StoreDB.save(ctx.store.id); json(res,{success:true,data:c});
});
storeRoute("PUT",  "/api/customers/:cid",async(req,res,ctx,pm)=>{
  const b=await readBody(req); const c=StoreDB.findById(ctx.data.customers,pm.cid);
  if(!c)return json(res,{success:false,message:"غير موجود"},404);
  if(b.name)c.name=b.name.trim(); if("phone"in b)c.phone=b.phone.trim(); if("address"in b)c.address=b.address.trim();
  StoreDB.save(ctx.store.id); json(res,{success:true,data:c});
});
storeRoute("DELETE","/api/customers/:cid",(req,res,ctx,pm)=>{
  const c=StoreDB.findById(ctx.data.customers,pm.cid); if(!c)return json(res,{success:false,message:"غير موجود"},404);
  if(Math.abs(Number(c.debt||0))>0.001)return json(res,{success:false,message:"لا يمكن حذف زبون عليه دين"},409);
  ctx.data.customers=ctx.data.customers.filter(x=>Number(x.id)!==Number(pm.cid)); StoreDB.save(ctx.store.id); json(res,{success:true});
});

/* ── الموردون ── */
storeRoute("GET",  "/api/suppliers",(req,res,ctx)=>json(res,{success:true,data:ctx.data.suppliers}));
storeRoute("POST", "/api/suppliers",async(req,res,ctx)=>{
  const b=await readBody(req); if(!b.name)return json(res,{success:false,message:"الاسم مطلوب"},400);
  const s={id:StoreDB.nextId(ctx.store.id,"suppliers"),name:b.name.trim(),phone:(b.phone||"").trim(),address:(b.address||"").trim(),debt:Number(b.opening_debt)||0};
  ctx.data.suppliers.push(s); StoreDB.save(ctx.store.id); json(res,{success:true,data:s});
});
storeRoute("PUT",  "/api/suppliers/:sid",async(req,res,ctx,pm)=>{
  const b=await readBody(req); const s=StoreDB.findById(ctx.data.suppliers,pm.sid);
  if(!s)return json(res,{success:false,message:"غير موجود"},404);
  if(b.name)s.name=b.name.trim(); if("phone"in b)s.phone=b.phone.trim(); if("address"in b)s.address=b.address.trim();
  StoreDB.save(ctx.store.id); json(res,{success:true,data:s});
});
storeRoute("DELETE","/api/suppliers/:sid",(req,res,ctx,pm)=>{
  const s=StoreDB.findById(ctx.data.suppliers,pm.sid); if(!s)return json(res,{success:false,message:"غير موجود"},404);
  if(Math.abs(Number(s.debt||0))>0.001)return json(res,{success:false,message:"لا يمكن حذف مورد له مستحقات"},409);
  ctx.data.suppliers=ctx.data.suppliers.filter(x=>Number(x.id)!==Number(pm.sid)); StoreDB.save(ctx.store.id); json(res,{success:true});
});

/* ── المبيعات ── */
storeRoute("GET",  "/api/sales",(req,res,ctx)=>json(res,{success:true,data:ctx.data.sales}));
storeRoute("POST", "/api/sales",async(req,res,ctx)=>{
  const b=await readBody(req); const{customerId,items,discount=0,paidAmount=0,paymentMethod="نقدي",note=""}=b;
  if(!items||!items.length)return json(res,{success:false,message:"يجب إضافة عنصر واحد"},400);
  let customer=null;
  if(customerId){customer=StoreDB.findById(ctx.data.customers,customerId);if(!customer)return json(res,{success:false,message:"الزبون غير موجود"},404);}
  let subtotal=0; const si=[];
  for(const it of items){
    const p=StoreDB.findById(ctx.data.products,it.product_id);
    if(!p)return json(res,{success:false,message:`منتج غير موجود`},404);
    if(Number(it.qty)<=0)return json(res,{success:false,message:`كمية غير صحيحة`},400);
    if(Number(p.quantity)<Number(it.qty))return json(res,{success:false,message:`الكمية غير كافية: ${p.name}`},400);
    const qty=Number(it.qty),price=Number(it.price),tot=qty*price; subtotal+=tot;
    si.push({product_id:p.id,name:p.name,unit:p.unit,qty,price,cost:Number(p.purchase_price)||0,total:tot}); p.quantity-=qty;
  }
  const grandTotal=Math.max(subtotal-Number(discount),0),paid=Math.min(Number(paidAmount),grandTotal),remaining=Math.round((grandTotal-paid)*100)/100;
  const sale={id:StoreDB.nextId(ctx.store.id,"sales"),number:StoreDB.invoiceNo(ctx.store.id,"sale"),date:now(),customer_id:customer?customer.id:null,customer_name:customer?customer.name:"نقدي (زبون عابر)",items:si,total:subtotal,discount:Number(discount),grand_total:grandTotal,paid,remaining,payment_method:paymentMethod,note};
  ctx.data.sales.push(sale);
  if(customer){customer.debt=(Number(customer.debt)||0)+grandTotal;if(paid>0){ctx.data.payments.push({id:StoreDB.nextId(ctx.store.id,"payments"),date:now(),person_type:"customer",person_id:customer.id,person_name:customer.name,amount:paid,direction:"in",note:`دفعة عند فاتورة ${sale.number}`,ref_type:"sale",ref_id:sale.id});customer.debt-=paid;}}
  StoreDB.save(ctx.store.id); json(res,{success:true,data:sale});
});
storeRoute("DELETE","/api/sales/:sid",(req,res,ctx,pm)=>{
  const s=StoreDB.findById(ctx.data.sales,pm.sid); if(!s)return json(res,{success:false,message:"غير موجود"},404);
  for(const it of s.items){const p=StoreDB.findById(ctx.data.products,it.product_id);if(p)p.quantity+=Number(it.qty);}
  if(s.customer_id){const c=StoreDB.findById(ctx.data.customers,s.customer_id);if(c)c.debt=(Number(c.debt)||0)-Number(s.remaining||0);}
  ctx.data.payments=ctx.data.payments.filter(p=>!(p.ref_type==="sale"&&Number(p.ref_id)===Number(pm.sid)));
  ctx.data.sales=ctx.data.sales.filter(x=>Number(x.id)!==Number(pm.sid)); StoreDB.save(ctx.store.id); json(res,{success:true});
});

/* ── المشتريات ── */
storeRoute("GET",  "/api/purchases",(req,res,ctx)=>json(res,{success:true,data:ctx.data.purchases}));
storeRoute("POST", "/api/purchases",async(req,res,ctx)=>{
  const b=await readBody(req); const{supplierId,items,paidAmount=0,note=""}=b;
  if(!items||!items.length)return json(res,{success:false,message:"يجب إضافة عنصر واحد"},400);
  const supplier=StoreDB.findById(ctx.data.suppliers,supplierId); if(!supplier)return json(res,{success:false,message:"المورد غير موجود"},404);
  let total=0; const pi=[];
  for(const it of items){
    const p=StoreDB.findById(ctx.data.products,it.product_id); if(!p)return json(res,{success:false,message:"منتج غير موجود"},404);
    if(Number(it.qty)<=0)return json(res,{success:false,message:"كمية غير صحيحة"},400);
    const qty=Number(it.qty),price=Number(it.price),tot=qty*price; total+=tot;
    const item={product_id:p.id,name:p.name,unit:p.unit,qty,price,total:tot,old_purchase_price:Number(p.purchase_price)||0};
    p.quantity+=qty; p.purchase_price=price;
    if(it.new_sale_price!==undefined&&it.new_sale_price!==""){item.old_sale_price=p.sale_price;item.new_sale_price=Number(it.new_sale_price);p.sale_price=Number(it.new_sale_price);}
    pi.push(item);
  }
  const paid=Math.min(Number(paidAmount),total),remaining=Math.round((total-paid)*100)/100;
  const purchase={id:StoreDB.nextId(ctx.store.id,"purchases"),number:StoreDB.invoiceNo(ctx.store.id,"purchase"),date:now(),supplier_id:supplier.id,supplier_name:supplier.name,items:pi,total,paid,remaining,note};
  ctx.data.purchases.push(purchase); supplier.debt=(Number(supplier.debt)||0)+total;
  if(paid>0){ctx.data.payments.push({id:StoreDB.nextId(ctx.store.id,"payments"),date:now(),person_type:"supplier",person_id:supplier.id,person_name:supplier.name,amount:paid,direction:"out",note:`دفعة عند فاتورة ${purchase.number}`,ref_type:"purchase",ref_id:purchase.id});supplier.debt-=paid;}
  StoreDB.save(ctx.store.id); json(res,{success:true,data:purchase});
});
storeRoute("DELETE","/api/purchases/:pid",(req,res,ctx,pm)=>{
  const p=StoreDB.findById(ctx.data.purchases,pm.pid); if(!p)return json(res,{success:false,message:"غير موجود"},404);
  for(const it of p.items){const pr=StoreDB.findById(ctx.data.products,it.product_id);if(pr){pr.quantity-=Number(it.qty);if(it.old_purchase_price!==undefined)pr.purchase_price=it.old_purchase_price;if(it.old_sale_price!==undefined)pr.sale_price=it.old_sale_price;}}
  const s=StoreDB.findById(ctx.data.suppliers,p.supplier_id);if(s)s.debt=(Number(s.debt)||0)-Number(p.remaining||0);
  ctx.data.payments=ctx.data.payments.filter(x=>!(x.ref_type==="purchase"&&Number(x.ref_id)===Number(pm.pid)));
  ctx.data.purchases=ctx.data.purchases.filter(x=>Number(x.id)!==Number(pm.pid)); StoreDB.save(ctx.store.id); json(res,{success:true});
});

/* ── الدفعات ── */
storeRoute("GET",  "/api/payments",(req,res,ctx)=>json(res,{success:true,data:ctx.data.payments}));
storeRoute("POST", "/api/payments/customer",async(req,res,ctx)=>{
  const{customerId,amount,note=""}=await readBody(req);
  if(!amount||Number(amount)<=0)return json(res,{success:false,message:"المبلغ يجب أن يكون أكبر من صفر"},400);
  const c=StoreDB.findById(ctx.data.customers,customerId); if(!c)return json(res,{success:false,message:"الزبون غير موجود"},404);
  const pay={id:StoreDB.nextId(ctx.store.id,"payments"),date:now(),person_type:"customer",person_id:c.id,person_name:c.name,amount:Number(amount),direction:"in",note,ref_type:null,ref_id:null};
  ctx.data.payments.push(pay); c.debt=(Number(c.debt)||0)-Number(amount); StoreDB.save(ctx.store.id); json(res,{success:true,data:pay});
});
storeRoute("POST", "/api/payments/supplier",async(req,res,ctx)=>{
  const{supplierId,amount,note=""}=await readBody(req);
  if(!amount||Number(amount)<=0)return json(res,{success:false,message:"المبلغ يجب أن يكون أكبر من صفر"},400);
  const s=StoreDB.findById(ctx.data.suppliers,supplierId); if(!s)return json(res,{success:false,message:"المورد غير موجود"},404);
  const pay={id:StoreDB.nextId(ctx.store.id,"payments"),date:now(),person_type:"supplier",person_id:s.id,person_name:s.name,amount:Number(amount),direction:"out",note,ref_type:null,ref_id:null};
  ctx.data.payments.push(pay); s.debt=(Number(s.debt)||0)-Number(amount); StoreDB.save(ctx.store.id); json(res,{success:true,data:pay});
});
storeRoute("DELETE","/api/payments/:pid",(req,res,ctx,pm)=>{
  const p=StoreDB.findById(ctx.data.payments,pm.pid); if(!p)return json(res,{success:false,message:"غير موجود"},404);
  if(p.ref_type)return json(res,{success:false,message:"لا يمكن حذف دفعة مرتبطة بفاتورة"},409);
  if(p.person_type==="customer"){const c=StoreDB.findById(ctx.data.customers,p.person_id);if(c)c.debt+=Number(p.amount);}
  else{const s=StoreDB.findById(ctx.data.suppliers,p.person_id);if(s)s.debt+=Number(p.amount);}
  ctx.data.payments=ctx.data.payments.filter(x=>Number(x.id)!==Number(pm.pid)); StoreDB.save(ctx.store.id); json(res,{success:true});
});

/* ── المستخدمون ── */
storeRoute("GET",  "/api/users",(req,res,ctx)=>{
  const users=ctx.data.users.map(({password_hash,salt,...u})=>u); json(res,{success:true,data:users});
});
storeRoute("POST", "/api/users",async(req,res,ctx)=>{
  const b=await readBody(req);
  if(!b.username||!b.password)return json(res,{success:false,message:"البيانات ناقصة"},400);
  if(ctx.data.users.find(u=>u.username.toLowerCase()===b.username.toLowerCase()))return json(res,{success:false,message:"اسم المستخدم موجود"},409);
  const{hash,salt}=pwHash(b.password);
  const u={id:StoreDB.nextId(ctx.store.id,"users"),username:b.username.trim(),full_name:(b.full_name||"").trim(),role:b.role||"seller",password_hash:hash,salt,active:b.active!==false};
  ctx.data.users.push(u); StoreDB.save(ctx.store.id);
  const{password_hash,salt:s,...safe}=u; json(res,{success:true,data:safe});
});
storeRoute("PUT",  "/api/users/:uid",async(req,res,ctx,pm)=>{
  const b=await readBody(req); const u=StoreDB.findById(ctx.data.users,pm.uid);
  if(!u)return json(res,{success:false,message:"غير موجود"},404);
  if(b.full_name!==undefined)u.full_name=b.full_name;
  if(b.role!==undefined)u.role=b.role;
  if(b.active!==undefined)u.active=b.active;
  if(b.new_password){const r=pwHash(b.new_password);u.password_hash=r.hash;u.salt=r.salt;}
  StoreDB.save(ctx.store.id); const{password_hash,salt,...safe}=u; json(res,{success:true,data:safe});
});
storeRoute("DELETE","/api/users/:uid",(req,res,ctx,pm)=>{
  const u=StoreDB.findById(ctx.data.users,pm.uid); if(!u)return json(res,{success:false,message:"غير موجود"},404);
  const admins=ctx.data.users.filter(x=>x.role==="admin"&&x.active);
  if(u.role==="admin"&&admins.length<=1)return json(res,{success:false,message:"لا يمكن حذف المدير الوحيد"},409);
  ctx.data.users=ctx.data.users.filter(x=>Number(x.id)!==Number(pm.uid)); StoreDB.save(ctx.store.id); json(res,{success:true});
});

/* ── لوحة المعلومات ── */
storeRoute("GET","/api/dashboard",(req,res,ctx)=>{
  const d=ctx.data, t=today();
  const ts=d.sales.filter(s=>(s.date||"").slice(0,10)===t);
  const rev=ts.reduce((s,x)=>s+Number(x.grand_total||0),0);
  let profit=0; for(const s of ts){for(const it of s.items)profit+=(Number(it.price)-Number(it.cost||0))*Number(it.qty); profit-=Number(s.discount||0);}
  const ls=d.products.filter(p=>Number(p.quantity||0)<=Number(p.min_stock||0));
  const rs=[...d.sales].sort((a,b)=>a.date<b.date?1:-1).slice(0,8);
  json(res,{success:true,data:{todayRevenue:rev,todayProfit:profit,todaySalesCount:ts.length,totalCustDebt:d.customers.reduce((s,c)=>s+Math.max(0,Number(c.debt||0)),0),totalSupDebt:d.suppliers.reduce((s,x)=>s+Math.max(0,Number(x.debt||0)),0),lowStockCount:ls.length,lowStockProducts:ls,recentSales:rs}});
});

/* ── التقارير ── */
storeRoute("GET","/api/reports",(req,res,ctx)=>{
  const q=urlMod.parse(req.url,true).query;
  const from=q.from||today(),to=q.to||today();
  const ir=(d)=>{const s=(d||"").slice(0,10);return s>=from&&s<=to;};
  const sales=ctx.data.sales.filter(s=>ir(s.date));
  const purchases=ctx.data.purchases.filter(p=>ir(p.date));
  const payments=ctx.data.payments.filter(p=>ir(p.date));
  let rev=0,cost=0,disc=0;
  for(const s of sales){rev+=Number(s.grand_total||0);disc+=Number(s.discount||0);for(const it of s.items)cost+=Number(it.cost||0)*Number(it.qty||0);}
  const tp=purchases.reduce((s,p)=>s+Number(p.total||0),0);
  const pi=payments.filter(p=>p.direction==="in").reduce((s,p)=>s+Number(p.amount||0),0);
  const po=payments.filter(p=>p.direction==="out").reduce((s,p)=>s+Number(p.amount||0),0);
  const cd=ctx.data.customers.filter(c=>Number(c.debt||0)>0.001);
  const sd=ctx.data.suppliers.filter(s=>Number(s.debt||0)>0.001);
  const iv=ctx.data.products.reduce((s,p)=>s+Number(p.quantity||0)*Number(p.purchase_price||0),0);
  const isv=ctx.data.products.reduce((s,p)=>s+Number(p.quantity||0)*Number(p.sale_price||0),0);
  json(res,{success:true,data:{from,to,salesCount:sales.length,totalRevenue:rev,totalCost:cost,totalDiscount:disc,grossProfit:rev-cost,purchases:purchases.length,totalPurchases:tp,paymentsIn:pi,paymentsOut:po,custDebtors:cd,totalCustDebt:cd.reduce((s,c)=>s+Number(c.debt||0),0),supDebtors:sd,totalSupDebt:sd.reduce((s,x)=>s+Number(x.debt||0),0),invValue:iv,invSaleValue:isv,products:ctx.data.products,lowStock:ctx.data.products.filter(p=>Number(p.quantity||0)<=Number(p.min_stock||0)),rawSales:sales,rawPurchases:purchases,storeName:ctx.data.settings.store_name,storeAddress:ctx.data.settings.store_address}});
});


/* ══════════════════════════════════════════
   API التسجيل العام (صفحة الهبوط)
   يسمح لأي زبون بإنشاء متجره مجاناً
══════════════════════════════════════════ */
R("POST", "/api/register", async (req, res) => {
  const cfg = SaasDB.get().settings;

  // التحقق من أن التسجيل مفعّل
  if (cfg.allow_registration === false) {
    return json(res, { success: false, message: "التسجيل موقوف حالياً من قِبل المشرف" }, 403);
  }

  const b = await readBody(req);
  const { name, owner_name, owner_phone, owner_email, address, admin_password } = b;

  if (!name || !owner_name)
    return json(res, { success: false, message: "اسم المتجر واسم المالك مطلوبان" }, 400);
  if (!admin_password || admin_password.length < 6)
    return json(res, { success: false, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, 400);

  // التحقق من الحد الأقصى للمتاجر
  const maxStores = cfg.max_stores || 100;
  if (SaasDB.get().stores.length >= maxStores)
    return json(res, { success: false, message: "تجاوز الحد الأقصى للمتاجر المسموح بها" }, 429);

  // بناء slug فريد من اسم المتجر
  let baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06ff-]/g, "")
    .slice(0, 30) || "store";

  // التأكد من فرادة الـ slug
  let slug = baseSlug;
  let n = 1;
  while (SaasDB.getStoreBySlug(slug)) {
    slug = `${baseSlug}-${n++}`;
  }

  // إنشاء المتجر
  const data = SaasDB.get();
  const storeId = String(Date.now());
  const { hash, salt } = pwHash(admin_password);

  const store = {
    id: storeId,
    name: name.trim(),
    slug,
    owner_name: owner_name.trim(),
    owner_phone: (owner_phone || "").trim(),
    owner_email: (owner_email || "").trim(),
    address: (address || "").trim(),
    phone: (owner_phone || "").trim(),
    plan: "free",
    status: "active",
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    source: "self_registered",
  };

  data.stores.push(store);
  SaasDB.save();

  // إنشاء قاعدة بيانات المتجر مع المدير
  const storeData = StoreDB.get(storeId);
  const { hash: h2, salt: s2 } = pwHash(admin_password);
  storeData.users.push({
    id: 1,
    username: "admin",
    full_name: owner_name.trim(),
    role: "admin",
    password_hash: h2,
    salt: s2,
    active: true,
  });
  storeData.counters.users = 1;
  storeData.settings.store_name = name.trim();
  storeData.settings.store_address = (address || "").trim();
  storeData.settings.store_phone = (owner_phone || "").trim();
  StoreDB.save(storeId);

  console.log(`[Register] متجر جديد: "${name}" (${slug})`);

  json(res, {
    success: true,
    message: `تم إنشاء متجر "${name}" بنجاح`,
    store: { id: storeId, name, slug },
    access_url: `/store/${slug}`,
  });
});

/* ══════════════════════════════════════════
   الخادم الرئيسي
══════════════════════════════════════════ */
const server = http.createServer(async (req, res) => {
  const parsed   = urlMod.parse(req.url);
  const pathname = parsed.pathname;

  // Health check سريع لـ Render
  if (pathname === "/health" || pathname === "/ping") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }

  // CORS
  res.setHeader("Access-Control-Allow-Origin",  req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // API التطبيق (متاجر)
  if (pathname.match(/^\/store\/[^\/]+\//)) {
    const m = matchRoute(req.method, pathname);
    if (m) {
      req._pm = m.pm;
      try { await m.fn(req, res); } catch(e) { console.error("[API Store]",e); json(res,{success:false,message:"خطأ في الخادم"},500); }
      return;
    }
    // إعادة index.html للمتجر
    const slugM = pathname.match(/^\/store\/([^\/]+)/);
    if (slugM) {
      const store = SaasDB.getStoreBySlug(slugM[1]);
      if (!store) { res.writeHead(404); res.end("<h1>404 — المتجر غير موجود</h1>"); return; }
      if (store.status === "suspended") { res.writeHead(403); res.end("<h1>هذا المتجر موقوف مؤقتاً</h1>"); return; }
      serveFile(res, path.join(PUBLIC_DIR, "store.html"));
      return;
    }
  }

  // API لوحة التحكم
  if (pathname.startsWith("/admin/api/")) {
    const m = matchRoute(req.method, pathname);
    if (m) {
      req._pm = m.pm;
      try { await m.fn(req, res); } catch(e) { console.error("[Admin API]",e); json(res,{success:false,message:"خطأ في الخادم"},500); }
      return;
    }
    json(res, { success: false, message: "Not Found" }, 404);
    return;
  }

  // لوحة التحكم (HTML)
  if (pathname === "/admin" || pathname === "/admin/") {
    serveFile(res, path.join(PUBLIC_DIR, "admin.html"));
    return;
  }

  // ملفات ثابتة (/public/...)
  const clean = pathname === "/" ? "/index.html" : pathname;
  const fp = path.join(PUBLIC_DIR, clean.replace(/\.\./g, ""));
  if (!fp.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end(); return; }
  fs.stat(fp, (err, st) => {
    if (err || st.isDirectory()) serveFile(res, path.join(PUBLIC_DIR, "index.html"));
    else serveFile(res, fp);
  });
});

// تهيئة عند البدء
SaasDB.get();

server.listen(PORT, HOST, () => {
  const ifaces = os.networkInterfaces();
  let ip = "localhost";
  for (const list of Object.values(ifaces)) {
    for (const iface of list) {
      if (iface.family === "IPv4" && !iface.internal) { ip = iface.address; break; }
    }
  }
  console.log("\n" + "═".repeat(60));
  console.log("  🏪  منصة المتاجر SaaS");
  console.log("═".repeat(60));
  console.log(`  🌐  المنصة:         http://localhost:${PORT}`);
  console.log(`  📡  الشبكة:         http://${ip}:${PORT}`);
  console.log(`  🔧  لوحة التحكم:   http://localhost:${PORT}/admin`);
  console.log(`  📁  البيانات:       ${DATA_DIR}`);
  console.log("─".repeat(60));
  console.log("  👑  المشرف العام:   superadmin / superadmin123");
  console.log("  🏪  مثال متجر:      http://localhost:${PORT}/store/{slug}");
  console.log("═".repeat(60) + "\n");
});

process.on("SIGINT",  () => { SaasDB.flush(); for(const id of Object.keys(StoreDB._cache)) StoreDB.flush(id); console.log("\n💾 تم الحفظ."); process.exit(0); });
process.on("SIGTERM", () => { SaasDB.flush(); for(const id of Object.keys(StoreDB._cache)) StoreDB.flush(id); process.exit(0); });
