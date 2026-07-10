/* =========================================================================
   نظام تسيير متجر الفتح - نسخة الويب (HTML)
   app.js - الجزء 1: الإعدادات، التخزين، المصادقة
   ========================================================================= */

"use strict";

/* -------------------------------------------------------------------------
   الإعدادات العامة والثوابت
   ------------------------------------------------------------------------- */

const CFG = {
  STORAGE_KEY: "matjar_alfath_db_v1",
  DEFAULT_STORE_NAME: "متجر الفتح",
  DEFAULT_STORE_ADDRESS: "أمورج - ولاية الحوض الغربي - موريتانيا",
  CURRENCY: "أوقية",

  /* ═══════════════════════════════════════════════════════════
     نظام الأدوار والصلاحيات
     5 مستويات تغطي كل أنواع الموظفين
  ═══════════════════════════════════════════════════════════ */

  // تعريف الأدوار
  ROLE_ADMIN:     "admin",        // مدير عام — كل الصلاحيات
  ROLE_MANAGER:   "manager",      // مدير مساعد — كل شيء إلا إدارة المستخدمين
  ROLE_SELLER:    "seller",       // بائع — مبيعات + مخزون قراءة + زبناء + دفعات
  ROLE_BUYER:     "buyer",        // مشتري — مشتريات + مخزون + موردون + دفعات
  ROLE_CASHIER:   "cashier",      // محاسب — مبيعات + مشتريات + دفعات + تقارير

  // تسميات عربية للأدوار
  ROLE_LABELS: {
    admin:   "مدير عام",
    manager: "مدير مساعد",
    seller:  "بائع",
    buyer:   "مشتري",
    cashier: "محاسب",
  },

  // وصف مختصر لكل دور
  ROLE_DESC: {
    admin:   "كامل الصلاحيات: إدارة المستخدمين، التقارير، الإعدادات، والعمليات",
    manager: "جميع العمليات التجارية بدون إدارة المستخدمين أو الإعدادات",
    seller:  "إنشاء فواتير البيع، عرض المخزون، إدارة الزبناء والدفعات",
    buyer:   "إنشاء فواتير الشراء، إدارة المخزون والموردين والدفعات",
    cashier: "عرض وإنشاء المبيعات والمشتريات والدفعات، مع التقارير",
  },

  // الأقسام المسموح بها لكل دور
  ROLE_SECTIONS: {
    admin:   ["dashboard","sales","purchases","inventory","customers","suppliers",
              "debts","payments","reports","users","settings"],
    manager: ["dashboard","sales","purchases","inventory","customers","suppliers",
              "debts","payments","reports"],
    seller:  ["dashboard","sales","inventory","customers","payments"],
    buyer:   ["dashboard","purchases","inventory","suppliers","payments"],
    cashier: ["dashboard","sales","purchases","payments","reports","debts"],
  },

  // الإجراءات المسموح بها لكل دور
  ROLE_PERMISSIONS: {
    admin: {
      canDeleteSale: true, canDeletePurchase: true, canDeletePayment: true,
      canEditInventory: true, canDeleteInventory: true, canAdjustStock: true,
      canDeleteCustomer: true, canDeleteSupplier: true,
      canViewReports: true, canManageUsers: true, canManageSettings: true,
      canExportData: true,
    },
    manager: {
      canDeleteSale: true, canDeletePurchase: true, canDeletePayment: true,
      canEditInventory: true, canDeleteInventory: false, canAdjustStock: true,
      canDeleteCustomer: false, canDeleteSupplier: false,
      canViewReports: true, canManageUsers: false, canManageSettings: false,
      canExportData: true,
    },
    seller: {
      canDeleteSale: false, canDeletePurchase: false, canDeletePayment: false,
      canEditInventory: false, canDeleteInventory: false, canAdjustStock: false,
      canDeleteCustomer: false, canDeleteSupplier: false,
      canViewReports: false, canManageUsers: false, canManageSettings: false,
      canExportData: false,
    },
    buyer: {
      canDeleteSale: false, canDeletePurchase: false, canDeletePayment: false,
      canEditInventory: true, canDeleteInventory: false, canAdjustStock: true,
      canDeleteCustomer: false, canDeleteSupplier: false,
      canViewReports: false, canManageUsers: false, canManageSettings: false,
      canExportData: false,
    },
    cashier: {
      canDeleteSale: false, canDeletePurchase: false, canDeletePayment: false,
      canEditInventory: false, canDeleteInventory: false, canAdjustStock: false,
      canDeleteCustomer: false, canDeleteSupplier: false,
      canViewReports: true, canManageUsers: false, canManageSettings: false,
      canExportData: false,
    },
  },

  SECTION_LABELS: {
    dashboard: "الرئيسية",
    sales: "المبيعات والفواتير",
    purchases: "المشتريات",
    inventory: "المخزون",
    customers: "الزبناء",
    suppliers: "الموردون",
    debts: "الديون",
    payments: "الدفعات",
    reports: "التقارير والمداخيل",
    users: "المستخدمون",
    settings: "إعدادات المحل",
  },

  // للتوافق مع الكود القديم
  get SECTIONS_ADMIN()   { return this.ROLE_SECTIONS.admin; },
  get SECTIONS_CASHIER() { return this.ROLE_SECTIONS.seller; },
};

/* ── دوال مساعدة للصلاحيات ── */
function hasPermission(permission) {
  const user = App && App.currentUser;
  if (!user) return false;
  const role = user.role || "seller";
  const perms = CFG.ROLE_PERMISSIONS[role] || CFG.ROLE_PERMISSIONS.seller;
  return !!perms[permission];
}

function getUserSections(role) {
  return CFG.ROLE_SECTIONS[role] || CFG.ROLE_SECTIONS.seller;
}

/* -------------------------------------------------------------------------
   دوال التنسيق
   ------------------------------------------------------------------------- */

function formatNumber(value) {
  let n = Number(value || 0);
  if (Math.abs(n - Math.round(n)) < 1e-9) {
    return Math.round(n).toLocaleString("en-US");
  }
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value) {
  let n = Number(value || 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + CFG.CURRENCY;
}

function nowStr() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function todayStr() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* -------------------------------------------------------------------------
   طبقة التخزين (localStorage)
   ------------------------------------------------------------------------- */

const DB = {
  /* ═══════════════════════════════════════════════════════════════
     طبقة التخزين — IndexedDB
     سعة ضخمة (عشرات GB) بدلاً من 5-10 MB في localStorage
     مع cache ذكي في الذاكرة للقراءة الفورية المتزامنة
  ═══════════════════════════════════════════════════════════════ */

  _db: null,          // اتصال IndexedDB
  _cache: null,       // نسخة في الذاكرة للقراءة المتزامنة
  _saveTimer: null,
  DB_NAME: "MatjarAlfath",
  DB_VERSION: 2,
  STORE_NAME: "data",

  /* ── فتح / إنشاء قاعدة البيانات ── */
  _openDB() {
    return new Promise((resolve, reject) => {
      if (this._db) { resolve(this._db); return; }
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // مخزن واحد بسيط بمفتاح "key"
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: "key" });
        }
        // ترحيل من localStorage إذا وُجد
        if (e.oldVersion === 0) {
          const tx = e.target.transaction;
          const store = tx.objectStore(this.STORE_NAME);
          try {
            const old = localStorage.getItem(CFG.STORAGE_KEY);
            if (old) {
              store.put({ key: "main", value: JSON.parse(old) });
              console.log("[DB] تم ترحيل البيانات من localStorage إلى IndexedDB");
            }
          } catch (err) { /* لا توجد بيانات قديمة */ }
        }
      };

      req.onsuccess  = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror    = (e) => reject(e.target.error);
      req.onblocked  = ()  => console.warn("[DB] IndexedDB محظور — أغلق التبويبات الأخرى");
    });
  },

  /* ── تهيئة: فتح DB + تحميل البيانات إلى الcache ── */
  async init() {
    await this._openDB();
    await this._loadToCache();
    console.log("[DB] IndexedDB جاهز ✅");
  },

  async _loadToCache() {
    const db = await this._openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, "readonly");
      const req = tx.objectStore(this.STORE_NAME).get("main");
      req.onsuccess = (e) => {
        const record = e.target.result;
        if (record && record.value) {
          this._cache = record.value;
          this._ensureShape();
        } else {
          this._cache = this._defaultData();
        }
        resolve(this._cache);
      };
      req.onerror = () => { this._cache = this._defaultData(); resolve(this._cache); };
    });
  },

  _defaultData() {
    return {
      products: [], customers: [], suppliers: [],
      sales: [], purchases: [], payments: [], users: [],
      settings: {
        store_name: CFG.DEFAULT_STORE_NAME,
        store_address: CFG.DEFAULT_STORE_ADDRESS,
        store_phone: "",
        low_stock_default: 5,
        next_sale_number: 1,
        next_purchase_number: 1,
      },
      counters: { products:0, customers:0, suppliers:0, sales:0, purchases:0, payments:0, users:0 },
    };
  },

  _ensureShape() {
    const def = this._defaultData();
    for (const key of Object.keys(def)) {
      if (!(key in this._cache)) this._cache[key] = def[key];
    }
    for (const key of Object.keys(def.settings)) {
      if (!(key in this._cache.settings)) this._cache.settings[key] = def.settings[key];
    }
    for (const key of Object.keys(def.counters)) {
      if (!(key in this._cache.counters)) this._cache.counters[key] = 0;
    }
  },

  /* ── load: يُرجع الcache مباشرة (متزامن) ── */
  load() {
    if (!this._cache) {
      // fallback نادر الحدوث — لو استُدعي قبل init()
      this._cache = this._defaultData();
    }
    return this._cache;
  },

  /* ── save: يكتب الcache إلى IndexedDB بشكل غير متزامن ── */
  save() {
    // debounce: انتظر 300ms ثم احفظ (يجمّع عمليات متعددة في حفظ واحد)
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._flush(), 300);
    return true;
  },

  async _flush() {
    if (!this._cache) return;
    try {
      const db = await this._openDB();
      const tx = db.transaction(this.STORE_NAME, "readwrite");
      tx.objectStore(this.STORE_NAME).put({ key: "main", value: this._cache });
      return new Promise((resolve) => {
        tx.oncomplete = resolve;
        tx.onerror = (e) => {
          console.error("[DB] خطأ في الحفظ:", e.target.error);
          Toast.error("خطأ في حفظ البيانات!");
        };
      });
    } catch (e) {
      console.error("[DB] flush error:", e);
    }
  },

  /* ── حفظ فوري (مثلاً عند تصدير النسخة الاحتياطية) ── */
  async saveImmediate() {
    clearTimeout(this._saveTimer);
    await this._flush();
  },

  /* ── مساعدات ── */
  nextId(collectionName) {
    const data = this.load();
    data.counters[collectionName] = (data.counters[collectionName] || 0) + 1;
    return data.counters[collectionName];
  },

  findById(list, id) {
    return list.find((item) => Number(item.id) === Number(id)) || null;
  },

  getSetting(key, defVal) {
    const data = this.load();
    return key in data.settings ? data.settings[key] : defVal;
  },

  setSetting(key, value) {
    this.load().settings[key] = value;
    this.save();
  },

  getNextInvoiceNumber(kind) {
    const data = this.load();
    const year  = new Date().getFullYear();
    const prefix = kind === "sale" ? "INV" : "PUR";
    const key   = kind === "sale" ? "next_sale_number" : "next_purchase_number";
    const n     = data.settings[key] || 1;
    data.settings[key] = n + 1;
    return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
  },

  /* ── تصدير كنسخة احتياطية ── */
  exportJSON() {
    return JSON.stringify(this.load(), null, 2);
  },

  /* ── استيراد نسخة احتياطية ── */
  async importJSON(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (typeof parsed !== "object" || parsed === null) throw new Error("ملف غير صالح");
    this._cache = parsed;
    this._ensureShape();
    await this._flush();
  },

  /* ── إعادة تعيين كامل ── */
  async resetAll() {
    this._cache = this._defaultData();
    await Auth.createUser("admin", "admin123", "المدير العام", CFG.ROLE_ADMIN, true);
    await this._flush();
  },

  /* ── معلومات عن مساحة التخزين ── */
  async getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      const est = await navigator.storage.estimate();
      return {
        usage:  (est.usage  / 1024 / 1024).toFixed(2) + " MB",
        quota:  (est.quota  / 1024 / 1024 / 1024).toFixed(2) + " GB",
        percent: (est.usage / est.quota * 100).toFixed(2) + "%",
      };
    } catch { return null; }
  },

  /* ── طلب استمرارية التخزين (يمنع المتصفح من الحذف التلقائي) ── */
  async requestPersistence() {
    if (!navigator.storage || !navigator.storage.persist) return false;
    const granted = await navigator.storage.persist();
    if (granted) console.log("[DB] تخزين مستمر مُفعَّل ✅");
    return granted;
  },
};


/* -------------------------------------------------------------------------
   المصادقة وإدارة المستخدمين (PBKDF2-SHA256 عبر Web Crypto API)
   ------------------------------------------------------------------------- */

const Auth = {
  PBKDF2_ITERATIONS: 100000,

  /**
   * تشفير كلمة المرور. إن لم يُمرَّر salt يتم توليد واحد جديد (Hex).
   * تُرجع Promise<{hash, salt}> (Hex strings)
   */
  async hashPassword(password, saltHex) {
    const enc = new TextEncoder();
    let saltBytes;
    if (saltHex) {
      saltBytes = this._hexToBytes(saltHex);
    } else {
      saltBytes = crypto.getRandomValues(new Uint8Array(16));
    }

    const keyMaterial = await crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: this.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
    return {
      hash: this._bytesToHex(new Uint8Array(derived)),
      salt: this._bytesToHex(saltBytes),
    };
  },

  async verifyPassword(password, hashHex, saltHex) {
    const result = await this.hashPassword(password, saltHex);
    return result.hash === hashHex;
  },

  _bytesToHex(bytes) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  _hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  },

  /**
   * التحقق من بيانات تسجيل الدخول. تُرجع بيانات المستخدم أو null.
   */
  async authenticate(username, password) {
    const data = DB.load();
    username = (username || "").trim();
    for (const user of data.users) {
      if (String(user.username || "").trim().toLowerCase() === username.toLowerCase()) {
        if (!user.active) return null;
        const ok = await this.verifyPassword(password, user.password_hash, user.salt);
        return ok ? user : null;
      }
    }
    return null;
  },

  /**
   * إنشاء مستخدم جديد. تُرجع {success, message}
   */
  async createUser(username, password, fullName, role = CFG.ROLE_CASHIER, active = true) {
    const data = DB.load();
    username = (username || "").trim();

    if (!username || !password) {
      return { success: false, message: "يجب إدخال اسم المستخدم وكلمة المرور" };
    }
    for (const user of data.users) {
      if (String(user.username || "").trim().toLowerCase() === username.toLowerCase()) {
        return { success: false, message: "اسم المستخدم موجود مسبقا" };
      }
    }

    const { hash, salt } = await this.hashPassword(password);
    data.users.push({
      id: DB.nextId("users"),
      username,
      full_name: fullName || username,
      role,
      password_hash: hash,
      salt,
      active,
    });
    DB.save();
    return { success: true, message: "تم إنشاء المستخدم بنجاح" };
  },

  /**
   * تحديث بيانات مستخدم. تُرجع {success, message}
   */
  async updateUser(userId, { fullName, role, active, newPassword } = {}) {
    const data = DB.load();
    const user = DB.findById(data.users, userId);
    if (!user) return { success: false, message: "المستخدم غير موجود" };

    if (fullName !== undefined) user.full_name = fullName;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;
    if (newPassword) {
      const { hash, salt } = await this.hashPassword(newPassword);
      user.password_hash = hash;
      user.salt = salt;
    }

    DB.save();
    return { success: true, message: "تم تحديث المستخدم بنجاح" };
  },

  /**
   * حذف مستخدم (لا يمكن حذف آخر مدير في النظام)
   */
  deleteUser(userId) {
    const data = DB.load();
    const user = DB.findById(data.users, userId);
    if (!user) return { success: false, message: "المستخدم غير موجود" };

    const admins = data.users.filter((u) => u.role === CFG.ROLE_ADMIN && u.active);
    if (user.role === CFG.ROLE_ADMIN && admins.length <= 1) {
      return { success: false, message: "لا يمكن حذف المدير الوحيد في النظام" };
    }

    data.users = data.users.filter((u) => Number(u.id) !== Number(userId));
    DB.save();
    return { success: true, message: "تم حذف المستخدم بنجاح" };
  },
};

/* -------------------------------------------------------------------------
   تهيئة قاعدة البيانات لأول مرة
   ------------------------------------------------------------------------- */

async function initDatabase() {
  // تهيئة IndexedDB وتحميل البيانات إلى الcache
  await DB.init();

  // إنشاء المستخدمين الافتراضيين إن لم يكن موجوداً
  const data = DB.load();
  if (data.users.length === 0) {
    await Auth.createUser("admin",   "admin123",   "المدير العام",     CFG.ROLE_ADMIN,   true);
    await Auth.createUser("manager", "manager123", "المدير المساعد",   CFG.ROLE_MANAGER, true);
    await Auth.createUser("seller",  "seller123",  "البائع",           CFG.ROLE_SELLER,  true);
    await Auth.createUser("buyer",   "buyer123",   "المشتري",          CFG.ROLE_BUYER,   true);
    await Auth.createUser("cashier", "cashier123", "المحاسب",          CFG.ROLE_CASHIER, true);
    console.log("[Init] تم إنشاء المستخدمين الافتراضيين الخمسة");
  }

  // طلب استمرارية التخزين (يمنع المتصفح من حذف البيانات تلقائياً)
  await DB.requestPersistence();
}

/* =========================================================================
   app.js - الجزء 2: طبقة منطق الأعمال (Models)
   ========================================================================= */

const Models = {

  /* ===================== المنتجات (المخزون) ===================== */

  getProducts() {
    return DB.load().products;
  },

  getProduct(id) {
    return DB.findById(DB.load().products, id);
  },

  addProduct(name, category, unit, quantity, purchasePrice, salePrice, minStock) {
    const data = DB.load();
    const product = {
      id: DB.nextId("products"),
      name: (name || "").trim(),
      category: (category || "").trim(),
      unit: (unit || "").trim(),
      quantity: Number(quantity) || 0,
      purchase_price: Number(purchasePrice) || 0,
      sale_price: Number(salePrice) || 0,
      min_stock: Number(minStock) || 0,
    };
    data.products.push(product);
    DB.save();
    return product;
  },

  updateProduct(id, fields) {
    const product = this.getProduct(id);
    if (!product) return { success: false, message: "المنتج غير موجود" };
    Object.assign(product, fields);
    DB.save();
    return { success: true, message: "تم تحديث المنتج بنجاح" };
  },

  adjustStock(id, newQuantity) {
    const product = this.getProduct(id);
    if (!product) return { success: false, message: "المنتج غير موجود" };
    product.quantity = Number(newQuantity) || 0;
    DB.save();
    return { success: true, message: "تم تعديل كمية المخزون بنجاح" };
  },

  deleteProduct(id) {
    const data = DB.load();
    const product = this.getProduct(id);
    if (!product) return { success: false, message: "المنتج غير موجود" };

    const usedInSales = data.sales.some((s) => s.items.some((it) => Number(it.product_id) === Number(id)));
    const usedInPurchases = data.purchases.some((p) => p.items.some((it) => Number(it.product_id) === Number(id)));
    if (usedInSales || usedInPurchases) {
      return { success: false, message: "لا يمكن حذف هذا المنتج لأنه مستخدم في فواتير سابقة" };
    }

    data.products = data.products.filter((p) => Number(p.id) !== Number(id));
    DB.save();
    return { success: true, message: "تم حذف المنتج بنجاح" };
  },

  getLowStockProducts() {
    return this.getProducts().filter((p) => Number(p.quantity) <= Number(p.min_stock || 0));
  },

  /* ===================== الزبناء ===================== */

  getCustomers() {
    return DB.load().customers;
  },

  getCustomer(id) {
    return DB.findById(DB.load().customers, id);
  },

  addCustomer(name, phone, address, openingDebt) {
    const data = DB.load();
    const customer = {
      id: DB.nextId("customers"),
      name: (name || "").trim(),
      phone: (phone || "").trim(),
      address: (address || "").trim(),
      debt: Number(openingDebt) || 0,
    };
    data.customers.push(customer);
    DB.save();
    return customer;
  },

  updateCustomer(id, fields) {
    const customer = this.getCustomer(id);
    if (!customer) return { success: false, message: "الزبون غير موجود" };
    Object.assign(customer, fields);
    DB.save();
    return { success: true, message: "تم تحديث بيانات الزبون بنجاح" };
  },

  deleteCustomer(id) {
    const data = DB.load();
    const customer = this.getCustomer(id);
    if (!customer) return { success: false, message: "الزبون غير موجود" };
    if (Math.abs(Number(customer.debt || 0)) > 0.001) {
      return { success: false, message: "لا يمكن حذف زبون عليه دين. قم بتسوية الدين أولا" };
    }
    data.customers = data.customers.filter((c) => Number(c.id) !== Number(id));
    DB.save();
    return { success: true, message: "تم حذف الزبون بنجاح" };
  },

  /* ===================== الموردون ===================== */

  getSuppliers() {
    return DB.load().suppliers;
  },

  getSupplier(id) {
    return DB.findById(DB.load().suppliers, id);
  },

  addSupplier(name, phone, address, openingDebt) {
    const data = DB.load();
    const supplier = {
      id: DB.nextId("suppliers"),
      name: (name || "").trim(),
      phone: (phone || "").trim(),
      address: (address || "").trim(),
      debt: Number(openingDebt) || 0,
    };
    data.suppliers.push(supplier);
    DB.save();
    return supplier;
  },

  updateSupplier(id, fields) {
    const supplier = this.getSupplier(id);
    if (!supplier) return { success: false, message: "المورد غير موجود" };
    Object.assign(supplier, fields);
    DB.save();
    return { success: true, message: "تم تحديث بيانات المورد بنجاح" };
  },

  deleteSupplier(id) {
    const data = DB.load();
    const supplier = this.getSupplier(id);
    if (!supplier) return { success: false, message: "المورد غير موجود" };
    if (Math.abs(Number(supplier.debt || 0)) > 0.001) {
      return { success: false, message: "لا يمكن حذف مورد له مستحقات. قم بتسوية الحساب أولا" };
    }
    data.suppliers = data.suppliers.filter((s) => Number(s.id) !== Number(id));
    DB.save();
    return { success: true, message: "تم حذف المورد بنجاح" };
  },

  /* ===================== المبيعات ===================== */

  getSales() {
    return DB.load().sales;
  },

  getSale(id) {
    return DB.findById(DB.load().sales, id);
  },

  /**
   * إنشاء فاتورة بيع جديدة.
   * items: [{product_id, qty, price}]
   * تُرجع {success, data|message}
   */
  createSale({ customerId, items, discount = 0, paidAmount = 0, paymentMethod = "نقدي", note = "" }) {
    const data = DB.load();

    if (!items || items.length === 0) {
      return { success: false, message: "يجب إضافة عنصر واحد على الأقل" };
    }

    // التحقق من توفر الكميات
    for (const it of items) {
      const product = this.getProduct(it.product_id);
      if (!product) return { success: false, message: "منتج غير موجود" };
      if (Number(it.qty) <= 0) return { success: false, message: `الكمية غير صحيحة للمنتج ${product.name}` };
      if (Number(product.quantity) < Number(it.qty)) {
        return { success: false, message: `الكمية المتوفرة من "${product.name}" غير كافية (المتوفر: ${formatNumber(product.quantity)})` };
      }
    }

    let customer = null;
    if (customerId) {
      customer = this.getCustomer(customerId);
      if (!customer) return { success: false, message: "الزبون غير موجود" };
    }

    // بناء عناصر الفاتورة وخصم الكميات
    let subtotal = 0;
    const saleItems = [];
    for (const it of items) {
      const product = this.getProduct(it.product_id);
      const qty = Number(it.qty);
      const price = Number(it.price);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      saleItems.push({
        product_id: product.id,
        name: product.name,
        unit: product.unit,
        qty, price,
        cost: Number(product.purchase_price) || 0,
        total: lineTotal,
      });

      product.quantity = Number(product.quantity) - qty;
    }

    discount = Number(discount) || 0;
    const grandTotal = Math.max(subtotal - discount, 0);
    paidAmount = Number(paidAmount) || 0;
    if (paidAmount > grandTotal) paidAmount = grandTotal;
    const remaining = Math.round((grandTotal - paidAmount) * 100) / 100;

    const sale = {
      id: DB.nextId("sales"),
      number: DB.getNextInvoiceNumber("sale"),
      date: nowStr(),
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : "نقدي (زبون عابر)",
      items: saleItems,
      total: subtotal,
      discount,
      grand_total: grandTotal,
      paid: paidAmount,
      remaining,
      payment_method: paymentMethod,
      note: note || "",
    };
    data.sales.push(sale);

    // تحديث دين الزبون وتسجيل الدفعة
    if (customer) {
      customer.debt = (Number(customer.debt) || 0) + grandTotal;
      if (paidAmount > 0) {
        this._recordPaymentRaw({
          personType: "customer", personId: customer.id, personName: customer.name,
          amount: paidAmount, direction: "in",
          note: `دفعة عند فاتورة بيع رقم ${sale.number}`,
          refType: "sale", refId: sale.id,
        });
        customer.debt -= paidAmount;
      }
    }

    DB.save();
    return { success: true, data: sale };
  },

  /**
   * حذف فاتورة بيع وعكس كل تأثيراتها (المخزون، دين الزبون، الدفعات المرتبطة)
   */
  deleteSale(id) {
    const data = DB.load();
    const sale = this.getSale(id);
    if (!sale) return { success: false, message: "الفاتورة غير موجودة" };

    // إعادة الكميات إلى المخزون
    for (const item of sale.items) {
      const product = this.getProduct(item.product_id);
      if (product) product.quantity = Number(product.quantity) + Number(item.qty);
    }

    // عكس دين الزبون
    if (sale.customer_id) {
      const customer = this.getCustomer(sale.customer_id);
      if (customer) {
        customer.debt = (Number(customer.debt) || 0) - Number(sale.remaining || 0);
      }
    }

    // إزالة الدفعات المرتبطة بهذه الفاتورة
    data.payments = data.payments.filter((p) => !(p.ref_type === "sale" && Number(p.ref_id) === Number(id)));

    data.sales = data.sales.filter((s) => Number(s.id) !== Number(id));
    DB.save();
    return { success: true, message: "تم حذف الفاتورة بنجاح" };
  },

  /* ===================== المشتريات ===================== */

  getPurchases() {
    return DB.load().purchases;
  },

  getPurchase(id) {
    return DB.findById(DB.load().purchases, id);
  },

  /**
   * إنشاء فاتورة شراء جديدة من مورد.
   * items: [{product_id, qty, price, new_sale_price?}]
   */
  createPurchase({ supplierId, items, paidAmount = 0, note = "" }) {
    const data = DB.load();

    if (!items || items.length === 0) {
      return { success: false, message: "يجب إضافة عنصر واحد على الأقل" };
    }

    const supplier = this.getSupplier(supplierId);
    if (!supplier) return { success: false, message: "المورد غير موجود" };

    for (const it of items) {
      const product = this.getProduct(it.product_id);
      if (!product) return { success: false, message: "منتج غير موجود" };
      if (Number(it.qty) <= 0) return { success: false, message: `الكمية غير صحيحة للمنتج ${product.name}` };
    }

    let total = 0;
    const purchaseItems = [];
    for (const it of items) {
      const product = this.getProduct(it.product_id);
      const qty = Number(it.qty);
      const price = Number(it.price);
      const lineTotal = qty * price;
      total += lineTotal;

      const purchaseItem = {
        product_id: product.id,
        name: product.name,
        unit: product.unit,
        qty, price,
        total: lineTotal,
        old_purchase_price: Number(product.purchase_price) || 0,
      };

      product.quantity = Number(product.quantity) + qty;
      product.purchase_price = price;

      if (it.new_sale_price !== undefined && it.new_sale_price !== null && it.new_sale_price !== "") {
        purchaseItem.old_sale_price = Number(product.sale_price) || 0;
        purchaseItem.new_sale_price = Number(it.new_sale_price);
        product.sale_price = Number(it.new_sale_price);
      }

      purchaseItems.push(purchaseItem);
    }

    paidAmount = Number(paidAmount) || 0;
    if (paidAmount > total) paidAmount = total;
    const remaining = Math.round((total - paidAmount) * 100) / 100;

    const purchase = {
      id: DB.nextId("purchases"),
      number: DB.getNextInvoiceNumber("purchase"),
      date: nowStr(),
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      items: purchaseItems,
      total,
      paid: paidAmount,
      remaining,
      note: note || "",
    };
    data.purchases.push(purchase);

    supplier.debt = (Number(supplier.debt) || 0) + total;
    if (paidAmount > 0) {
      this._recordPaymentRaw({
        personType: "supplier", personId: supplier.id, personName: supplier.name,
        amount: paidAmount, direction: "out",
        note: `دفعة عند فاتورة شراء رقم ${purchase.number}`,
        refType: "purchase", refId: purchase.id,
      });
      supplier.debt -= paidAmount;
    }

    DB.save();
    return { success: true, data: purchase };
  },

  /**
   * حذف فاتورة شراء وعكس كل تأثيراتها (المخزون، الأسعار، مستحقات المورد، الدفعات)
   */
  deletePurchase(id) {
    const data = DB.load();
    const purchase = this.getPurchase(id);
    if (!purchase) return { success: false, message: "الفاتورة غير موجودة" };

    for (const item of purchase.items) {
      const product = this.getProduct(item.product_id);
      if (product) {
        product.quantity = Number(product.quantity) - Number(item.qty);
        if (item.old_purchase_price !== undefined) product.purchase_price = item.old_purchase_price;
        if (item.old_sale_price !== undefined) product.sale_price = item.old_sale_price;
      }
    }

    const supplier = this.getSupplier(purchase.supplier_id);
    if (supplier) {
      supplier.debt = (Number(supplier.debt) || 0) - Number(purchase.remaining || 0);
    }

    data.payments = data.payments.filter((p) => !(p.ref_type === "purchase" && Number(p.ref_id) === Number(id)));

    data.purchases = data.purchases.filter((p) => Number(p.id) !== Number(id));
    DB.save();
    return { success: true, message: "تم حذف الفاتورة بنجاح" };
  },

  /* ===================== الدفعات ===================== */

  getPayments() {
    return DB.load().payments;
  },

  _recordPaymentRaw({ personType, personId, personName, amount, direction, note = "", refType = null, refId = null }) {
    const data = DB.load();
    const payment = {
      id: DB.nextId("payments"),
      date: nowStr(),
      person_type: personType,
      person_id: personId,
      person_name: personName,
      amount: Number(amount) || 0,
      direction,
      note: note || "",
      ref_type: refType,
      ref_id: refId,
    };
    data.payments.push(payment);
    return payment;
  },

  /**
   * تسجيل دفعة واردة من زبون (تخفض دينه)
   */
  recordCustomerPayment(customerId, amount, note = "") {
    amount = Number(amount) || 0;
    if (amount <= 0) return { success: false, message: "المبلغ يجب أن يكون أكبر من صفر" };

    const customer = this.getCustomer(customerId);
    if (!customer) return { success: false, message: "الزبون غير موجود" };

    this._recordPaymentRaw({
      personType: "customer", personId: customer.id, personName: customer.name,
      amount, direction: "in", note,
    });
    customer.debt = (Number(customer.debt) || 0) - amount;
    DB.save();
    return { success: true, message: "تم تسجيل الدفعة بنجاح" };
  },

  /**
   * تسجيل دفعة صادرة لمورد (تخفض مستحقاته)
   */
  recordSupplierPayment(supplierId, amount, note = "") {
    amount = Number(amount) || 0;
    if (amount <= 0) return { success: false, message: "المبلغ يجب أن يكون أكبر من صفر" };

    const supplier = this.getSupplier(supplierId);
    if (!supplier) return { success: false, message: "المورد غير موجود" };

    this._recordPaymentRaw({
      personType: "supplier", personId: supplier.id, personName: supplier.name,
      amount, direction: "out", note,
    });
    supplier.debt = (Number(supplier.debt) || 0) - amount;
    DB.save();
    return { success: true, message: "تم تسجيل الدفعة بنجاح" };
  },

  /**
   * حذف دفعة وعكس تأثيرها على الدين (الدفعات المرتبطة بفاتورة لا يمكن حذفها مباشرة
   * إذ يتم حذفها تلقائيا عند حذف الفاتورة)
   */
  deletePayment(id) {
    const data = DB.load();
    const payment = DB.findById(data.payments, id);
    if (!payment) return { success: false, message: "الدفعة غير موجودة" };

    if (payment.ref_type) {
      return { success: false, message: "لا يمكن حذف هذه الدفعة لأنها مرتبطة بفاتورة. يمكن حذف الفاتورة نفسها" };
    }

    if (payment.person_type === "customer") {
      const customer = this.getCustomer(payment.person_id);
      if (customer) customer.debt = (Number(customer.debt) || 0) + Number(payment.amount);
    } else if (payment.person_type === "supplier") {
      const supplier = this.getSupplier(payment.person_id);
      if (supplier) supplier.debt = (Number(supplier.debt) || 0) + Number(payment.amount);
    }

    data.payments = data.payments.filter((p) => Number(p.id) !== Number(id));
    DB.save();
    return { success: true, message: "تم حذف الدفعة بنجاح" };
  },

  /* ===================== الديون ===================== */

  getCustomerDebts() {
    const customers = this.getCustomers().filter((c) => Number(c.debt || 0) > 0.001);
    const total = customers.reduce((sum, c) => sum + Number(c.debt || 0), 0);
    return { customers, total };
  },

  getSupplierDebts() {
    const suppliers = this.getSuppliers().filter((s) => Number(s.debt || 0) > 0.001);
    const total = suppliers.reduce((sum, s) => sum + Number(s.debt || 0), 0);
    return { suppliers, total };
  },

  /* ===================== لوحة المعلومات ===================== */

  getDashboardStats() {
    const today = todayStr();
    const sales = this.getSales();
    const todaySales = sales.filter((s) => (s.date || "").slice(0, 10) === today);

    const todaySalesTotal = todaySales.reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
    let todayProfit = 0;
    for (const s of todaySales) {
      for (const item of s.items) {
        todayProfit += (Number(item.price) - Number(item.cost || 0)) * Number(item.qty);
      }
      todayProfit -= Number(s.discount || 0);
    }

    const { total: totalCustomerDebt } = this.getCustomerDebts();
    const { total: totalSupplierDebt } = this.getSupplierDebts();
    const lowStock = this.getLowStockProducts();

    return {
      today_sales_total: todaySalesTotal,
      today_sales_count: todaySales.length,
      today_profit: todayProfit,
      total_customer_debt: totalCustomerDebt,
      total_supplier_debt: totalSupplierDebt,
      low_stock_count: lowStock.length,
      low_stock_products: lowStock,
      products_count: this.getProducts().length,
      customers_count: this.getCustomers().length,
      suppliers_count: this.getSuppliers().length,
    };
  },

  getRecentSales(limit = 8) {
    return [...this.getSales()]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, limit);
  },

  /* ===================== التقارير ===================== */

  getRevenueReport(dateFrom, dateTo) {
    const inRange = (dateStr) => {
      const d = (dateStr || "").slice(0, 10);
      return d >= dateFrom && d <= dateTo;
    };

    const sales = this.getSales().filter((s) => inRange(s.date));
    const purchases = this.getPurchases().filter((p) => inRange(p.date));
    const payments = this.getPayments().filter((p) => inRange(p.date));

    const totalSales = sales.reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount || 0), 0);
    let totalCost = 0;
    for (const s of sales) {
      for (const item of s.items) totalCost += Number(item.cost || 0) * Number(item.qty);
    }
    const profit = totalSales - totalCost;

    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const paymentsIn = payments.filter((p) => p.direction === "in").reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paymentsOut = payments.filter((p) => p.direction === "out").reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const newCustomerDebt = sales.reduce((sum, s) => sum + Number(s.remaining || 0), 0);

    return {
      date_from: dateFrom, date_to: dateTo,
      sales_count: sales.length, total_sales: totalSales, total_discount: totalDiscount,
      total_cost: totalCost, profit,
      purchases_count: purchases.length, total_purchases: totalPurchases,
      payments_in: paymentsIn, payments_out: paymentsOut,
      new_customer_debt: newCustomerDebt,
      sales, purchases, payments,
    };
  },

  getDailySales(days = 7) {
    const result = [];
    const sales = this.getSales();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const pad = (x) => String(x).padStart(2, "0");
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const total = sales
        .filter((s) => (s.date || "").slice(0, 10) === dateStr)
        .reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
      result.push({ date: dateStr, total });
    }
    return result;
  },

  /* ===================== كشوف الحسابات ===================== */

  getCustomerStatement(customerId) {
    const entries = [];
    for (const s of this.getSales()) {
      if (Number(s.customer_id) === Number(customerId)) {
        entries.push({
          date: s.date, type: "فاتورة بيع", ref: s.number,
          amount: s.grand_total, credit: s.paid, debit: s.remaining,
        });
      }
    }
    for (const p of this.getPayments()) {
      if (p.person_type === "customer" && Number(p.person_id) === Number(customerId) && !p.ref_type) {
        entries.push({
          date: p.date, type: "دفعة", ref: "-",
          amount: p.amount, credit: p.amount, debit: 0,
        });
      }
    }
    entries.sort((a, b) => (a.date < b.date ? -1 : 1));
    return entries;
  },

  getSupplierStatement(supplierId) {
    const entries = [];
    for (const p of this.getPurchases()) {
      if (Number(p.supplier_id) === Number(supplierId)) {
        entries.push({
          date: p.date, type: "فاتورة شراء", ref: p.number,
          amount: p.total, paid: p.paid, remaining: p.remaining,
        });
      }
    }
    for (const pay of this.getPayments()) {
      if (pay.person_type === "supplier" && Number(pay.person_id) === Number(supplierId) && !pay.ref_type) {
        entries.push({
          date: pay.date, type: "دفعة", ref: "-",
          amount: pay.amount, paid: pay.amount, remaining: 0,
        });
      }
    }
    entries.sort((a, b) => (a.date < b.date ? -1 : 1));
    return entries;
  },
};

/* =========================================================================
   app.js - الجزء 3: أدوات الواجهة المشتركة (Toast / Modal / Confirm / Forms)
   ========================================================================= */

/* ----------------------------- التنبيهات (Toast) ----------------------------- */

const Toast = {
  _show(message, type) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },
  success(msg) { this._show(msg, "success"); },
  error(msg) { this._show(msg, "error"); },
  warning(msg) { this._show(msg, "warning"); },
};

/* ----------------------------- التأكيد (Confirm) ----------------------------- */

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">تأكيد</div>
        <div class="modal-body">
          <div class="confirm-msg">${escapeHtml(message)}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cancel">إلغاء</button>
          <button class="btn btn-danger" data-action="ok">تأكيد</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      const action = e.target.getAttribute("data-action");
      if (action === "ok") { overlay.remove(); resolve(true); }
      else if (action === "cancel" || e.target === overlay) { overlay.remove(); resolve(false); }
    });
  });
}

/* ----------------------------- نافذة نموذج عامة ----------------------------- */

/**
 * عرض نافذة نموذج عامة وإرجاع القيم المُدخلة عند الحفظ، أو null عند الإلغاء.
 *
 * fields: [{ key, label, type: "text"|"number"|"combo"|"readonly"|"password"|"textarea",
 *            default, options, required, min, width }]
 */
function openForm(title, fields, opts = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    let bodyHtml = "";
    for (const f of fields) {
      bodyHtml += `<div class="form-row"><label>${escapeHtml(f.label)}</label><div class="field">`;
      const val = f.default !== undefined && f.default !== null ? f.default : "";

      if (f.type === "combo") {
        bodyHtml += `<select data-key="${f.key}">`;
        for (const opt of (f.options || [])) {
          const sel = String(opt) === String(val) ? "selected" : "";
          bodyHtml += `<option value="${escapeHtml(opt)}" ${sel}>${escapeHtml(opt)}</option>`;
        }
        bodyHtml += `</select>`;
      } else if (f.type === "readonly") {
        bodyHtml += `<input type="text" data-key="${f.key}" value="${escapeHtml(val)}" readonly>`;
      } else if (f.type === "password") {
        bodyHtml += `<input type="password" data-key="${f.key}" value="${escapeHtml(val)}" autocomplete="new-password">`;
      } else if (f.type === "textarea") {
        bodyHtml += `<textarea data-key="${f.key}" rows="3">${escapeHtml(val)}</textarea>`;
      } else if (f.type === "number") {
        bodyHtml += `<input type="number" step="any" data-key="${f.key}" value="${escapeHtml(val)}">`;
      } else {
        bodyHtml += `<input type="text" data-key="${f.key}" value="${escapeHtml(val)}">`;
      }
      bodyHtml += `</div></div>`;
    }

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">${escapeHtml(title)}</div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cancel">إلغاء</button>
          <button class="btn btn-success" data-action="save">حفظ</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = (result) => { overlay.remove(); resolve(result); };

    overlay.addEventListener("click", (e) => {
      const action = e.target.getAttribute("data-action");
      if (action === "save") {
        const values = {};
        for (const f of fields) {
          const input = overlay.querySelector(`[data-key="${f.key}"]`);
          let raw = input.value;

          if (f.type === "number") {
            if (raw.trim() === "" && f.allowEmpty) {
              values[f.key] = f.defaultValue || 0;
              continue;
            }
            const num = parseFloat(raw);
            if (isNaN(num)) {
              Toast.error(`${f.label}: قيمة غير صحيحة`);
              return;
            }
            if (f.min !== undefined && num < f.min) {
              Toast.error(`${f.label} يجب ألا يكون أقل من ${f.min}`);
              return;
            }
            values[f.key] = num;
          } else if (f.required) {
            if (!raw || !raw.trim()) {
              Toast.error(`${f.label} مطلوب`);
              return;
            }
            values[f.key] = raw.trim();
          } else {
            values[f.key] = (f.type === "password") ? raw : raw.trim();
          }
        }
        close(values);
      } else if (action === "cancel" || e.target === overlay) {
        close(null);
      }
    });

    // إغلاق بمفتاح Escape، حفظ بمفتاح Enter (إلا في textarea)
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(null);
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        overlay.querySelector('[data-action="save"]').click();
      }
    });

    // التركيز على أول حقل
    setTimeout(() => {
      const firstInput = overlay.querySelector("input:not([readonly]), select, textarea");
      if (firstInput) firstInput.focus();
    }, 50);
  });
}

/* ----------------------------- نافذة عامة (مودال مخصص) ----------------------------- */

/**
 * عرض نافذة مودال بمحتوى HTML مخصص. تُرجع عنصر overlay لإدارته من الخارج.
 */
function openModal(title, bodyHtml, { wide = false, footerHtml = "" } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal ${wide ? "modal-wide" : ""}">
      <div class="modal-header">${escapeHtml(title)}
        <button class="btn btn-sm btn-secondary" data-action="close" style="float:left;">إغلاق</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.getAttribute("data-action") === "close") {
      overlay.remove();
    }
  });

  return overlay;
}

/* ----------------------------- مساعدات عامة ----------------------------- */

function parseFloatSafe(value, defVal = 0) {
  const n = parseFloat(value);
  return isNaN(n) ? defVal : n;
}

function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstElementChild;
}

/* =========================================================================
   app.js - الجزء 4: التطبيق الرئيسي (تسجيل الدخول، التنقل، الإطار العام)
   ========================================================================= */

const App = {
  currentUser: null,
  currentSection: "dashboard",
  clockInterval: null,

  async init() {
    await initDatabase();

    const root = document.getElementById("app");

    // محاولة استرجاع الجلسة من sessionStorage
    const savedUserId = sessionStorage.getItem("matjar_session_user_id");
    if (savedUserId) {
      const data = DB.load();
      const user = DB.findById(data.users, savedUserId);
      if (user && user.active) {
        this.currentUser = user;
      }
    }

    if (this.currentUser) {
      this.renderMain();
    } else {
      this.renderLogin();
    }
  },

  /* ----------------------------- شاشة تسجيل الدخول ----------------------------- */

  renderLogin() {
    const root = document.getElementById("app");
    const storeName = DB.getSetting("store_name", CFG.DEFAULT_STORE_NAME);

    root.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <h1>${escapeHtml(storeName)}</h1>
          <div class="login-sub">نظام تسيير المتجر</div>
          <div class="login-error" id="loginError"></div>
          <form id="loginForm">
            <div class="form-row">
              <label>اسم المستخدم</label>
              <input type="text" id="loginUsername" autocomplete="username" autofocus>
            </div>
            <div class="form-row">
              <label>كلمة المرور</label>
              <input type="password" id="loginPassword" autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary">تسجيل الدخول</button>
          </form>
          <div class="login-hint">المستخدم الافتراضي: admin / admin123</div>
        </div>
      </div>`;

    const form = document.getElementById("loginForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("loginUsername").value;
      const password = document.getElementById("loginPassword").value;
      const errorEl = document.getElementById("loginError");
      errorEl.textContent = "";

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "جاري التحقق...";

      const user = await Auth.authenticate(username, password);

      submitBtn.disabled = false;
      submitBtn.textContent = "تسجيل الدخول";

      if (!user) {
        errorEl.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
        return;
      }

      this.currentUser = user;
      sessionStorage.setItem("matjar_session_user_id", user.id);
      this.renderMain();
    });
  },

  logout() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.currentUser = null;
    sessionStorage.removeItem("matjar_session_user_id");
    this.renderLogin();
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === CFG.ROLE_ADMIN;
  },

  getRole() {
    return this.currentUser ? (this.currentUser.role || "seller") : "seller";
  },

  can(permission) {
    return hasPermission(permission);
  },

  /* ----------------------------- الإطار الرئيسي ----------------------------- */

  renderMain() {
    const root = document.getElementById("app");
    const storeName = DB.getSetting("store_name", CFG.DEFAULT_STORE_NAME);
    const roleLabel = CFG.ROLE_LABELS[this.currentUser.role] || this.currentUser.role;
    const roleIcon  = { admin:"👑", manager:"🧑‍💼", seller:"🛒", buyer:"📦", cashier:"💰" }[this.currentUser.role] || "👤";
    const roleBadge = { admin:"#e74c3c", manager:"#f39c12", seller:"#27ae60", buyer:"#2e86ab", cashier:"#9b59b6" }[this.currentUser.role] || "#7f8c8d";
    const sections = getUserSections(this.getRole());

    if (!sections.includes(this.currentSection)) {
      this.currentSection = "dashboard";
    }

    root.innerHTML = `
      <div class="topbar">
        <div class="store-title" id="storeTitle">${escapeHtml(storeName)}</div>
        <div class="topbar-left">
          <span class="clock" id="topClock"></span>
          <span class="user-info">${escapeHtml(this.currentUser.full_name || "")} (${escapeHtml(roleLabel)})</span>
          <button class="btn btn-danger btn-sm" id="logoutBtn">تسجيل الخروج</button>
        </div>
      </div>
      <div class="layout">
        <div class="sidebar" id="sidebar"></div>
        <div class="content" id="content"></div>
      </div>`;

    document.getElementById("logoutBtn").addEventListener("click", () => this.logout());

    const sidebar = document.getElementById("sidebar");
    for (const key of sections) {
      const btn = document.createElement("button");
      btn.className = "nav-btn" + (key === this.currentSection ? " active" : "");
      btn.textContent = CFG.SECTION_LABELS[key] || key;
      btn.dataset.section = key;
      btn.addEventListener("click", () => this.navigateTo(key));
      sidebar.appendChild(btn);
    }

    this._tickClock();
    this.clockInterval = setInterval(() => this._tickClock(), 1000);

    this.renderSection(this.currentSection);
  },

  _tickClock() {
    const el = document.getElementById("topClock");
    if (!el) return;
    const d = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    el.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}   ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  },

  navigateTo(section) {
    this.currentSection = section;
    document.querySelectorAll(".sidebar .nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.section === section);
    });
    this.renderSection(section);
  },

  refreshCurrentSection() {
    this.renderSection(this.currentSection);
  },

  /**
   * إعادة عرض عدة أقسام (تُستخدم بعد عمليات تؤثر على أقسام متعددة).
   * يُعاد رسم القسم الحالي فقط فعليا، لكن الدالة موجودة لتطابق بنية بايثون.
   */
  refreshRelated(sections) {
    if (sections.includes(this.currentSection)) {
      this.renderSection(this.currentSection);
    }
  },

  updateStoreTitle(name) {
    const el = document.getElementById("storeTitle");
    if (el) el.textContent = name;
  },

  renderSection(key) {
    const content = document.getElementById("content");
    switch (key) {
      case "dashboard": return Sections.renderDashboard(content);
      case "inventory": return Sections.renderInventory(content);
      case "customers": return Sections.renderCustomers(content);
      case "suppliers": return Sections.renderSuppliers(content);
      case "sales": return Sections.renderSales(content);
      case "purchases": return Sections.renderPurchases(content);
      case "debts": return Sections.renderDebts(content);
      case "payments": return Sections.renderPayments(content);
      case "reports": return Sections.renderReports(content);
      case "users": return Sections.renderUsers(content);
      case "settings": return Sections.renderSettings(content);
      default: content.innerHTML = `<div class="section">قسم غير معروف</div>`;
    }
  },
};

/* مساحة الأقسام - تُملأ في الأجزاء التالية */
const Sections = {};

/* =========================================================================
   app.js - الجزء 5: مساعدات الجداول + قسم الرئيسية (لوحة المعلومات)
   ========================================================================= */

/**
 * بناء HTML لجدول.
 * columns: [{key, label, width}]
 * rows: [{ _id, _class, <key>: value, ... }]
 */
function tableHtml(columns, rows, emptyText = "لا توجد بيانات لعرضها") {
  let html = '<div class="table-wrap"><table><thead><tr>';
  for (const col of columns) {
    html += `<th${col.width ? ` style="min-width:${col.width}px"` : ""}>${escapeHtml(col.label)}</th>`;
  }
  html += "</tr></thead><tbody>";

  if (!rows || rows.length === 0) {
    html += `<tr class="empty-row"><td colspan="${columns.length}">${escapeHtml(emptyText)}</td></tr>`;
  } else {
    for (const row of rows) {
      const cls = row._class || "";
      const id = row._id !== undefined ? `data-id="${escapeHtml(String(row._id))}"` : "";
      html += `<tr class="${cls}" ${id}>`;
      for (const col of columns) {
        const val = row[col.key];
        html += `<td>${val === undefined || val === null ? "" : val}</td>`;
      }
      html += "</tr>";
    }
  }
  html += "</tbody></table></div>";
  return html;
}

/* ----------------------------- لوحة المعلومات ----------------------------- */

Sections.renderDashboard = function (content) {
  const stats = Models.getDashboardStats();
  const recentSales = Models.getRecentSales(8);

  const salesCols = [
    { key: "number", label: "رقم الفاتورة", width: 110 },
    { key: "date", label: "التاريخ", width: 130 },
    { key: "customer", label: "الزبون", width: 140 },
    { key: "total", label: "الإجمالي", width: 100 },
    { key: "remaining", label: "المتبقي", width: 90 },
  ];
  const salesRows = recentSales.map((s) => ({
    _id: s.id,
    _class: Number(s.remaining) > 0.001 ? "row-debt" : "",
    number: escapeHtml(s.number),
    date: escapeHtml((s.date || "").slice(0, 16)),
    customer: escapeHtml(s.customer_name),
    total: formatCurrency(s.grand_total),
    remaining: formatCurrency(s.remaining),
  }));

  const lowStockCols = [
    { key: "name", label: "المنتج", width: 160 },
    { key: "category", label: "الفئة", width: 110 },
    { key: "quantity", label: "الكمية المتوفرة", width: 110 },
    { key: "min_stock", label: "الحد الأدنى", width: 90 },
  ];
  const lowStockRows = stats.low_stock_products.map((p) => ({
    _id: p.id,
    _class: "row-low-stock",
    name: escapeHtml(p.name),
    category: escapeHtml(p.category || ""),
    quantity: formatNumber(p.quantity),
    min_stock: formatNumber(p.min_stock),
  }));

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">الرئيسية</h2>
      <div class="cards-grid">
        <div class="card"><div class="card-label">مبيعات اليوم</div><div class="card-value">${formatCurrency(stats.today_sales_total)}</div></div>
        <div class="card green"><div class="card-label">الربح التقديري اليوم</div><div class="card-value">${formatCurrency(stats.today_profit)}</div></div>
        <div class="card"><div class="card-label">عدد فواتير اليوم</div><div class="card-value">${formatNumber(stats.today_sales_count)}</div></div>
        <div class="card red"><div class="card-label">إجمالي ديون الزبناء</div><div class="card-value">${formatCurrency(stats.total_customer_debt)}</div></div>
        <div class="card orange"><div class="card-label">مستحقات الموردين</div><div class="card-value">${formatCurrency(stats.total_supplier_debt)}</div></div>
        <div class="card red"><div class="card-label">منتجات منخفضة المخزون</div><div class="card-value">${formatNumber(stats.low_stock_count)}</div></div>
      </div>

      <h3 class="section-title" style="font-size:16px;">آخر الفواتير</h3>
      ${tableHtml(salesCols, salesRows, "لا توجد فواتير بعد")}

      <h3 class="section-title" style="font-size:16px; margin-top:18px;">منتجات منخفضة المخزون</h3>
      ${tableHtml(lowStockCols, lowStockRows, "لا توجد منتجات منخفضة المخزون")}
    </div>`;
};

/* ----------------------------- المخزون ----------------------------- */

Sections.renderInventory = function (content) {
  const canEdit  = hasPermission('canEditInventory');
  const canDel   = hasPermission('canDeleteInventory');
  const canAdj   = hasPermission('canAdjustStock');
  let searchQuery = "";

  const draw = () => {
    let products = [...Models.getProducts()];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      products = products.filter((p) =>
        (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
    }
    products.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    const cols = [
      { key: "name", label: "اسم المنتج", width: 160 },
      { key: "category", label: "الفئة", width: 110 },
      { key: "unit", label: "الوحدة", width: 80 },
      { key: "quantity", label: "الكمية", width: 90 },
      { key: "purchase_price", label: "سعر الشراء", width: 100 },
      { key: "sale_price", label: "سعر البيع", width: 100 },
      { key: "min_stock", label: "الحد الأدنى", width: 90 },
    ];
    const rows = products.map((p) => ({
      _id: p.id,
      _class: Number(p.quantity) <= Number(p.min_stock || 0) ? "row-low-stock" : "",
      name: escapeHtml(p.name),
      category: escapeHtml(p.category || ""),
      unit: escapeHtml(p.unit || ""),
      quantity: formatNumber(p.quantity),
      purchase_price: formatCurrency(p.purchase_price),
      sale_price: formatCurrency(p.sale_price),
      min_stock: formatNumber(p.min_stock),
    }));

    const totalValue = products.reduce((sum, p) => sum + Number(p.quantity) * Number(p.purchase_price), 0);

    document.getElementById("inventoryTableWrap").innerHTML = tableHtml(cols, rows, "لا توجد منتجات");
    document.getElementById("inventorySummary").textContent =
      `عدد المنتجات: ${products.length}    |    القيمة التقديرية للمخزون: ${formatCurrency(totalValue)}`;

    document.querySelectorAll("#inventoryTableWrap tbody tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        document.querySelectorAll("#inventoryTableWrap tbody tr").forEach((r) => r.classList.remove("selected"));
        tr.classList.add("selected");
        tr.dataset.selected = "1";
        selectedId = Number(tr.dataset.id);
      });
    });
  };

  let selectedId = null;

  const adminButtons = isAdmin ? `
    <button class="btn btn-success" id="btnAddProduct">إضافة منتج</button>
    <button class="btn btn-primary" id="btnEditProduct">تعديل</button>
    <button class="btn btn-orange" id="btnAdjustStock">تسوية المخزون</button>
    <button class="btn btn-danger" id="btnDeleteProduct">حذف</button>` : "";

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">المخزون</h2>
      <div class="toolbar">
        <div class="toolbar-right">${adminButtons}</div>
        <div class="toolbar-left">
          <label>بحث:</label>
          <input type="text" id="invSearch" style="width:220px;" placeholder="اسم المنتج أو الفئة">
        </div>
      </div>
      <div id="inventoryTableWrap"></div>
      <div class="summary-bar" id="inventorySummary"></div>
    </div>`;

  document.getElementById("invSearch").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    draw();
  });

  if (canEdit) {
    document.getElementById("btnAddProduct").addEventListener("click", async () => {
      const fields = [
        { key: "name", label: "اسم المنتج", type: "text", required: true },
        { key: "category", label: "الفئة", type: "text" },
        { key: "unit", label: "الوحدة", type: "combo", options: ["قطعة", "كيلو", "غرام", "لتر", "علبة", "كيس", "صندوق", "كرتون"], default: "قطعة" },
        { key: "quantity", label: "الكمية الحالية", type: "number", default: 0, min: 0 },
        { key: "purchase_price", label: "سعر الشراء", type: "number", default: 0, min: 0 },
        { key: "sale_price", label: "سعر البيع", type: "number", default: 0, min: 0 },
        { key: "min_stock", label: "الحد الأدنى للتنبيه", type: "number", default: DB.getSetting("low_stock_default", 5), min: 0 },
      ];
      const result = await openForm("إضافة منتج جديد", fields);
      if (!result) return;
      if (!result.name) { Toast.error("اسم المنتج مطلوب"); return; }
      Models.addProduct(result.name, result.category, result.unit, result.quantity, result.purchase_price, result.sale_price, result.min_stock);
      Toast.success("تم إضافة المنتج بنجاح");
      draw();
    });

    document.getElementById("btnEditProduct").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار منتج من الجدول أولا"); return; }
      const product = Models.getProduct(selectedId);
      if (!product) return;

      const fields = [
        { key: "name", label: "اسم المنتج", type: "text", required: true, default: product.name },
        { key: "category", label: "الفئة", type: "text", default: product.category },
        { key: "unit", label: "الوحدة", type: "combo", options: ["قطعة", "كيلو", "غرام", "لتر", "علبة", "كيس", "صندوق", "كرتون"], default: product.unit },
        { key: "purchase_price", label: "سعر الشراء", type: "number", default: product.purchase_price, min: 0 },
        { key: "sale_price", label: "سعر البيع", type: "number", default: product.sale_price, min: 0 },
        { key: "min_stock", label: "الحد الأدنى للتنبيه", type: "number", default: product.min_stock, min: 0 },
      ];
      const result = await openForm(`تعديل المنتج: ${product.name}`, fields);
      if (!result) return;
      Models.updateProduct(selectedId, result);
      Toast.success("تم تحديث المنتج بنجاح");
      draw();
    });

    document.getElementById("btnAdjustStock").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار منتج من الجدول أولا"); return; }
      const product = Models.getProduct(selectedId);
      if (!product) return;

      const fields = [
        { key: "name", label: "المنتج", type: "readonly", default: product.name },
        { key: "current", label: "الكمية الحالية", type: "readonly", default: formatNumber(product.quantity) },
        { key: "quantity", label: "الكمية الجديدة", type: "number", default: product.quantity, min: 0 },
      ];
      const result = await openForm("تسوية المخزون", fields);
      if (!result) return;
      Models.adjustStock(selectedId, result.quantity);
      Toast.success("تم تعديل كمية المخزون بنجاح");
      draw();
    });

    document.getElementById("btnDeleteProduct").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار منتج من الجدول أولا"); return; }
      const product = Models.getProduct(selectedId);
      if (!product) return;
      if (!(await showConfirm(`هل تريد حذف المنتج "${product.name}"؟`))) return;
      const res = Models.deleteProduct(selectedId);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message);
      selectedId = null;
      draw();
    });
  }

  draw();
};

/* =========================================================================
   app.js - الجزء 6: الزبناء والموردون
   ========================================================================= */

/**
 * عرض سجل حساب زبون أو مورد في نافذة منبثقة، مع إمكانية تسجيل دفعة.
 */
function showStatementModal(kind, person, onChanged) {
  const isCustomer = kind === "customer";
  const entries = isCustomer ? Models.getCustomerStatement(person.id) : Models.getSupplierStatement(person.id);

  let cols, rows;
  if (isCustomer) {
    cols = [
      { key: "date", label: "التاريخ", width: 130 },
      { key: "type", label: "النوع", width: 90 },
      { key: "ref", label: "المرجع", width: 110 },
      { key: "amount", label: "المبلغ", width: 100 },
      { key: "credit", label: "المسدد", width: 100 },
      { key: "debit", label: "دين مضاف", width: 100 },
    ];
    rows = entries.map((e) => ({
      date: escapeHtml((e.date || "").slice(0, 16)), type: escapeHtml(e.type), ref: escapeHtml(e.ref),
      amount: formatCurrency(e.amount), credit: formatCurrency(e.credit), debit: formatCurrency(e.debit),
    }));
  } else {
    cols = [
      { key: "date", label: "التاريخ", width: 130 },
      { key: "type", label: "النوع", width: 90 },
      { key: "ref", label: "المرجع", width: 110 },
      { key: "amount", label: "المبلغ", width: 100 },
      { key: "paid", label: "المدفوع", width: 100 },
      { key: "remaining", label: "المتبقي", width: 100 },
    ];
    rows = entries.map((e) => ({
      date: escapeHtml((e.date || "").slice(0, 16)), type: escapeHtml(e.type), ref: escapeHtml(e.ref),
      amount: formatCurrency(e.amount), paid: formatCurrency(e.paid), remaining: formatCurrency(e.remaining),
    }));
  }

  const debt = Number(person.debt || 0);
  const debtLabel = isCustomer ? "الدين الحالي" : "المستحق له حاليا";
  const debtColor = debt > 0.001 ? "var(--accent-red)" : "var(--accent-green)";

  const bodyHtml = `
    <div style="margin-bottom:10px; text-align:right;">
      <b>${escapeHtml(person.name)}</b> &nbsp; | &nbsp;
      ${debtLabel}: <span style="color:${debtColor}; font-weight:bold;">${formatCurrency(debt)}</span>
    </div>
    ${tableHtml(cols, rows, "لا توجد عمليات مسجلة")}
  `;

  const footerHtml = debt > 0.001
    ? `<button class="btn btn-success" data-action="pay">تسجيل دفعة</button>`
    : "";

  const overlay = openModal(`سجل حساب: ${person.name}`, bodyHtml, { wide: true, footerHtml });

  const payBtn = overlay.querySelector('[data-action="pay"]');
  if (payBtn) {
    payBtn.addEventListener("click", async () => {
      const fields = [
        { key: "debt", label: debtLabel, type: "readonly", default: formatCurrency(debt) },
        { key: "amount", label: "المبلغ المدفوع", type: "number", default: 0, min: 0.01 },
        { key: "note", label: "ملاحظة", type: "text" },
      ];
      const result = await openForm(`تسجيل دفعة: ${person.name}`, fields);
      if (!result) return;

      const res = isCustomer
        ? Models.recordCustomerPayment(person.id, result.amount, result.note)
        : Models.recordSupplierPayment(person.id, result.amount, result.note);

      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message);
      overlay.remove();
      if (onChanged) onChanged();
    });
  }
}

/* ----------------------------- الزبناء ----------------------------- */

Sections.renderCustomers = function (content) {
  const canDelCust = hasPermission('canDeleteCustomer');
  let searchQuery = "";
  let selectedId = null;

  const draw = () => {
    let customers = [...Models.getCustomers()];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      customers = customers.filter((c) =>
        (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q));
    }
    customers.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    const cols = [
      { key: "name", label: "اسم الزبون", width: 180 },
      { key: "phone", label: "الهاتف", width: 120 },
      { key: "address", label: "العنوان", width: 160 },
      { key: "debt", label: "الدين", width: 110 },
    ];
    const rows = customers.map((c) => ({
      _id: c.id,
      _class: Number(c.debt) > 0.001 ? "row-debt" : "",
      name: escapeHtml(c.name), phone: escapeHtml(c.phone || ""), address: escapeHtml(c.address || ""),
      debt: formatCurrency(c.debt),
    }));

    const totalDebt = customers.reduce((sum, c) => sum + Number(c.debt || 0), 0);

    document.getElementById("custTableWrap").innerHTML = tableHtml(cols, rows, "لا يوجد زبناء");
    document.getElementById("custSummary").textContent =
      `عدد الزبناء: ${customers.length}    |    إجمالي الديون: ${formatCurrency(totalDebt)}`;

    document.querySelectorAll("#custTableWrap tbody tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        document.querySelectorAll("#custTableWrap tbody tr").forEach((r) => r.classList.remove("selected"));
        tr.classList.add("selected");
        selectedId = Number(tr.dataset.id);
      });
      tr.addEventListener("dblclick", () => {
        const customer = Models.getCustomer(Number(tr.dataset.id));
        if (customer) showStatementModal("customer", customer, draw);
      });
    });
  };

  const adminButtons = isAdmin ? `<button class="btn btn-danger" id="btnDeleteCustomer">حذف</button>` : "";

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">الزبناء</h2>
      <div class="toolbar">
        <div class="toolbar-right">
          <button class="btn btn-success" id="btnAddCustomer">إضافة زبون</button>
          <button class="btn btn-primary" id="btnEditCustomer">تعديل</button>
          <button class="btn btn-secondary" id="btnStatement">سجل الحساب</button>
          ${adminButtons}
        </div>
        <div class="toolbar-left">
          <label>بحث:</label>
          <input type="text" id="custSearch" style="width:220px;" placeholder="الاسم أو الهاتف">
        </div>
      </div>
      <div id="custTableWrap"></div>
      <div class="summary-bar" id="custSummary"></div>
    </div>`;

  document.getElementById("custSearch").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    draw();
  });

  document.getElementById("btnAddCustomer").addEventListener("click", async () => {
    const fields = [
      { key: "name", label: "اسم الزبون", type: "text", required: true },
      { key: "phone", label: "الهاتف", type: "text" },
      { key: "address", label: "العنوان", type: "text" },
      { key: "opening_debt", label: "دين سابق (اختياري)", type: "number", default: 0, min: 0 },
    ];
    const result = await openForm("إضافة زبون جديد", fields);
    if (!result) return;
    Models.addCustomer(result.name, result.phone, result.address, result.opening_debt);
    Toast.success("تم إضافة الزبون بنجاح");
    draw();
  });

  document.getElementById("btnEditCustomer").addEventListener("click", async () => {
    if (selectedId === null) { Toast.warning("يرجى اختيار زبون من الجدول أولا"); return; }
    const customer = Models.getCustomer(selectedId);
    if (!customer) return;

    const fields = [
      { key: "name", label: "اسم الزبون", type: "text", required: true, default: customer.name },
      { key: "phone", label: "الهاتف", type: "text", default: customer.phone },
      { key: "address", label: "العنوان", type: "text", default: customer.address },
    ];
    const result = await openForm(`تعديل الزبون: ${customer.name}`, fields);
    if (!result) return;
    Models.updateCustomer(selectedId, result);
    Toast.success("تم تحديث بيانات الزبون بنجاح");
    draw();
  });

  document.getElementById("btnStatement").addEventListener("click", () => {
    if (selectedId === null) { Toast.warning("يرجى اختيار زبون من الجدول أولا"); return; }
    const customer = Models.getCustomer(selectedId);
    if (customer) showStatementModal("customer", customer, draw);
  });

  if (canDelCust) {
    document.getElementById("btnDeleteCustomer").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار زبون من الجدول أولا"); return; }
      const customer = Models.getCustomer(selectedId);
      if (!customer) return;
      if (!(await showConfirm(`هل تريد حذف الزبون "${customer.name}"؟`))) return;
      const res = Models.deleteCustomer(selectedId);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message);
      selectedId = null;
      draw();
    });
  }

  draw();
};

/* ----------------------------- الموردون ----------------------------- */

Sections.renderSuppliers = function (content) {
  const canDelSup = hasPermission('canDeleteSupplier');
  let searchQuery = "";
  let selectedId = null;

  const draw = () => {
    let suppliers = [...Models.getSuppliers()];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      suppliers = suppliers.filter((s) =>
        (s.name || "").toLowerCase().includes(q) || (s.phone || "").includes(q));
    }
    suppliers.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    const cols = [
      { key: "name", label: "اسم المورد", width: 180 },
      { key: "phone", label: "الهاتف", width: 120 },
      { key: "address", label: "العنوان", width: 160 },
      { key: "debt", label: "المستحق له", width: 110 },
    ];
    const rows = suppliers.map((s) => ({
      _id: s.id,
      _class: Number(s.debt) > 0.001 ? "row-debt" : "",
      name: escapeHtml(s.name), phone: escapeHtml(s.phone || ""), address: escapeHtml(s.address || ""),
      debt: formatCurrency(s.debt),
    }));

    const totalDebt = suppliers.reduce((sum, s) => sum + Number(s.debt || 0), 0);

    document.getElementById("supTableWrap").innerHTML = tableHtml(cols, rows, "لا يوجد موردون");
    document.getElementById("supSummary").textContent =
      `عدد الموردين: ${suppliers.length}    |    إجمالي المستحقات: ${formatCurrency(totalDebt)}`;

    document.querySelectorAll("#supTableWrap tbody tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        document.querySelectorAll("#supTableWrap tbody tr").forEach((r) => r.classList.remove("selected"));
        tr.classList.add("selected");
        selectedId = Number(tr.dataset.id);
      });
      tr.addEventListener("dblclick", () => {
        const supplier = Models.getSupplier(Number(tr.dataset.id));
        if (supplier) showStatementModal("supplier", supplier, draw);
      });
    });
  };

  const adminButtons = isAdmin ? `<button class="btn btn-danger" id="btnDeleteSupplier">حذف</button>` : "";

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">الموردون</h2>
      <div class="toolbar">
        <div class="toolbar-right">
          <button class="btn btn-success" id="btnAddSupplier">إضافة مورد</button>
          <button class="btn btn-primary" id="btnEditSupplier">تعديل</button>
          <button class="btn btn-secondary" id="btnStatement">سجل الحساب</button>
          ${adminButtons}
        </div>
        <div class="toolbar-left">
          <label>بحث:</label>
          <input type="text" id="supSearch" style="width:220px;" placeholder="الاسم أو الهاتف">
        </div>
      </div>
      <div id="supTableWrap"></div>
      <div class="summary-bar" id="supSummary"></div>
    </div>`;

  document.getElementById("supSearch").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    draw();
  });

  document.getElementById("btnAddSupplier").addEventListener("click", async () => {
    const fields = [
      { key: "name", label: "اسم المورد", type: "text", required: true },
      { key: "phone", label: "الهاتف", type: "text" },
      { key: "address", label: "العنوان", type: "text" },
      { key: "opening_debt", label: "مستحق سابق (اختياري)", type: "number", default: 0, min: 0 },
    ];
    const result = await openForm("إضافة مورد جديد", fields);
    if (!result) return;
    Models.addSupplier(result.name, result.phone, result.address, result.opening_debt);
    Toast.success("تم إضافة المورد بنجاح");
    draw();
  });

  document.getElementById("btnEditSupplier").addEventListener("click", async () => {
    if (selectedId === null) { Toast.warning("يرجى اختيار مورد من الجدول أولا"); return; }
    const supplier = Models.getSupplier(selectedId);
    if (!supplier) return;

    const fields = [
      { key: "name", label: "اسم المورد", type: "text", required: true, default: supplier.name },
      { key: "phone", label: "الهاتف", type: "text", default: supplier.phone },
      { key: "address", label: "العنوان", type: "text", default: supplier.address },
    ];
    const result = await openForm(`تعديل المورد: ${supplier.name}`, fields);
    if (!result) return;
    Models.updateSupplier(selectedId, result);
    Toast.success("تم تحديث بيانات المورد بنجاح");
    draw();
  });

  document.getElementById("btnStatement").addEventListener("click", () => {
    if (selectedId === null) { Toast.warning("يرجى اختيار مورد من الجدول أولا"); return; }
    const supplier = Models.getSupplier(selectedId);
    if (supplier) showStatementModal("supplier", supplier, draw);
  });

  if (canDelSup) {
    document.getElementById("btnDeleteSupplier").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار مورد من الجدول أولا"); return; }
      const supplier = Models.getSupplier(selectedId);
      if (!supplier) return;
      if (!(await showConfirm(`هل تريد حذف المورد "${supplier.name}"؟`))) return;
      const res = Models.deleteSupplier(selectedId);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message);
      selectedId = null;
      draw();
    });
  }

  draw();
};
