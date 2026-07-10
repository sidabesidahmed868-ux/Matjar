/* =========================================================================
   sections2.js — الأقسام المتبقية لنظام تسيير متجر الفتح
   المبيعات · المشتريات · الديون · الدفعات · التقارير · المستخدمون · الإعدادات
   ========================================================================= */

/* =========================================================================
   مساعدات الفواتير (طباعة + عرض)
   ========================================================================= */

function printInvoice(invoice, kind) {
  const storeName = DB.getSetting("store_name", CFG.DEFAULT_STORE_NAME);
  const storeAddress = DB.getSetting("store_address", CFG.DEFAULT_STORE_ADDRESS);
  const storePhone = DB.getSetting("store_phone", "");
  const personLabel = kind === "sale" ? "الزبون" : "المورد";
  const personName = kind === "sale" ? invoice.customer_name : invoice.supplier_name;
  const title = kind === "sale" ? `فاتورة بيع رقم ${invoice.number}` : `فاتورة شراء رقم ${invoice.number}`;

  let rowsHtml = (invoice.items || []).map((it) => `<tr>
    <td>${escapeHtml(it.name)}</td><td>${escapeHtml(it.unit)}</td>
    <td>${formatNumber(it.qty)}</td><td>${formatCurrency(it.price)}</td>
    <td>${formatCurrency(it.total)}</td></tr>`).join("");

  let totalsHtml = kind === "sale"
    ? `<p><b>الإجمالي:</b> ${formatCurrency(invoice.total)}</p>
       ${Number(invoice.discount) > 0 ? `<p><b>الخصم:</b> ${formatCurrency(invoice.discount)}</p>` : ""}
       <p><b>الإجمالي النهائي:</b> ${formatCurrency(invoice.grand_total)}</p>
       <p><b>المدفوع:</b> ${formatCurrency(invoice.paid)}</p>
       <p><b>المتبقي:</b> ${formatCurrency(invoice.remaining)}</p>
       <p><b>طريقة الدفع:</b> ${escapeHtml(invoice.payment_method || "")}</p>`
    : `<p><b>الإجمالي:</b> ${formatCurrency(invoice.total)}</p>
       <p><b>المدفوع:</b> ${formatCurrency(invoice.paid)}</p>
       <p><b>المتبقي:</b> ${formatCurrency(invoice.remaining)}</p>`;

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;padding:30px;color:#2c3e50;max-width:800px;margin:0 auto}
  h1{text-align:center;color:#1f3a5f;margin-bottom:4px}
  .sub{text-align:center;color:#7f8c8d;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th,td{border:1px solid #d9dee3;padding:8px;text-align:center}
  th{background:#1f3a5f;color:#fff}
  tr:nth-child(even){background:#eef2f6}
  .info p,.totals p{margin:4px 0}
  .totals{text-align:right;font-size:15px}
  .footer{text-align:center;margin-top:24px;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:12px}
  @media print{button{display:none}}
</style></head><body onload="window.print()">
  <h1>${escapeHtml(storeName)}</h1>
  <div class="sub">${escapeHtml(storeAddress)}${storePhone ? " — " + escapeHtml(storePhone) : ""}</div>
  <div class="info">
    <p><b>${escapeHtml(title)}</b></p>
    <p>التاريخ: ${escapeHtml(invoice.date)}</p>
    <p>${personLabel}: ${escapeHtml(personName || "")}</p>
    ${invoice.note ? `<p>ملاحظة: ${escapeHtml(invoice.note)}</p>` : ""}
  </div>
  <table><tr><th>المنتج</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>${rowsHtml}</table>
  <div class="totals">${totalsHtml}</div>
  <div class="footer">شكرا لتعاملكم معنا — ${escapeHtml(storeName)}</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) { Toast.error("يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة"); return; }
  win.document.write(html);
  win.document.close();
}

function showInvoiceDetails(invoice, kind) {
  const personLabel = kind === "sale" ? "الزبون" : "المورد";
  const personName = kind === "sale" ? invoice.customer_name : invoice.supplier_name;
  const title = kind === "sale" ? `فاتورة بيع رقم ${invoice.number}` : `فاتورة شراء رقم ${invoice.number}`;

  const itemRows = (invoice.items || []).map((it, i) => `<tr style="${i%2?"background:#f7fafd":""}">
    <td>${escapeHtml(it.name)}</td><td>${escapeHtml(it.unit)}</td>
    <td>${formatNumber(it.qty)}</td><td>${formatCurrency(it.price)}</td>
    <td>${formatCurrency(it.total)}</td></tr>`).join("");

  let totalsHtml = kind === "sale"
    ? `<div class="tr-row"><span>الإجمالي:</span><span>${formatCurrency(invoice.total)}</span></div>
       ${Number(invoice.discount) > 0 ? `<div class="tr-row"><span>الخصم:</span><span style="color:#e74c3c">${formatCurrency(invoice.discount)}</span></div>` : ""}
       <div class="tr-row" style="color:#1f3a5f;font-size:16px"><span>الإجمالي النهائي:</span><span>${formatCurrency(invoice.grand_total)}</span></div>
       <div class="tr-row" style="color:#27ae60"><span>المدفوع:</span><span>${formatCurrency(invoice.paid)}</span></div>
       <div class="tr-row" style="color:#e74c3c"><span>المتبقي:</span><span>${formatCurrency(invoice.remaining)}</span></div>
       <div class="tr-row"><span>طريقة الدفع:</span><span>${escapeHtml(invoice.payment_method || "")}</span></div>`
    : `<div class="tr-row" style="color:#1f3a5f;font-size:16px"><span>الإجمالي:</span><span>${formatCurrency(invoice.total)}</span></div>
       <div class="tr-row" style="color:#27ae60"><span>المدفوع:</span><span>${formatCurrency(invoice.paid)}</span></div>
       <div class="tr-row" style="color:#f39c12"><span>المتبقي:</span><span>${formatCurrency(invoice.remaining)}</span></div>`;

  const storeName = DB.getSetting("store_name", CFG.DEFAULT_STORE_NAME);
  const storeAddress = DB.getSetting("store_address", CFG.DEFAULT_STORE_ADDRESS);

  const bodyHtml = `
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:18px;font-weight:bold;color:#1f3a5f">${escapeHtml(storeName)}</div>
      <div style="color:#7f8c8d;font-size:12px">${escapeHtml(storeAddress)}</div>
    </div>
    <div style="text-align:right;margin-bottom:10px;line-height:1.7">
      <b>${escapeHtml(title)}</b><br>
      التاريخ: ${escapeHtml(invoice.date)}<br>
      ${personLabel}: ${escapeHtml(personName || "")}
      ${invoice.note ? `<br>ملاحظة: ${escapeHtml(invoice.note)}` : ""}
    </div>
    <div style="overflow:auto;max-height:260px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#1f3a5f;color:#fff">
          <th style="padding:8px">المنتج</th><th style="padding:8px">الوحدة</th>
          <th style="padding:8px">الكمية</th><th style="padding:8px">السعر</th>
          <th style="padding:8px">الإجمالي</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div style="margin-top:12px;text-align:right">
      <style>.tr-row{display:flex;justify-content:space-between;padding:4px 0;font-weight:bold;border-bottom:1px solid #eee}</style>
      ${totalsHtml}
    </div>`;

  const overlay = openModal(title, bodyHtml, {
    wide: true,
    footerHtml: `<button class="btn btn-primary" id="printInvoiceBtn">🖨 طباعة</button>`,
  });
  overlay.querySelector("#printInvoiceBtn").addEventListener("click", () => printInvoice(invoice, kind));
}

function showStatementModal(kind, person, onChanged) {
  const isCustomer = kind === "customer";
  const entries = isCustomer ? Models.getCustomerStatement(person.id) : Models.getSupplierStatement(person.id);
  const debt = Number(person.debt || 0);
  const debtLabel = isCustomer ? "الدين الحالي" : "المستحق له";

  const rows = entries.map((e, i) => {
    const bg = i % 2 ? "background:#f7fafd" : "";
    if (isCustomer) return `<tr style="${bg}">
      <td>${escapeHtml((e.date || "").slice(0, 16))}</td>
      <td>${escapeHtml(e.type)}</td><td>${escapeHtml(e.ref)}</td>
      <td>${formatCurrency(e.amount)}</td>
      <td style="color:#27ae60">${formatCurrency(e.credit)}</td>
      <td style="color:#e74c3c">${formatCurrency(e.debit)}</td></tr>`;
    return `<tr style="${bg}">
      <td>${escapeHtml((e.date || "").slice(0, 16))}</td>
      <td>${escapeHtml(e.type)}</td><td>${escapeHtml(e.ref)}</td>
      <td>${formatCurrency(e.amount)}</td>
      <td style="color:#27ae60">${formatCurrency(e.paid)}</td>
      <td style="color:#e74c3c">${formatCurrency(e.remaining)}</td></tr>`;
  }).join("");

  const hdr = isCustomer
    ? "<tr><th>التاريخ</th><th>النوع</th><th>المرجع</th><th>المبلغ</th><th>المسدد</th><th>دين مضاف</th></tr>"
    : "<tr><th>التاريخ</th><th>النوع</th><th>المرجع</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th></tr>";

  const bodyHtml = `
    <div style="text-align:right;margin-bottom:10px;font-size:14px">
      <b>${escapeHtml(person.name)}</b> &nbsp;|&nbsp;
      ${debtLabel}: <span style="color:${debt>0.001?"#e74c3c":"#27ae60"};font-weight:bold">${formatCurrency(debt)}</span>
    </div>
    <div style="overflow:auto;max-height:340px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead style="position:sticky;top:0"><tr style="background:#1f3a5f;color:#fff">${hdr}</tr></thead>
        <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">لا توجد عمليات مسجلة</td></tr>`}</tbody>
      </table>
    </div>`;

  const footerHtml = debt > 0.001
    ? `<button class="btn btn-success" id="stmtPayBtn">تسجيل دفعة</button>` : "";

  const overlay = openModal(`سجل حساب: ${person.name}`, bodyHtml, { wide: true, footerHtml });

  if (debt > 0.001) {
    overlay.querySelector("#stmtPayBtn").addEventListener("click", async () => {
      const fields = [
        { key: "_debt", label: debtLabel, type: "readonly", default: formatCurrency(debt) },
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

/* =========================================================================
   نافذة فاتورة بيع جديدة
   ========================================================================= */

function openNewSaleModal() {
  return new Promise((resolve) => {
    const products = [...Models.getProducts()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const customers = [...Models.getCustomers()].sort((a, b) => a.name.localeCompare(b.name, "ar"));

    if (products.length === 0) {
      Toast.warning("لا توجد منتجات في المخزون. أضف منتجات أولا من قسم المخزون");
      return resolve(null);
    }

    const custOpts = [`<option value="">نقدي (زبون عابر)</option>`]
      .concat(customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)).join("");

    const prodOpts = products.map((p) =>
      `<option value="${p.id}">${escapeHtml(p.name)} (${formatNumber(p.quantity)} ${escapeHtml(p.unit || "")})</option>`).join("");

    const bodyHtml = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div>
          <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px">الزبون</label>
          <select id="saleCustomer" style="width:100%;padding:7px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;font-size:13px">${custOpts}</select>
        </div>
        <div>
          <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px">طريقة الدفع</label>
          <select id="saleMethod" style="width:100%;padding:7px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;font-size:13px">
            <option>نقدي</option><option>تحويل</option><option>أخرى</option>
          </select>
        </div>
      </div>

      <div style="background:#1f3a5f;color:#fff;display:grid;grid-template-columns:50px 1fr 90px 90px 90px 70px;gap:4px;padding:7px 6px;border-radius:6px 6px 0 0;font-size:12px;font-weight:bold;text-align:center">
        <div>حذف</div><div>المنتج</div><div>الكمية</div><div>السعر</div><div>الإجمالي</div><div>الوحدة</div>
      </div>
      <div id="saleItemsWrap" style="border:1px solid #d9dee3;border-top:none;min-height:60px;max-height:240px;overflow-y:auto"></div>
      <button id="addSaleRow" class="btn btn-primary btn-sm" style="margin-top:6px">+ إضافة منتج</button>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;align-items:start">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label style="font-weight:bold;font-size:13px">الخصم</label>
            <input id="saleDiscount" type="number" step="any" value="0" style="width:160px;padding:6px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;text-align:center">
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label style="font-weight:bold;font-size:13px">المدفوع</label>
            <input id="salePaid" type="number" step="any" value="0" style="width:160px;padding:6px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;text-align:center">
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <label style="font-weight:bold;font-size:13px">ملاحظة</label>
            <input id="saleNote" type="text" style="width:160px;padding:6px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;text-align:right">
          </div>
        </div>
        <div style="background:#f4f8fc;border-radius:8px;padding:12px;font-size:14px">
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e0e6ed">
            <span style="font-weight:bold;color:#1f3a5f" id="saleSubtotalVal">0.00 أوقية</span>
            <span>الإجمالي:</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e0e6ed">
            <span style="font-weight:bold;color:#1f3a5f;font-size:16px" id="saleGrandVal">0.00 أوقية</span>
            <span>الإجمالي النهائي:</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0">
            <span style="font-weight:bold;color:#e74c3c" id="saleRemainingVal">0.00 أوقية</span>
            <span>المتبقي (دين):</span>
          </div>
        </div>
      </div>`;

    const overlay = openModal("فاتورة بيع جديدة", bodyHtml, {
      wide: true,
      footerHtml: `<button class="btn btn-secondary" data-action="cancel">إلغاء</button>
                   <button class="btn btn-success" id="saveSaleBtn">💾 حفظ الفاتورة</button>`,
    });

    const wrap = overlay.querySelector("#saleItemsWrap");

    function recalc() {
      let subtotal = 0;
      wrap.querySelectorAll(".sale-item-row").forEach((row) => {
        const qty = parseFloat(row.querySelector(".si-qty").value) || 0;
        const price = parseFloat(row.querySelector(".si-price").value) || 0;
        const tot = qty * price;
        row.querySelector(".si-total").textContent = formatNumber(tot);
        subtotal += tot;
      });
      const disc = parseFloat(overlay.querySelector("#saleDiscount").value) || 0;
      const grand = Math.max(subtotal - disc, 0);
      const paid = parseFloat(overlay.querySelector("#salePaid").value) || 0;
      const rem = Math.round((grand - paid) * 100) / 100;
      overlay.querySelector("#saleSubtotalVal").textContent = formatCurrency(subtotal);
      overlay.querySelector("#saleGrandVal").textContent = formatCurrency(grand);
      overlay.querySelector("#saleRemainingVal").textContent = formatCurrency(rem);
    }

    function addRow() {
      const row = document.createElement("div");
      row.className = "sale-item-row";
      row.style.cssText = "display:grid;grid-template-columns:50px 1fr 90px 90px 90px 70px;gap:4px;padding:5px 6px;border-bottom:1px solid #e0e6ed;align-items:center";
      row.innerHTML = `
        <div style="text-align:center"><button class="btn btn-danger btn-sm si-del">×</button></div>
        <select class="si-product" style="padding:5px;border:1px solid #d9dee3;border-radius:4px;font-family:inherit;font-size:12px;width:100%">${prodOpts}</select>
        <input class="si-qty" type="number" step="any" value="1" style="padding:5px;border:1px solid #d9dee3;border-radius:4px;text-align:center;width:100%;font-family:inherit">
        <input class="si-price" type="number" step="any" value="0" style="padding:5px;border:1px solid #d9dee3;border-radius:4px;text-align:center;width:100%;font-family:inherit">
        <div class="si-total" style="text-align:center;font-weight:bold;font-size:13px">0</div>
        <div class="si-unit" style="text-align:center;color:#666;font-size:12px"></div>`;
      wrap.appendChild(row);

      const sel = row.querySelector(".si-product");
      const priceEl = row.querySelector(".si-price");
      const unitEl = row.querySelector(".si-unit");

      function applyProduct() {
        const p = Models.getProduct(Number(sel.value));
        if (p) { priceEl.value = p.sale_price; unitEl.textContent = p.unit || ""; }
        recalc();
      }
      applyProduct();
      sel.addEventListener("change", applyProduct);
      row.querySelector(".si-qty").addEventListener("input", recalc);
      priceEl.addEventListener("input", recalc);
      row.querySelector(".si-del").addEventListener("click", () => {
        if (wrap.children.length <= 1) { Toast.warning("يجب أن تحتوي الفاتورة على عنصر واحد على الأقل"); return; }
        row.remove(); recalc();
      });
    }

    overlay.querySelector("#addSaleRow").addEventListener("click", addRow);
    overlay.querySelector("#saleDiscount").addEventListener("input", recalc);
    overlay.querySelector("#salePaid").addEventListener("input", recalc);
    addRow();

    overlay.querySelector("#saveSaleBtn").addEventListener("click", () => {
      const items = [];
      let valid = true;
      wrap.querySelectorAll(".sale-item-row").forEach((row) => {
        const pid = Number(row.querySelector(".si-product").value);
        const qty = parseFloat(row.querySelector(".si-qty").value);
        const price = parseFloat(row.querySelector(".si-price").value);
        if (!qty || qty <= 0) { Toast.error("الكمية يجب أن تكون أكبر من صفر"); valid = false; }
        if (price < 0) { Toast.error("السعر غير صحيح"); valid = false; }
        if (valid) items.push({ product_id: pid, qty, price });
      });
      if (!valid) return;

      const discount = parseFloat(overlay.querySelector("#saleDiscount").value) || 0;
      const paid = parseFloat(overlay.querySelector("#salePaid").value) || 0;
      const customerVal = overlay.querySelector("#saleCustomer").value;
      const customerId = customerVal ? Number(customerVal) : null;
      const paymentMethod = overlay.querySelector("#saleMethod").value;
      const note = overlay.querySelector("#saleNote").value.trim();

      const res = Models.createSale({ customerId, items, discount, paidAmount: paid, paymentMethod, note });
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(`تم حفظ الفاتورة بنجاح برقم ${res.data.number}`);
      overlay.remove();
      resolve(res.data);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target.getAttribute("data-action") === "cancel" || e.target === overlay) {
        overlay.remove(); resolve(null);
      }
    });
  });
}

/* =========================================================================
   نافذة فاتورة شراء جديدة
   ========================================================================= */

function openNewPurchaseModal() {
  return new Promise((resolve) => {
    const products = [...Models.getProducts()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const suppliers = [...Models.getSuppliers()].sort((a, b) => a.name.localeCompare(b.name, "ar"));

    if (suppliers.length === 0) { Toast.warning("لا يوجد موردون. أضف موردا أولا من قسم الموردون"); return resolve(null); }
    if (products.length === 0) { Toast.warning("لا توجد منتجات في المخزون. أضف منتجات أولا من قسم المخزون"); return resolve(null); }

    const supOpts = suppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
    const prodOpts = products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");

    const bodyHtml = `
      <div style="margin-bottom:14px">
        <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px">المورد</label>
        <select id="purSupplier" style="width:260px;padding:7px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;font-size:13px">${supOpts}</select>
      </div>

      <div style="background:#1f3a5f;color:#fff;display:grid;grid-template-columns:50px 1fr 80px 100px 110px 80px;gap:4px;padding:7px 6px;border-radius:6px 6px 0 0;font-size:11px;font-weight:bold;text-align:center">
        <div>حذف</div><div>المنتج</div><div>الكمية</div><div>سعر الشراء</div><div>سعر بيع جديد</div><div>الإجمالي</div>
      </div>
      <div id="purItemsWrap" style="border:1px solid #d9dee3;border-top:none;min-height:60px;max-height:240px;overflow-y:auto"></div>
      <button id="addPurRow" class="btn btn-primary btn-sm" style="margin-top:6px">+ إضافة منتج</button>

      <div class="note-box" style="margin-top:10px">اتركوا حقل "سعر بيع جديد" فارغا إن لم ترغبوا في تغيير سعر البيع الحالي للمنتج.</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:10px;align-items:start">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <label style="font-weight:bold;font-size:13px">المدفوع الآن</label>
            <input id="purPaid" type="number" step="any" value="0" style="width:160px;padding:6px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;text-align:center">
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <label style="font-weight:bold;font-size:13px">ملاحظة</label>
            <input id="purNote" type="text" style="width:160px;padding:6px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit;text-align:right">
          </div>
        </div>
        <div style="background:#f4f8fc;border-radius:8px;padding:12px;font-size:14px">
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e0e6ed">
            <span style="font-weight:bold;color:#1f3a5f;font-size:16px" id="purTotalVal">0.00 أوقية</span>
            <span>إجمالي الفاتورة:</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0">
            <span style="font-weight:bold;color:#f39c12" id="purRemainingVal">0.00 أوقية</span>
            <span>المتبقي (للمورد):</span>
          </div>
        </div>
      </div>`;

    const overlay = openModal("فاتورة شراء جديدة", bodyHtml, {
      wide: true,
      footerHtml: `<button class="btn btn-secondary" data-action="cancel">إلغاء</button>
                   <button class="btn btn-success" id="savePurBtn">💾 حفظ الفاتورة</button>`,
    });

    const wrap = overlay.querySelector("#purItemsWrap");

    function recalc() {
      let total = 0;
      wrap.querySelectorAll(".pur-item-row").forEach((row) => {
        const qty = parseFloat(row.querySelector(".pi-qty").value) || 0;
        const price = parseFloat(row.querySelector(".pi-price").value) || 0;
        const tot = qty * price;
        row.querySelector(".pi-total").textContent = formatNumber(tot);
        total += tot;
      });
      const paid = parseFloat(overlay.querySelector("#purPaid").value) || 0;
      const rem = Math.round((total - paid) * 100) / 100;
      overlay.querySelector("#purTotalVal").textContent = formatCurrency(total);
      overlay.querySelector("#purRemainingVal").textContent = formatCurrency(rem);
    }

    function addRow() {
      const row = document.createElement("div");
      row.className = "pur-item-row";
      row.style.cssText = "display:grid;grid-template-columns:50px 1fr 80px 100px 110px 80px;gap:4px;padding:5px 6px;border-bottom:1px solid #e0e6ed;align-items:center";
      row.innerHTML = `
        <div style="text-align:center"><button class="btn btn-danger btn-sm pi-del">×</button></div>
        <select class="pi-product" style="padding:5px;border:1px solid #d9dee3;border-radius:4px;font-family:inherit;font-size:12px;width:100%">${prodOpts}</select>
        <input class="pi-qty" type="number" step="any" value="1" style="padding:5px;border:1px solid #d9dee3;border-radius:4px;text-align:center;width:100%;font-family:inherit">
        <input class="pi-price" type="number" step="any" value="0" style="padding:5px;border:1px solid #d9dee3;border-radius:4px;text-align:center;width:100%;font-family:inherit">
        <input class="pi-newprice" type="number" step="any" placeholder="اختياري" style="padding:5px;border:1px solid #d9dee3;border-radius:4px;text-align:center;width:100%;font-family:inherit;background:#fffbe7">
        <div class="pi-total" style="text-align:center;font-weight:bold;font-size:13px">0</div>`;
      wrap.appendChild(row);

      const sel = row.querySelector(".pi-product");
      function applyProduct() {
        const p = Models.getProduct(Number(sel.value));
        if (p) row.querySelector(".pi-price").value = p.purchase_price;
        recalc();
      }
      applyProduct();
      sel.addEventListener("change", applyProduct);
      row.querySelector(".pi-qty").addEventListener("input", recalc);
      row.querySelector(".pi-price").addEventListener("input", recalc);
      row.querySelector(".pi-del").addEventListener("click", () => {
        if (wrap.children.length <= 1) { Toast.warning("يجب أن تحتوي الفاتورة على عنصر واحد على الأقل"); return; }
        row.remove(); recalc();
      });
    }

    overlay.querySelector("#addPurRow").addEventListener("click", addRow);
    overlay.querySelector("#purPaid").addEventListener("input", recalc);
    addRow();

    overlay.querySelector("#savePurBtn").addEventListener("click", () => {
      const items = [];
      let valid = true;
      wrap.querySelectorAll(".pur-item-row").forEach((row) => {
        const pid = Number(row.querySelector(".pi-product").value);
        const qty = parseFloat(row.querySelector(".pi-qty").value);
        const price = parseFloat(row.querySelector(".pi-price").value);
        const newPriceRaw = row.querySelector(".pi-newprice").value.trim();
        if (!qty || qty <= 0) { Toast.error("الكمية يجب أن تكون أكبر من صفر"); valid = false; }
        if (price < 0) { Toast.error("السعر غير صحيح"); valid = false; }
        if (valid) {
          const item = { product_id: pid, qty, price };
          if (newPriceRaw !== "") item.new_sale_price = parseFloat(newPriceRaw) || 0;
          items.push(item);
        }
      });
      if (!valid) return;

      const supplierId = Number(overlay.querySelector("#purSupplier").value);
      const paid = parseFloat(overlay.querySelector("#purPaid").value) || 0;
      const note = overlay.querySelector("#purNote").value.trim();

      const res = Models.createPurchase({ supplierId, items, paidAmount: paid, note });
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(`تم حفظ فاتورة الشراء بنجاح برقم ${res.data.number}`);
      overlay.remove();
      resolve(res.data);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target.getAttribute("data-action") === "cancel" || e.target === overlay) {
        overlay.remove(); resolve(null);
      }
    });
  });
}

/* =========================================================================
   قسم المبيعات
   ========================================================================= */

Sections.renderSales = function (content) {
  const canDeleteSale = hasPermission('canDeleteSale');
  let search = "", selectedId = null;

  const draw = () => {
    let sales = [...Models.getSales()].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (search) {
      const q = search.toLowerCase();
      sales = sales.filter((s) =>
        (s.number || "").toLowerCase().includes(q) || (s.customer_name || "").toLowerCase().includes(q));
    }
    const cols = [
      { key: "number", label: "رقم الفاتورة", width: 120 },
      { key: "date", label: "التاريخ", width: 130 },
      { key: "customer", label: "الزبون", width: 150 },
      { key: "total", label: "الإجمالي", width: 110 },
      { key: "paid", label: "المدفوع", width: 100 },
      { key: "remaining", label: "المتبقي", width: 90 },
      { key: "method", label: "طريقة الدفع", width: 90 },
    ];
    const rows = sales.map((s) => ({
      _id: s.id, _class: Number(s.remaining) > 0.001 ? "row-debt" : "",
      number: escapeHtml(s.number), date: escapeHtml((s.date || "").slice(0, 16)),
      customer: escapeHtml(s.customer_name), total: formatCurrency(s.grand_total),
      paid: formatCurrency(s.paid), remaining: formatCurrency(s.remaining),
      method: escapeHtml(s.payment_method || ""),
    }));
    const tot = sales.reduce((s, x) => s + Number(x.grand_total || 0), 0);
    document.getElementById("salesTableWrap").innerHTML = tableHtml(cols, rows, "لا توجد فواتير");
    document.getElementById("salesSummary").textContent =
      `عدد الفواتير: ${sales.length}    |    إجمالي المبيعات: ${formatCurrency(tot)}`;
    document.querySelectorAll("#salesTableWrap tbody tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        document.querySelectorAll("#salesTableWrap tbody tr").forEach((r) => r.classList.remove("selected"));
        tr.classList.add("selected"); selectedId = Number(tr.dataset.id);
      });
      tr.addEventListener("dblclick", () => { const s = Models.getSale(Number(tr.dataset.id)); if (s) showInvoiceDetails(s, "sale"); });
    });
  };

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">المبيعات والفواتير</h2>
      <div class="toolbar">
        <div class="toolbar-right">
          <button class="btn btn-success" id="btnNewSale">فاتورة بيع جديدة</button>
          <button class="btn btn-primary" id="btnViewSale">عرض الفاتورة</button>
          ${canDeleteSale ? `<button class="btn btn-danger" id="btnDeleteSale">حذف</button>` : ""}
        </div>
        <div class="toolbar-left">
          <label>بحث:</label>
          <input type="text" id="salesSearch" style="width:220px" placeholder="رقم الفاتورة أو الزبون">
        </div>
      </div>
      <div id="salesTableWrap"></div>
      <div class="summary-bar" id="salesSummary"></div>
    </div>`;

  document.getElementById("salesSearch").addEventListener("input", (e) => { search = e.target.value.trim(); draw(); });
  document.getElementById("btnNewSale").addEventListener("click", async () => {
    const r = await openNewSaleModal();
    if (r) { draw(); App.refreshRelated(["dashboard", "inventory", "customers", "debts", "payments"]); }
  });
  document.getElementById("btnViewSale").addEventListener("click", () => {
    if (selectedId === null) { Toast.warning("يرجى اختيار فاتورة أولا"); return; }
    const s = Models.getSale(selectedId); if (s) showInvoiceDetails(s, "sale");
  });
  if (canDeleteSale) {
    document.getElementById("btnDeleteSale").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار فاتورة أولا"); return; }
      const s = Models.getSale(selectedId); if (!s) return;
      if (!(await showConfirm(`هل تريد حذف الفاتورة رقم ${s.number}؟\nسيتم إعادة الكميات إلى المخزون وعكس الدين.`))) return;
      const res = Models.deleteSale(selectedId);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message); selectedId = null; draw();
      App.refreshRelated(["dashboard", "inventory", "customers", "debts", "payments"]);
    });
  }
  draw();
};

/* =========================================================================
   قسم المشتريات
   ========================================================================= */

Sections.renderPurchases = function (content) {
  const canDeletePurchase = hasPermission('canDeletePurchase');
  let search = "", selectedId = null;

  const draw = () => {
    let purchases = [...Models.getPurchases()].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (search) {
      const q = search.toLowerCase();
      purchases = purchases.filter((p) =>
        (p.number || "").toLowerCase().includes(q) || (p.supplier_name || "").toLowerCase().includes(q));
    }
    const cols = [
      { key: "number", label: "رقم الفاتورة", width: 120 },
      { key: "date", label: "التاريخ", width: 130 },
      { key: "supplier", label: "المورد", width: 160 },
      { key: "total", label: "الإجمالي", width: 110 },
      { key: "paid", label: "المدفوع", width: 100 },
      { key: "remaining", label: "المتبقي", width: 100 },
    ];
    const rows = purchases.map((p) => ({
      _id: p.id, _class: Number(p.remaining) > 0.001 ? "row-debt" : "",
      number: escapeHtml(p.number), date: escapeHtml((p.date || "").slice(0, 16)),
      supplier: escapeHtml(p.supplier_name), total: formatCurrency(p.total),
      paid: formatCurrency(p.paid), remaining: formatCurrency(p.remaining),
    }));
    const tot = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    document.getElementById("purTableWrap").innerHTML = tableHtml(cols, rows, "لا توجد فواتير شراء");
    document.getElementById("purSummary").textContent =
      `عدد الفواتير: ${purchases.length}    |    إجمالي المشتريات: ${formatCurrency(tot)}`;
    document.querySelectorAll("#purTableWrap tbody tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        document.querySelectorAll("#purTableWrap tbody tr").forEach((r) => r.classList.remove("selected"));
        tr.classList.add("selected"); selectedId = Number(tr.dataset.id);
      });
      tr.addEventListener("dblclick", () => { const p = Models.getPurchase(Number(tr.dataset.id)); if (p) showInvoiceDetails(p, "purchase"); });
    });
  };

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">المشتريات</h2>
      <div class="toolbar">
        <div class="toolbar-right">
          <button class="btn btn-success" id="btnNewPur">فاتورة شراء جديدة</button>
          <button class="btn btn-primary" id="btnViewPur">عرض الفاتورة</button>
          ${canDeletePurchase ? `<button class="btn btn-danger" id="btnDeletePur">حذف</button>` : ""}
        </div>
        <div class="toolbar-left">
          <label>بحث:</label>
          <input type="text" id="purSearch" style="width:220px" placeholder="رقم الفاتورة أو المورد">
        </div>
      </div>
      <div id="purTableWrap"></div>
      <div class="summary-bar" id="purSummary"></div>
    </div>`;

  document.getElementById("purSearch").addEventListener("input", (e) => { search = e.target.value.trim(); draw(); });
  document.getElementById("btnNewPur").addEventListener("click", async () => {
    const r = await openNewPurchaseModal();
    if (r) { draw(); App.refreshRelated(["dashboard", "inventory", "suppliers", "debts", "payments"]); }
  });
  document.getElementById("btnViewPur").addEventListener("click", () => {
    if (selectedId === null) { Toast.warning("يرجى اختيار فاتورة أولا"); return; }
    const p = Models.getPurchase(selectedId); if (p) showInvoiceDetails(p, "purchase");
  });
  if (canDeletePurchase) {
    document.getElementById("btnDeletePur").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار فاتورة أولا"); return; }
      const p = Models.getPurchase(selectedId); if (!p) return;
      if (!(await showConfirm(`هل تريد حذف الفاتورة رقم ${p.number}؟\nسيتم خصم الكميات من المخزون وعكس المستحقات.`))) return;
      const res = Models.deletePurchase(selectedId);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message); selectedId = null; draw();
      App.refreshRelated(["dashboard", "inventory", "suppliers", "debts", "payments"]);
    });
  }
  draw();
};

/* =========================================================================
   قسم الديون
   ========================================================================= */

Sections.renderDebts = function (content) {
  let tab = "customers";

  const draw = () => {
    const custDebts = Models.getCustomerDebts();
    const supDebts = Models.getSupplierDebts();

    const custCols = [
      { key: "id", label: "#", width: 50 },
      { key: "name", label: "اسم الزبون", width: 200 },
      { key: "phone", label: "الهاتف", width: 120 },
      { key: "debt", label: "الدين", width: 130 },
    ];
    const supCols = [
      { key: "id", label: "#", width: 50 },
      { key: "name", label: "اسم المورد", width: 200 },
      { key: "phone", label: "الهاتف", width: 120 },
      { key: "debt", label: "المستحق له", width: 130 },
    ];

    const custRows = [...custDebts.customers].sort((a, b) => b.debt - a.debt).map((c) => ({
      _id: c.id, _class: "row-debt",
      id: c.id, name: escapeHtml(c.name), phone: escapeHtml(c.phone || "—"), debt: formatCurrency(c.debt),
    }));
    const supRows = [...supDebts.suppliers].sort((a, b) => b.debt - a.debt).map((s) => ({
      _id: s.id, _class: "row-debt",
      id: s.id, name: escapeHtml(s.name), phone: escapeHtml(s.phone || "—"), debt: formatCurrency(s.debt),
    }));

    const custTable = tableHtml(custCols, custRows, "✅ لا توجد ديون");
    const supTable = tableHtml(supCols, supRows, "✅ لا توجد مستحقات");

    document.getElementById("debtsBody").innerHTML = `
      <div style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn ${tab==="customers"?"btn-primary":"btn-secondary"}" id="tabCust">
          👤 ديون الزبناء (${custDebts.customers.length})
        </button>
        <button class="btn ${tab==="suppliers"?"btn-primary":"btn-secondary"}" id="tabSup">
          🏭 مستحقات الموردين (${supDebts.suppliers.length})
        </button>
      </div>
      ${tab === "customers" ? `
        <div style="background:#fff3f3;border-radius:8px;padding:10px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
          <button class="btn btn-success btn-sm" id="debtPayCust">تسجيل دفعة من زبون</button>
          <span style="font-weight:bold;color:#e74c3c;font-size:16px">إجمالي الديون: ${formatCurrency(custDebts.total)}</span>
        </div>
        ${custTable}` : `
        <div style="background:#fff8f0;border-radius:8px;padding:10px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
          <button class="btn btn-success btn-sm" id="debtPaySup">تسجيل دفعة لمورد</button>
          <span style="font-weight:bold;color:#f39c12;font-size:16px">إجمالي المستحقات: ${formatCurrency(supDebts.total)}</span>
        </div>
        ${supTable}`}`;

    document.getElementById("tabCust").addEventListener("click", () => { tab = "customers"; draw(); });
    document.getElementById("tabSup").addEventListener("click", () => { tab = "suppliers"; draw(); });

    const payBtn = document.getElementById(tab === "customers" ? "debtPayCust" : "debtPaySup");
    if (payBtn) {
      payBtn.addEventListener("click", async () => {
        const people = tab === "customers"
          ? custDebts.customers.sort((a, b) => b.debt - a.debt)
          : supDebts.suppliers.sort((a, b) => b.debt - a.debt);
        if (people.length === 0) { Toast.warning("لا توجد ديون لتسجيل دفعة عليها"); return; }
        const names = people.map((p) => p.name);
        const fields = [
          { key: "person", label: tab === "customers" ? "الزبون" : "المورد", type: "combo", options: names, default: names[0] },
          { key: "amount", label: "المبلغ", type: "number", default: 0, min: 0.01 },
          { key: "note", label: "ملاحظة", type: "text" },
        ];
        const result = await openForm(`تسجيل دفعة`, fields);
        if (!result) return;
        const person = people.find((p) => p.name === result.person);
        if (!person) return;
        const res = tab === "customers"
          ? Models.recordCustomerPayment(person.id, result.amount, result.note)
          : Models.recordSupplierPayment(person.id, result.amount, result.note);
        if (!res.success) { Toast.error(res.message); return; }
        Toast.success(res.message); draw();
        App.refreshRelated(["dashboard", "customers", "suppliers", "payments"]);
      });
    }

    // نقر مزدوج لفتح كشف الحساب
    const tableId = tab === "customers" ? "#debtsBody" : "#debtsBody";
    document.querySelectorAll(`#debtsBody tbody tr[data-id]`).forEach((tr) => {
      tr.addEventListener("dblclick", () => {
        const id = Number(tr.dataset.id);
        const person = tab === "customers" ? Models.getCustomer(id) : Models.getSupplier(id);
        if (person) showStatementModal(tab === "customers" ? "customer" : "supplier", person, draw);
      });
    });
  };

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">الديون والمستحقات</h2>
      <div id="debtsBody"></div>
    </div>`;
  draw();
};

/* =========================================================================
   قسم الدفعات
   ========================================================================= */

Sections.renderPayments = function (content) {
  const canDeletePayment = hasPermission('canDeletePayment');
  let filter = "all", selectedId = null;

  const DIRECTION_LABELS = { in: "تحصيل (وارد)", out: "تسديد (صادر)" };
  const TYPE_LABELS = { customer: "زبون", supplier: "مورد", cash_sale: "بيع نقدي" };

  const draw = () => {
    let payments = [...DB.load().payments].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (filter === "in") payments = payments.filter((p) => p.direction === "in");
    else if (filter === "out") payments = payments.filter((p) => p.direction === "out");

    const cols = [
      { key: "date", label: "التاريخ", width: 140 },
      { key: "type", label: "النوع", width: 80 },
      { key: "name", label: "الاسم", width: 160 },
      { key: "amount", label: "المبلغ", width: 120 },
      { key: "direction", label: "الاتجاه", width: 120 },
      { key: "note", label: "ملاحظة", width: 200 },
    ];
    const rows = payments.map((p) => ({
      _id: p.id,
      _class: p.direction === "in" ? "row-ok" : "row-debt",
      date: escapeHtml((p.date || "").slice(0, 16)),
      type: escapeHtml(TYPE_LABELS[p.person_type] || p.person_type || ""),
      name: escapeHtml(p.person_name || ""),
      amount: formatCurrency(p.amount),
      direction: escapeHtml(DIRECTION_LABELS[p.direction] || ""),
      note: escapeHtml(p.note || ""),
    }));

    const totalIn = payments.filter((p) => p.direction === "in").reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalOut = payments.filter((p) => p.direction === "out").reduce((s, p) => s + Number(p.amount || 0), 0);

    document.getElementById("payTableWrap").innerHTML = tableHtml(cols, rows, "لا توجد دفعات");
    document.getElementById("paySummary").textContent =
      `الوارد: ${formatCurrency(totalIn)}    |    الصادر: ${formatCurrency(totalOut)}`;

    document.querySelectorAll("#payTableWrap tbody tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        document.querySelectorAll("#payTableWrap tbody tr").forEach((r) => r.classList.remove("selected"));
        tr.classList.add("selected"); selectedId = Number(tr.dataset.id);
      });
    });
  };

  content.innerHTML = `
    <div class="section">
      <h2 class="section-title">الدفعات</h2>
      <div class="toolbar">
        <div class="toolbar-right">
          <button class="btn btn-success" id="btnPayCust">دفعة من زبون</button>
          <button class="btn btn-primary" id="btnPaySup">دفعة لمورد</button>
          ${canDeletePayment ? `<button class="btn btn-danger" id="btnDeletePay">حذف</button>` : ""}
        </div>
        <div class="toolbar-left">
          <label>عرض:</label>
          <select id="payFilter" style="padding:6px 10px;border:1px solid #d9dee3;border-radius:5px;font-family:inherit">
            <option value="all">الكل</option>
            <option value="in">الوارد فقط (زبناء)</option>
            <option value="out">الصادر فقط (موردون)</option>
          </select>
        </div>
      </div>
      <div id="payTableWrap"></div>
      <div class="summary-bar" id="paySummary"></div>
    </div>`;

  document.getElementById("payFilter").addEventListener("change", (e) => { filter = e.target.value; draw(); });

  async function newPayment(kind) {
    const people = kind === "customer" ? [...Models.getCustomers()] : [...Models.getSuppliers()];
    if (people.length === 0) { Toast.warning("لا يوجد " + (kind === "customer" ? "زبناء" : "موردون")); return; }
    const names = people.map((p) => p.name);
    const fields = [
      { key: "person", label: kind === "customer" ? "الزبون" : "المورد", type: "combo", options: names, default: names[0] },
      { key: "amount", label: "المبلغ", type: "number", default: 0, min: 0.01 },
      { key: "note", label: "ملاحظة", type: "text" },
    ];
    const result = await openForm(kind === "customer" ? "دفعة من زبون" : "دفعة لمورد", fields);
    if (!result) return;
    const person = people.find((p) => p.name === result.person);
    if (!person) return;
    const res = kind === "customer"
      ? Models.recordCustomerPayment(person.id, result.amount, result.note)
      : Models.recordSupplierPayment(person.id, result.amount, result.note);
    if (!res.success) { Toast.error(res.message); return; }
    Toast.success(res.message); draw();
    App.refreshRelated(["dashboard", "customers", "suppliers", "debts"]);
  }

  document.getElementById("btnPayCust").addEventListener("click", () => newPayment("customer"));
  document.getElementById("btnPaySup").addEventListener("click", () => newPayment("supplier"));

  if (canDeletePayment) {
    document.getElementById("btnDeletePay").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار دفعة أولا"); return; }
      if (!(await showConfirm("هل تريد حذف هذه الدفعة؟ سيتم عكس تأثيرها على الدين."))) return;
      const res = Models.deletePayment(selectedId);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message); selectedId = null; draw();
      App.refreshRelated(["dashboard", "customers", "suppliers", "debts"]);
    });
  }
  draw();
};

/* =========================================================================
   قسم التقارير الاحترافي
   ========================================================================= */

Sections.renderReports = function (content) {
  let period = "month";
  let customFrom = new Date().toISOString().slice(0, 10);
  let customTo   = new Date().toISOString().slice(0, 10);
  let activeReport = "profit";

  /* ── حساب نطاق التاريخ ── */
  function getRange() {
    const today = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (period === "today")   return { from: ds(today), to: ds(today) };
    if (period === "week") {
      const d = new Date(today); d.setDate(d.getDate() - d.getDay());
      return { from: ds(d), to: ds(today) };
    }
    if (period === "month")   return { from: ds(new Date(today.getFullYear(), today.getMonth(), 1)), to: ds(today) };
    if (period === "quarter") {
      const q = Math.floor(today.getMonth()/3);
      return { from: ds(new Date(today.getFullYear(), q*3, 1)), to: ds(today) };
    }
    if (period === "year")    return { from: `${today.getFullYear()}-01-01`, to: ds(today) };
    return { from: customFrom, to: customTo };
  }

  /* ── حساب إحصاءات التقرير ── */
  function calcReport() {
    const { from, to } = getRange();
    const inRange = (d) => { const s = (d||"").slice(0,10); return s>=from && s<=to; };

    const data      = DB.load();
    const sales     = (data.sales     || []).filter((s) => inRange(s.date));
    const purchases = (data.purchases || []).filter((p) => inRange(p.date));
    const payments  = (data.payments  || []).filter((p) => inRange(p.date));
    const products  = data.products   || [];
    const customers = data.customers  || [];
    const suppliers = data.suppliers  || [];

    let totalRevenue = 0, totalCost = 0, totalDiscount = 0;
    const productSalesMap = {}, custSalesMap = {}, catMap = {}, dailyMap = {};
    for (const s of sales) {
      totalRevenue  += Number(s.grand_total||0);
      totalDiscount += Number(s.discount||0);
      const dateKey  = (s.date||"").slice(0,10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, revenue: 0, cost: 0, count: 0 };
      dailyMap[dateKey].revenue += Number(s.grand_total||0);
      dailyMap[dateKey].count++;
      for (const it of s.items||[]) {
        const cost = Number(it.cost||0) * Number(it.qty||0);
        totalCost += cost;
        dailyMap[dateKey].cost += cost;
        const pid = it.product_id;
        if (!productSalesMap[pid]) productSalesMap[pid] = { name: it.name, qty:0, revenue:0, profit:0 };
        productSalesMap[pid].qty     += Number(it.qty);
        productSalesMap[pid].revenue += Number(it.total||it.qty*it.price||0);
        productSalesMap[pid].profit  += (Number(it.price||0)-Number(it.cost||0))*Number(it.qty||0);
        const prod = products.find((p)=>Number(p.id)===Number(pid));
        const cat  = (prod&&prod.category)||"غير مصنف";
        if (!catMap[cat]) catMap[cat] = { name:cat, revenue:0, qty:0 };
        catMap[cat].revenue += Number(it.total||0);
        catMap[cat].qty     += Number(it.qty||0);
      }
      if (s.customer_id) {
        const cid = s.customer_id;
        if (!custSalesMap[cid]) custSalesMap[cid] = { name: s.customer_name, total:0, count:0 };
        custSalesMap[cid].total += Number(s.grand_total||0);
        custSalesMap[cid].count++;
      }
    }

    const totalPurchases = purchases.reduce((s,p)=>s+Number(p.total||0),0);
    const purchasesPaid  = purchases.reduce((s,p)=>s+Number(p.paid||0),0);
    const purchasesRem   = purchases.reduce((s,p)=>s+Number(p.remaining||0),0);
    const paymentsIn     = payments.filter((p)=>p.direction==="in").reduce((s,p)=>s+Number(p.amount||0),0);
    const paymentsOut    = payments.filter((p)=>p.direction==="out").reduce((s,p)=>s+Number(p.amount||0),0);

    const custDebtors    = customers.filter((c)=>Number(c.debt||0)>0.001);
    const supDebtors     = suppliers.filter((s)=>Number(s.debt||0)>0.001);
    const totalCustDebt  = custDebtors.reduce((s,c)=>s+Number(c.debt||0),0);
    const totalSupDebt   = supDebtors.reduce((s,c)=>s+Number(c.debt||0),0);

    const invValue     = products.reduce((s,p)=>s+Number(p.quantity||0)*Number(p.purchase_price||0),0);
    const invSaleValue = products.reduce((s,p)=>s+Number(p.quantity||0)*Number(p.sale_price||0),0);
    const lowStock     = products.filter((p)=>Number(p.quantity||0)<=Number(p.min_stock||0));
    const outOfStock   = products.filter((p)=>Number(p.quantity||0)===0);

    const topProducts  = Object.values(productSalesMap).sort((a,b)=>b.revenue-a.revenue).slice(0,10);
    const topCustomers = Object.values(custSalesMap).sort((a,b)=>b.total-a.total).slice(0,10);
    const categorySales= Object.values(catMap).sort((a,b)=>b.revenue-a.revenue);
    const dailySales   = Object.values(dailyMap).sort((a,b)=>a.date.localeCompare(b.date));

    const { from: f, to: t } = getRange();
    return {
      from: f, to: t,
      profit: { totalRevenue, totalCost, totalDiscount, grossProfit: totalRevenue-totalCost,
                profitMargin: totalRevenue>0 ? (totalRevenue-totalCost)/totalRevenue*100 : 0,
                salesCount: sales.length },
      purchases: { totalPurchases, purchasesPaid, purchasesRem, count: purchases.length },
      debts: { custDebtors, totalCustDebt, supDebtors, totalSupDebt },
      inventory: { products, lowStock, outOfStock, invValue, invSaleValue, total: products.length },
      payments: { paymentsIn, paymentsOut },
      topProducts, topCustomers, categorySales, dailySales,
      rawSales: sales, rawPurchases: purchases,
      storeName: DB.getSetting("store_name", CFG.DEFAULT_STORE_NAME),
      storeAddress: DB.getSetting("store_address", CFG.DEFAULT_STORE_ADDRESS),
      storePhone: DB.getSetting("store_phone", ""),
    };
  }

  /* ── رسم عمودي SVG مبسط (بدون مكتبات) ── */
  function svgBarChart(data, valueKey, labelKey, color = "#2e86ab") {
    if (!data || data.length === 0) return `<div style="text-align:center;color:#999;padding:24px">لا توجد بيانات</div>`;
    const maxVal = Math.max(...data.map((d) => Number(d[valueKey]||0)), 1);
    const w = 100 / data.length;
    let bars = "";
    data.forEach((d, i) => {
      const v = Number(d[valueKey]||0);
      const bh = (v / maxVal) * 130;
      const x = i * w + w * 0.1;
      const bw = w * 0.8;
      const y = 150 - bh;
      bars += `<g>
        <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${color}" rx="1" opacity="0.85"/>
        ${data.length <= 20 ? `<text x="${x+bw/2}" y="166" text-anchor="middle" font-size="4" fill="#666">${String(d[labelKey]||"").slice(-5)}</text>` : ""}
      </g>`;
    });
    return `<svg viewBox="0 0 100 170" style="width:100%;height:180px" preserveAspectRatio="none">${bars}</svg>`;
  }

  /* ── بطاقة KPI ── */
  function kpiCard(label, value, color = "#1f3a5f", sub = "") {
    return `<div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:12px 14px;border-right:4px solid ${color}">
      <div style="color:#7f8c8d;font-size:11px;margin-bottom:4px">${label}</div>
      <div style="color:${color};font-size:18px;font-weight:bold">${value}</div>
      ${sub ? `<div style="color:#aaa;font-size:11px;margin-top:2px">${sub}</div>` : ""}
    </div>`;
  }

  function kpiGrid(items) {
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      ${items.map((it) => kpiCard(it.label, it.value, it.color||"#1f3a5f", it.sub||"")).join("")}
    </div>`;
  }

  /* ── جدول HTML مختصر ── */
  function miniTable(cols, rows, empty = "لا توجد بيانات") {
    if (!rows || rows.length === 0)
      return `<div style="text-align:center;color:#999;padding:14px">${empty}</div>`;
    const ths = cols.map((c) => `<th style="background:#1f3a5f;color:#fff;padding:7px 8px;white-space:nowrap">${c.label}</th>`).join("");
    const trs = rows.map((row, i) => {
      const bg = i%2 ? "background:#f7fafd" : "";
      const tds = cols.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e8edf2;${c.style||""}">${row[c.key]||""}</td>`).join("");
      return `<tr style="${bg}">${tds}</tr>`;
    }).join("");
    return `<div style="overflow:auto;max-height:300px"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  }

  /* ── محتوى التقرير حسب النوع ── */
  function reportContent(r) {
    if (activeReport === "profit") return `
      ${kpiGrid([
        { label: "إجمالي المبيعات",     value: formatCurrency(r.profit.totalRevenue), color: "#2e86ab" },
        { label: "تكلفة البضاعة المباعة", value: formatCurrency(r.profit.totalCost),   color: "#7f8c8d" },
        { label: "إجمالي الربح",         value: formatCurrency(r.profit.grossProfit),  color: "#27ae60" },
        { label: "هامش الربح",           value: r.profit.profitMargin.toFixed(1)+"%",  color: "#9b59b6" },
        { label: "الخصومات المقدمة",     value: formatCurrency(r.profit.totalDiscount),color: "#e74c3c" },
        { label: "عدد الفواتير",         value: r.profit.salesCount,                  color: "#1f3a5f" },
      ])}
      <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px;margin-bottom:14px">
        <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">📊 المبيعات اليومية</div>
        ${svgBarChart(r.dailySales, "revenue", "date")}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
          <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">🏆 أعلى المنتجات ربحا</div>
          ${miniTable(
            [{ key:"name",label:"المنتج"},{key:"revenue",label:"المبيعات"},{key:"profit",label:"الربح",style:"color:#27ae60;font-weight:bold"}],
            r.topProducts.map((p)=>({name:escapeHtml(p.name),revenue:formatCurrency(p.revenue),profit:formatCurrency(p.profit)}))
          )}
        </div>
        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
          <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">📂 التوزيع حسب الفئة</div>
          ${miniTable(
            [{ key:"cat",label:"الفئة"},{key:"revenue",label:"المبيعات"},{key:"qty",label:"الكمية"}],
            r.categorySales.map((c)=>({cat:escapeHtml(c.name),revenue:formatCurrency(c.revenue),qty:formatNumber(c.qty)}))
          )}
        </div>
      </div>`;

    if (activeReport === "sales") return `
      ${kpiGrid([
        { label: "إجمالي المبيعات",  value: formatCurrency(r.profit.totalRevenue),    color: "#2e86ab" },
        { label: "عدد الفواتير",     value: r.profit.salesCount,                      color: "#1f3a5f" },
        { label: "المحصّل",           value: formatCurrency(r.payments.paymentsIn),    color: "#27ae60" },
        { label: "ديون جديدة",       value: formatCurrency(r.rawSales.reduce((s,x)=>s+Number(x.remaining||0),0)), color: "#e74c3c" },
        { label: "متوسط الفاتورة",   value: r.profit.salesCount > 0 ? formatCurrency(r.profit.totalRevenue/r.profit.salesCount) : "—", color: "#9b59b6" },
        { label: "الخصومات",         value: formatCurrency(r.profit.totalDiscount),    color: "#e67e22" },
      ])}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
          <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">🏆 أفضل الزبناء</div>
          ${miniTable(
            [{key:"name",label:"الزبون"},{key:"count",label:"الفواتير"},{key:"total",label:"الإجمالي",style:"font-weight:bold;color:#2e86ab"}],
            r.topCustomers.map((c)=>({name:escapeHtml(c.name),count:c.count,total:formatCurrency(c.total)}))
          )}
        </div>
        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
          <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">📅 التوزيع اليومي</div>
          ${svgBarChart(r.dailySales,"revenue","date","#27ae60")}
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
        <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">🧾 قائمة الفواتير (${r.rawSales.length})</div>
        ${miniTable(
          [{key:"num",label:"رقم الفاتورة"},{key:"date",label:"التاريخ"},{key:"cust",label:"الزبون"},
           {key:"total",label:"الإجمالي"},{key:"paid",label:"المدفوع"},{key:"rem",label:"الحالة"}],
          [...r.rawSales].sort((a,b)=>a.date<b.date?1:-1).map((s)=>({
            num:escapeHtml(s.number), date:escapeHtml((s.date||"").slice(0,16)),
            cust:escapeHtml(s.customer_name||"نقدي"),
            total:formatCurrency(s.grand_total), paid:formatCurrency(s.paid),
            rem: Number(s.remaining)>0.001
              ? `<span style="color:#e74c3c;font-weight:bold;font-size:11px">دين: ${formatCurrency(s.remaining)}</span>`
              : `<span style="color:#27ae60;font-weight:bold;font-size:11px">✅ مكتمل</span>`,
          }))
        )}
      </div>`;

    if (activeReport === "purchases") return `
      ${kpiGrid([
        { label: "إجمالي المشتريات",        value: formatCurrency(r.purchases.totalPurchases), color: "#1f3a5f" },
        { label: "المبلغ المدفوع",           value: formatCurrency(r.purchases.purchasesPaid),  color: "#27ae60" },
        { label: "المتبقي للموردين",          value: formatCurrency(r.purchases.purchasesRem),   color: "#f39c12" },
        { label: "عدد فواتير الشراء",        value: r.purchases.count,                           color: "#2e86ab" },
        { label: "إجمالي مستحقات الموردين", value: formatCurrency(r.debts.totalSupDebt),        color: "#e74c3c" },
        { label: "متوسط فاتورة الشراء",     value: r.purchases.count>0 ? formatCurrency(r.purchases.totalPurchases/r.purchases.count) : "—", color: "#9b59b6" },
      ])}
      <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px;margin-bottom:12px">
        <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">📋 فواتير الشراء (${r.rawPurchases.length})</div>
        ${miniTable(
          [{key:"num",label:"رقم الفاتورة"},{key:"date",label:"التاريخ"},{key:"sup",label:"المورد"},
           {key:"total",label:"الإجمالي"},{key:"paid",label:"المدفوع"},{key:"rem",label:"المتبقي"}],
          [...r.rawPurchases].sort((a,b)=>a.date<b.date?1:-1).map((p)=>({
            num:escapeHtml(p.number), date:escapeHtml((p.date||"").slice(0,16)),
            sup:escapeHtml(p.supplier_name||""), total:formatCurrency(p.total),
            paid:formatCurrency(p.paid),
            rem:Number(p.remaining)>0.001
              ? `<span style="color:#e74c3c;font-weight:bold">${formatCurrency(p.remaining)}</span>`
              : `<span style="color:#27ae60">✅</span>`,
          }))
        )}
      </div>
      <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
        <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">🏭 مستحقات الموردين الحالية</div>
        ${miniTable(
          [{key:"name",label:"المورد"},{key:"phone",label:"الهاتف"},{key:"debt",label:"المستحق",style:"color:#f39c12;font-weight:bold"}],
          [...r.debts.supDebtors].sort((a,b)=>b.debt-a.debt).map((s)=>({name:escapeHtml(s.name),phone:escapeHtml(s.phone||"—"),debt:formatCurrency(s.debt)}))
        )}
      </div>`;

    if (activeReport === "debts") return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        ${kpiCard("إجمالي ديون الزبناء", formatCurrency(r.debts.totalCustDebt), "#e74c3c", `${r.debts.custDebtors.length} زبون`)}
        ${kpiCard("إجمالي مستحقات الموردين", formatCurrency(r.debts.totalSupDebt), "#f39c12", `${r.debts.supDebtors.length} مورد`)}
      </div>
      <div style="margin-bottom:14px">
        ${kpiCard("صافي الديون (لصالحك)", formatCurrency(r.debts.totalCustDebt - r.debts.totalSupDebt),
          r.debts.totalCustDebt >= r.debts.totalSupDebt ? "#27ae60" : "#e74c3c")}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
          <div style="font-weight:bold;color:#e74c3c;margin-bottom:8px">👤 ديون الزبناء</div>
          ${miniTable(
            [{key:"name",label:"الزبون"},{key:"phone",label:"الهاتف"},{key:"debt",label:"الدين",style:"color:#e74c3c;font-weight:bold"}],
            [...r.debts.custDebtors].sort((a,b)=>b.debt-a.debt).map((c)=>({name:escapeHtml(c.name),phone:escapeHtml(c.phone||"—"),debt:formatCurrency(c.debt)})),
            "✅ لا توجد ديون"
          )}
        </div>
        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
          <div style="font-weight:bold;color:#f39c12;margin-bottom:8px">🏭 مستحقات الموردين</div>
          ${miniTable(
            [{key:"name",label:"المورد"},{key:"phone",label:"الهاتف"},{key:"debt",label:"المستحق",style:"color:#f39c12;font-weight:bold"}],
            [...r.debts.supDebtors].sort((a,b)=>b.debt-a.debt).map((s)=>({name:escapeHtml(s.name),phone:escapeHtml(s.phone||"—"),debt:formatCurrency(s.debt)})),
            "✅ لا توجد مستحقات"
          )}
        </div>
      </div>`;

    if (activeReport === "inventory") return `
      ${kpiGrid([
        { label: "إجمالي المنتجات",          value: r.inventory.total,                            color: "#1f3a5f" },
        { label: "قيمة المخزون (شراء)",      value: formatCurrency(r.inventory.invValue),         color: "#2e86ab" },
        { label: "قيمة المخزون (بيع)",       value: formatCurrency(r.inventory.invSaleValue),     color: "#27ae60" },
        { label: "الربح المحتمل",            value: formatCurrency(r.inventory.invSaleValue - r.inventory.invValue), color: "#9b59b6" },
        { label: "منتجات منخفضة المخزون",   value: r.inventory.lowStock.length,                  color: "#e74c3c" },
        { label: "منتجات نفدت",             value: r.inventory.outOfStock.length,                color: "#c0392b" },
      ])}
      ${r.inventory.lowStock.length > 0 ? `
      <div style="background:#fff;border:2px solid #e74c3c;border-radius:8px;padding:14px;margin-bottom:12px">
        <div style="font-weight:bold;color:#e74c3c;margin-bottom:8px">⚠️ منتجات تحتاج إعادة تموين (${r.inventory.lowStock.length})</div>
        ${miniTable(
          [{key:"name",label:"المنتج"},{key:"cat",label:"الفئة"},{key:"qty",label:"الكمية الحالية",style:"color:#e74c3c;font-weight:bold"},
           {key:"min",label:"الحد الأدنى"},{key:"need",label:"الناقص",style:"color:#e74c3c"}],
          r.inventory.lowStock.map((p)=>({name:escapeHtml(p.name),cat:escapeHtml(p.category||"—"),
            qty:formatNumber(p.quantity),min:formatNumber(p.min_stock),need:formatNumber(Math.max(0,p.min_stock-p.quantity))}))
        )}
      </div>` : ""}
      <div style="background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px">
        <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">📋 جرد كامل للمخزون</div>
        ${miniTable(
          [{key:"i",label:"#"},{key:"name",label:"المنتج"},{key:"cat",label:"الفئة"},{key:"unit",label:"الوحدة"},
           {key:"qty",label:"الكمية"},{key:"bp",label:"سعر الشراء"},{key:"sp",label:"سعر البيع"},{key:"val",label:"القيمة",style:"font-weight:bold"}],
          [...r.inventory.products].sort((a,b)=>(a.category||"").localeCompare(b.category||"","ar")).map((p,i)=>{
            const isLow = Number(p.quantity||0) <= Number(p.min_stock||0);
            return { i:i+1, name:escapeHtml(p.name), cat:escapeHtml(p.category||"—"), unit:escapeHtml(p.unit||"—"),
              qty:`<span style="color:${isLow?"#e74c3c":"#27ae60"};font-weight:bold">${formatNumber(p.quantity)}</span>`,
              bp:formatCurrency(p.purchase_price), sp:formatCurrency(p.sale_price),
              val:formatCurrency(Number(p.quantity)*Number(p.purchase_price)) };
          })
        )}
      </div>`;

    return "";
  }

  /* ── تصدير PDF (طباعة نافذة جديدة) ── */
  function exportPDF(r) {
    const REPORT_LABELS = {
      profit: "تقرير الأرباح", sales: "تقرير المبيعات",
      purchases: "تقرير المشتريات", debts: "تقرير الديون", inventory: "تقرير المخزون",
    };
    const PERIOD_LABELS = { today:"اليوم", week:"هذا الأسبوع", month:"هذا الشهر", quarter:"هذا الفصل", year:"هذه السنة", custom:"مخصص" };
    const reportTitle = REPORT_LABELS[activeReport] || "تقرير";
    const now = new Date().toLocaleString("ar-SA");
    const periodLabel = PERIOD_LABELS[period] || "مخصص";

    const makeTable = (cols, rows, empty = "لا توجد بيانات") => {
      if (!rows || rows.length === 0) return `<p style="color:#999;text-align:center">${empty}</p>`;
      const ths = cols.map((c) => `<th>${c.label}</th>`).join("");
      const trs = rows.map((row, i) => {
        const bg = i%2 ? "background:#f7fafd" : "";
        return `<tr style="${bg}">${cols.map((c) => `<td style="${c.style||""}">${row[c.key]||""}</td>`).join("")}</tr>`;
      }).join("");
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    };

    const makeKPI = (items) => `<div class="kpi-grid">${items.map((it) =>
      `<div class="kpi"><div class="kpi-label">${it.label}</div>
       <div class="kpi-value" style="color:${it.color||"#1f3a5f"}">${it.value}</div></div>`).join("")}</div>`;

    let pdfBody = "";

    if (activeReport === "profit") {
      pdfBody = makeKPI([
        {label:"إجمالي المبيعات",value:formatCurrency(r.profit.totalRevenue),color:"#2e86ab"},
        {label:"تكلفة البضاعة",value:formatCurrency(r.profit.totalCost),color:"#7f8c8d"},
        {label:"إجمالي الربح",value:formatCurrency(r.profit.grossProfit),color:"#27ae60"},
        {label:"هامش الربح",value:r.profit.profitMargin.toFixed(1)+"%",color:"#9b59b6"},
        {label:"الخصومات",value:formatCurrency(r.profit.totalDiscount),color:"#e74c3c"},
        {label:"عدد الفواتير",value:r.profit.salesCount,color:"#1f3a5f"},
      ]);
      pdfBody += `<h2>أعلى المنتجات ربحا</h2>` + makeTable(
        [{key:"i",label:"#"},{key:"name",label:"المنتج"},{key:"qty",label:"الكمية"},{key:"revenue",label:"المبيعات"},{key:"profit",label:"الربح"}],
        r.topProducts.map((p,i)=>({i:i+1,name:p.name,qty:formatNumber(p.qty),revenue:formatCurrency(p.revenue),profit:formatCurrency(p.profit)}))
      );
      pdfBody += `<h2>التفصيل اليومي</h2>` + makeTable(
        [{key:"date",label:"التاريخ"},{key:"count",label:"الفواتير"},{key:"revenue",label:"المبيعات"},{key:"cost",label:"التكلفة"},{key:"profit",label:"الربح"}],
        r.dailySales.map((d)=>({date:d.date,count:d.count,revenue:formatCurrency(d.revenue),cost:formatCurrency(d.cost),profit:formatCurrency(d.revenue-d.cost)}))
      );
    } else if (activeReport === "sales") {
      const totalDebt = r.rawSales.reduce((s,x)=>s+Number(x.remaining||0),0);
      pdfBody = makeKPI([
        {label:"إجمالي المبيعات",value:formatCurrency(r.profit.totalRevenue),color:"#2e86ab"},
        {label:"عدد الفواتير",value:r.profit.salesCount,color:"#1f3a5f"},
        {label:"المحصّل",value:formatCurrency(r.payments.paymentsIn),color:"#27ae60"},
        {label:"ديون جديدة",value:formatCurrency(totalDebt),color:"#e74c3c"},
        {label:"متوسط الفاتورة",value:r.profit.salesCount>0?formatCurrency(r.profit.totalRevenue/r.profit.salesCount):"—",color:"#9b59b6"},
        {label:"الخصومات",value:formatCurrency(r.profit.totalDiscount),color:"#e67e22"},
      ]);
      pdfBody += `<h2>قائمة الفواتير (${r.rawSales.length})</h2>` + makeTable(
        [{key:"num",label:"رقم الفاتورة"},{key:"date",label:"التاريخ"},{key:"cust",label:"الزبون"},
         {key:"total",label:"الإجمالي"},{key:"paid",label:"المدفوع"},{key:"rem",label:"المتبقي"}],
        [...r.rawSales].sort((a,b)=>a.date<b.date?1:-1).map((s)=>({
          num:s.number,date:(s.date||"").slice(0,16),cust:s.customer_name||"نقدي",
          total:formatCurrency(s.grand_total),paid:formatCurrency(s.paid),
          rem:Number(s.remaining)>0.001?formatCurrency(s.remaining):"—",
        }))
      );
      pdfBody += `<h2>أفضل الزبناء</h2>` + makeTable(
        [{key:"i",label:"#"},{key:"name",label:"الزبون"},{key:"count",label:"الفواتير"},{key:"total",label:"الإجمالي"}],
        r.topCustomers.map((c,i)=>({i:i+1,name:c.name,count:c.count,total:formatCurrency(c.total)}))
      );
    } else if (activeReport === "purchases") {
      pdfBody = makeKPI([
        {label:"إجمالي المشتريات",value:formatCurrency(r.purchases.totalPurchases),color:"#1f3a5f"},
        {label:"المدفوع",value:formatCurrency(r.purchases.purchasesPaid),color:"#27ae60"},
        {label:"المتبقي",value:formatCurrency(r.purchases.purchasesRem),color:"#f39c12"},
        {label:"عدد الفواتير",value:r.purchases.count,color:"#2e86ab"},
        {label:"مستحقات الموردين",value:formatCurrency(r.debts.totalSupDebt),color:"#e74c3c"},
        {label:"متوسط الفاتورة",value:r.purchases.count>0?formatCurrency(r.purchases.totalPurchases/r.purchases.count):"—",color:"#9b59b6"},
      ]);
      pdfBody += `<h2>قائمة فواتير الشراء</h2>` + makeTable(
        [{key:"num",label:"رقم الفاتورة"},{key:"date",label:"التاريخ"},{key:"sup",label:"المورد"},
         {key:"total",label:"الإجمالي"},{key:"paid",label:"المدفوع"},{key:"rem",label:"المتبقي"}],
        [...r.rawPurchases].sort((a,b)=>a.date<b.date?1:-1).map((p)=>({
          num:p.number,date:(p.date||"").slice(0,16),sup:p.supplier_name||"",
          total:formatCurrency(p.total),paid:formatCurrency(p.paid),rem:formatCurrency(p.remaining),
        }))
      );
      pdfBody += `<h2>مستحقات الموردين</h2>` + makeTable(
        [{key:"i",label:"#"},{key:"name",label:"المورد"},{key:"phone",label:"الهاتف"},{key:"debt",label:"المستحق"}],
        [...r.debts.supDebtors].sort((a,b)=>b.debt-a.debt).map((s,i)=>({i:i+1,name:s.name,phone:s.phone||"—",debt:formatCurrency(s.debt)}))
      );
    } else if (activeReport === "debts") {
      pdfBody = `<div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">إجمالي ديون الزبناء</div><div class="kpi-value" style="color:#e74c3c">${formatCurrency(r.debts.totalCustDebt)}</div><div class="kpi-label">${r.debts.custDebtors.length} زبون</div></div>
        <div class="kpi"><div class="kpi-label">إجمالي مستحقات الموردين</div><div class="kpi-value" style="color:#f39c12">${formatCurrency(r.debts.totalSupDebt)}</div><div class="kpi-label">${r.debts.supDebtors.length} مورد</div></div>
        <div class="kpi"><div class="kpi-label">صافي الديون</div><div class="kpi-value" style="color:${r.debts.totalCustDebt>=r.debts.totalSupDebt?"#27ae60":"#e74c3c"}">${formatCurrency(r.debts.totalCustDebt-r.debts.totalSupDebt)}</div></div>
      </div>`;
      pdfBody += `<h2>ديون الزبناء (${r.debts.custDebtors.length})</h2>` + makeTable(
        [{key:"i",label:"#"},{key:"name",label:"الزبون"},{key:"phone",label:"الهاتف"},{key:"debt",label:"الدين"}],
        [...r.debts.custDebtors].sort((a,b)=>b.debt-a.debt).map((c,i)=>({i:i+1,name:c.name,phone:c.phone||"—",debt:formatCurrency(c.debt)})),
        "✅ لا توجد ديون"
      );
      pdfBody += `<h2>مستحقات الموردين (${r.debts.supDebtors.length})</h2>` + makeTable(
        [{key:"i",label:"#"},{key:"name",label:"المورد"},{key:"phone",label:"الهاتف"},{key:"debt",label:"المستحق"}],
        [...r.debts.supDebtors].sort((a,b)=>b.debt-a.debt).map((s,i)=>({i:i+1,name:s.name,phone:s.phone||"—",debt:formatCurrency(s.debt)})),
        "✅ لا توجد مستحقات"
      );
    } else if (activeReport === "inventory") {
      pdfBody = makeKPI([
        {label:"إجمالي المنتجات",value:r.inventory.total,color:"#1f3a5f"},
        {label:"قيمة المخزون (شراء)",value:formatCurrency(r.inventory.invValue),color:"#2e86ab"},
        {label:"قيمة المخزون (بيع)",value:formatCurrency(r.inventory.invSaleValue),color:"#27ae60"},
        {label:"الربح المحتمل",value:formatCurrency(r.inventory.invSaleValue-r.inventory.invValue),color:"#9b59b6"},
        {label:"منتجات منخفضة",value:r.inventory.lowStock.length,color:"#e74c3c"},
        {label:"منتجات نفدت",value:r.inventory.outOfStock.length,color:"#c0392b"},
      ]);
      if (r.inventory.lowStock.length > 0) {
        pdfBody += `<h2>⚠ منتجات تحتاج تموين (${r.inventory.lowStock.length})</h2>` + makeTable(
          [{key:"name",label:"المنتج"},{key:"cat",label:"الفئة"},{key:"qty",label:"الكمية"},{key:"min",label:"الحد الأدنى"},{key:"need",label:"الناقص"}],
          r.inventory.lowStock.map((p)=>({name:p.name,cat:p.category||"—",qty:formatNumber(p.quantity),min:formatNumber(p.min_stock),need:formatNumber(Math.max(0,p.min_stock-p.quantity))}))
        );
      }
      pdfBody += `<h2>جرد كامل للمخزون</h2>` + makeTable(
        [{key:"i",label:"#"},{key:"name",label:"المنتج"},{key:"cat",label:"الفئة"},{key:"unit",label:"الوحدة"},
         {key:"qty",label:"الكمية"},{key:"bp",label:"سعر الشراء"},{key:"sp",label:"سعر البيع"},{key:"val",label:"القيمة"}],
        [...r.inventory.products].sort((a,b)=>(a.category||"").localeCompare(b.category||"","ar")).map((p,i)=>({
          i:i+1,name:p.name,cat:p.category||"—",unit:p.unit||"—",
          qty:formatNumber(p.quantity),bp:formatCurrency(p.purchase_price),
          sp:formatCurrency(p.sale_price),val:formatCurrency(Number(p.quantity)*Number(p.purchase_price)),
        }))
      );
    }

    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${reportTitle} — ${r.storeName}</title>
<style>
  *{box-sizing:border-box} body{font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:28px;color:#2c3e50;font-size:13px;max-width:960px;margin:0 auto}
  .header{text-align:center;border-bottom:2px solid #1f3a5f;padding-bottom:14px;margin-bottom:18px}
  .header h1{color:#1f3a5f;font-size:20px;margin:0 0 4px} .header h2{color:#2e86ab;font-size:15px;margin:6px 0 3px}
  .header .meta{color:#666;font-size:12px}
  h2{color:#1f3a5f;font-size:14px;border-right:4px solid #2e86ab;padding-right:10px;margin:18px 0 10px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;page-break-inside:avoid}
  th{background:#1f3a5f;color:#fff;padding:7px 9px;text-align:center;font-size:12px}
  td{padding:6px 9px;text-align:center;border-bottom:1px solid #e8edf2;font-size:12px}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
  .kpi{background:#f4f8fc;border-radius:7px;padding:11px;border-right:4px solid #2e86ab}
  .kpi-label{color:#666;font-size:11px;margin-bottom:3px} .kpi-value{font-size:16px;font-weight:bold}
  .footer{text-align:center;margin-top:28px;padding-top:12px;border-top:1px solid #e0e6ed;color:#aaa;font-size:11px}
  @media print{button{display:none!important} .no-print{display:none!important}}
</style></head><body onload="window.print()">
  <div class="header">
    <h1>${escapeHtml(r.storeName)}</h1>
    ${r.storeAddress ? `<div class="meta">${escapeHtml(r.storeAddress)}</div>` : ""}
    <h2>${reportTitle}</h2>
    <div class="meta">الفترة: ${r.from} — ${r.to} (${periodLabel})</div>
    <div class="meta">تاريخ الطباعة: ${now}</div>
  </div>
  ${pdfBody}
  <div class="footer">${escapeHtml(r.storeName)} — تم إنشاء هذا التقرير بتاريخ ${now}</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { Toast.error("يرجى السماح بالنوافذ المنبثقة لتصدير التقرير"); return; }
    win.document.write(html);
    win.document.close();
  }

  /* ── الرسم الكامل لقسم التقارير ── */
  const draw = () => {
    const { from, to } = getRange();
    const PERIOD_LABELS = { today:"اليوم", week:"هذا الأسبوع", month:"هذا الشهر", quarter:"هذا الفصل", year:"هذه السنة", custom:"مخصص" };
    const REPORT_TYPES = [
      { key:"profit",   label:"📈 الأرباح" },
      { key:"sales",    label:"🧾 المبيعات" },
      { key:"purchases",label:"📦 المشتريات" },
      { key:"debts",    label:"💳 الديون" },
      { key:"inventory",label:"🏪 حالة المخزون" },
    ];

    const periodBtns = Object.entries(PERIOD_LABELS).map(([k, l]) =>
      `<button class="btn btn-sm ${period===k?"btn-primary":"btn-secondary"} period-btn" data-period="${k}">${l}</button>`).join("");

    const reportTabs = REPORT_TYPES.map((t) =>
      `<button class="btn ${activeReport===t.key?"btn-primary":"btn-secondary"} report-tab-btn" data-rtype="${t.key}"
         style="padding:9px 16px;font-size:13px">${t.label}</button>`).join("");

    const r = calcReport();

    content.innerHTML = `
      <div class="section">
        <h2 class="section-title">📊 التقارير الاحترافية</h2>

        <!-- اختيار الفترة -->
        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:10px;padding:14px 18px;margin-bottom:14px">
          <div style="font-weight:bold;color:#1f3a5f;margin-bottom:8px">📅 الفترة الزمنية</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${period==="custom"?"10px":"0"}">${periodBtns}</div>
          ${period === "custom" ? `
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px">
            <label style="font-weight:bold;font-size:13px">من:</label>
            <input type="date" id="customFrom" value="${customFrom}" style="padding:5px 8px;border:1px solid #d9dee3;border-radius:5px">
            <label style="font-weight:bold;font-size:13px">إلى:</label>
            <input type="date" id="customTo" value="${customTo}" style="padding:5px 8px;border:1px solid #d9dee3;border-radius:5px">
            <button class="btn btn-primary btn-sm" id="applyCustom">تطبيق</button>
          </div>` : ""}
          <div style="margin-top:8px;font-size:12px;color:#666">
            📆 من <b>${from}</b> إلى <b>${to}</b>
          </div>
        </div>

        <!-- تبويبات التقارير + زر PDF -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;justify-content:space-between">
          <div style="display:flex;flex-wrap:wrap;gap:8px">${reportTabs}</div>
          <button class="btn btn-danger" id="btnExportPDF">📄 تصدير PDF</button>
        </div>

        <!-- محتوى التقرير -->
        <div id="reportContent">${reportContent(r)}</div>
      </div>`;

    /* ── الأحداث ── */
    content.querySelectorAll(".period-btn").forEach((btn) => {
      btn.addEventListener("click", () => { period = btn.dataset.period; draw(); });
    });
    content.querySelectorAll(".report-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => { activeReport = btn.dataset.rtype; draw(); });
    });
    if (period === "custom") {
      document.getElementById("applyCustom").addEventListener("click", () => {
        customFrom = document.getElementById("customFrom").value;
        customTo   = document.getElementById("customTo").value;
        draw();
      });
    }
    document.getElementById("btnExportPDF").addEventListener("click", () => exportPDF(calcReport()));
  };

  draw();
};

/* =========================================================================
   قسم المستخدمون
   ========================================================================= */

Sections.renderUsers = function (content) {
  /* الأدوار المتاحة للتعيين */
  const ROLES = Object.entries(CFG.ROLE_LABELS).map(([k, v]) => ({ key: k, label: v, desc: CFG.ROLE_DESC[k] || "" }));
  const ROLE_BY_LABEL = Object.fromEntries(Object.entries(CFG.ROLE_LABELS).map(([k, v]) => [v, k]));
  const STATUS_LABELS = { true: "نشط", false: "معطل" };
  const STATUS_BY_LABEL = { "نشط": true, "معطل": false };
  let selectedId = null;

  /* ── ألوان الأدوار ── */
  const ROLE_COLORS = {
    admin:   { bg: "#fff0f0", border: "#e74c3c", text: "#c0392b", badge: "#e74c3c" },
    manager: { bg: "#fff8e1", border: "#f39c12", text: "#e67e22", badge: "#f39c12" },
    seller:  { bg: "#e8f5e9", border: "#27ae60", text: "#1e8449", badge: "#27ae60" },
    buyer:   { bg: "#e3f2fd", border: "#2e86ab", text: "#1a6080", badge: "#2e86ab" },
    cashier: { bg: "#f3e5f5", border: "#9b59b6", text: "#7d3c98", badge: "#9b59b6" },
  };

  /* ── أيقونات الأدوار ── */
  const ROLE_ICONS = {
    admin: "👑", manager: "🧑‍💼", seller: "🛒", buyer: "📦", cashier: "💰",
  };

  /* ── بطاقة صلاحيات ── */
  function permBadge(ok, label) {
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:${ok?"#e8f5e9":"#fff0f0"};
      color:${ok?"#27ae60":"#e74c3c"};padding:2px 8px;border-radius:10px;font-size:11px;margin:2px">
      ${ok?"✅":"❌"} ${label}</span>`;
  }

  function renderPermSummary(role) {
    const p = CFG.ROLE_PERMISSIONS[role] || {};
    return `
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">
        ${permBadge(true,           "رؤية البيانات")}
        ${permBadge(p.canDeleteSale,"حذف فواتير البيع")}
        ${permBadge(p.canDeletePurchase,"حذف فواتير الشراء")}
        ${permBadge(p.canEditInventory,"تعديل المخزون")}
        ${permBadge(p.canAdjustStock, "تسوية المخزون")}
        ${permBadge(p.canDeleteInventory,"حذف المنتجات")}
        ${permBadge(p.canDeleteCustomer,"حذف الزبناء")}
        ${permBadge(p.canDeleteSupplier,"حذف الموردين")}
        ${permBadge(p.canDeletePayment,"حذف الدفعات")}
        ${permBadge(p.canViewReports,  "التقارير")}
        ${permBadge(p.canManageUsers,  "إدارة المستخدمين")}
        ${permBadge(p.canManageSettings,"الإعدادات")}
        ${permBadge(p.canExportData,   "تصدير البيانات")}
      </div>`;
  }

  /* ── بطاقة دور ── */
  function roleCard(role) {
    const c = ROLE_COLORS[role] || ROLE_COLORS.seller;
    const sections = (CFG.ROLE_SECTIONS[role] || []).map(s => CFG.SECTION_LABELS[s] || s).join(" · ");
    return `
      <div style="border:1.5px solid ${c.border};border-radius:10px;padding:14px 16px;background:${c.bg};margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:22px">${ROLE_ICONS[role]||"👤"}</span>
          <div>
            <span style="font-weight:bold;color:${c.text};font-size:15px">${CFG.ROLE_LABELS[role]}</span>
            <span style="font-size:11px;background:${c.badge};color:#fff;padding:1px 8px;border-radius:8px;margin-right:6px">${role}</span>
          </div>
        </div>
        <div style="font-size:12px;color:#555;margin-bottom:6px">${CFG.ROLE_DESC[role]||""}</div>
        <div style="font-size:11px;color:#777"><b>الأقسام:</b> ${sections}</div>
        ${renderPermSummary(role)}
      </div>`;
  }

  /* ── عرض قائمة المستخدمين ── */
  const draw = () => {
    const users = [...DB.load().users].sort((a, b) => a.id - b.id);

    const userCards = users.map((u) => {
      const role = u.role || "seller";
      const c = ROLE_COLORS[role] || ROLE_COLORS.seller;
      const isCurrentUser = Number(u.id) === Number(App.currentUser.id);
      const isSelected = Number(u.id) === selectedId;
      return `
        <div class="user-card ${isSelected ? "selected" : ""}" data-id="${u.id}"
          style="display:flex;align-items:center;gap:12px;padding:12px 16px;
            border:2px solid ${isSelected ? c.border : "#e0e6ed"};
            border-radius:10px;background:${isSelected ? c.bg : "#fff"};
            cursor:pointer;transition:all .15s;margin-bottom:8px">
          <div style="width:44px;height:44px;border-radius:50%;background:${c.badge};
            display:flex;align-items:center;justify-content:center;
            font-size:20px;flex-shrink:0">${ROLE_ICONS[role]||"👤"}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:bold;font-size:14px;color:#2c3e50">
              ${escapeHtml(u.full_name || u.username)}
              ${isCurrentUser ? `<span style="font-size:11px;background:#e3f2fd;color:#2e86ab;padding:1px 6px;border-radius:8px;margin-right:6px">أنت</span>` : ""}
            </div>
            <div style="font-size:12px;color:#7f8c8d">@${escapeHtml(u.username)}</div>
          </div>
          <div style="text-align:left;flex-shrink:0">
            <span style="display:inline-block;background:${c.badge};color:#fff;
              padding:3px 10px;border-radius:10px;font-size:12px;font-weight:bold">
              ${ROLE_ICONS[role]} ${escapeHtml(CFG.ROLE_LABELS[role]||role)}
            </span>
            <div style="margin-top:4px;font-size:11px;color:${u.active!==false?"#27ae60":"#e74c3c"};text-align:center">
              ${u.active!==false ? "● نشط" : "● معطل"}
            </div>
          </div>
        </div>`;
    }).join("");

    content.innerHTML = `
      <div class="section">
        <h2 class="section-title">إدارة المستخدمين</h2>

        <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:18px">

          <!-- العمود الأيمن: قائمة المستخدمين -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div style="font-size:13px;color:#7f8c8d">${users.length} مستخدم</div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-success" id="btnAddUser">➕ إضافة مستخدم</button>
                <button class="btn btn-primary" id="btnEditUser">✏️ تعديل</button>
                <button class="btn btn-secondary" id="btnResetPwd">🔑 تغيير كلمة المرور</button>
                <button class="btn btn-danger" id="btnDeleteUser">🗑</button>
              </div>
            </div>

            <div id="usersList">${userCards}</div>
          </div>

          <!-- العمود الأيسر: لوحة الأدوار والصلاحيات -->
          <div>
            <div style="background:#fff;border:1px solid #e0e6ed;border-radius:10px;padding:16px;position:sticky;top:10px;max-height:85vh;overflow-y:auto">
              <div style="font-weight:bold;color:#1f3a5f;font-size:15px;margin-bottom:12px;text-align:right">
                🛡 دليل الأدوار والصلاحيات
              </div>
              ${Object.keys(CFG.ROLE_LABELS).map(role => roleCard(role)).join("")}
            </div>
          </div>
        </div>
      </div>`;

    /* أحداث النقر على البطاقات */
    document.querySelectorAll(".user-card").forEach((card) => {
      card.addEventListener("click", () => {
        selectedId = Number(card.dataset.id);
        draw();
      });
    });

    /* أحداث الأزرار */
    document.getElementById("btnAddUser").addEventListener("click", () => showAddUserModal());
    document.getElementById("btnEditUser").addEventListener("click", () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار مستخدم أولاً"); return; }
      const user = DB.findById(DB.load().users, selectedId);
      if (user) showEditUserModal(user, draw);
    });
    document.getElementById("btnResetPwd").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار مستخدم أولاً"); return; }
      const user = DB.findById(DB.load().users, selectedId);
      if (!user) return;
      const fields = [
        { key: "_u", label: "اسم المستخدم", type: "readonly", default: user.username },
        { key: "password", label: "كلمة المرور الجديدة", type: "password", required: true },
      ];
      const result = await openForm("🔑 إعادة تعيين كلمة المرور", fields);
      if (!result) return;
      const res = await Auth.updateUser(user.id, { newPassword: result.password });
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success("✅ تم تغيير كلمة المرور بنجاح");
    });
    document.getElementById("btnDeleteUser").addEventListener("click", async () => {
      if (selectedId === null) { Toast.warning("يرجى اختيار مستخدم أولاً"); return; }
      if (Number(selectedId) === Number(App.currentUser.id)) { Toast.error("لا يمكنك حذف حسابك الحالي"); return; }
      const user = DB.findById(DB.load().users, selectedId);
      if (!user) return;
      if (!(await showConfirm(`هل تريد حذف المستخدم "${user.username}"؟`))) return;
      const res = Auth.deleteUser(selectedId);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(res.message); selectedId = null; draw();
    });
  };

  /* ── نافذة إضافة مستخدم جديد ── */
  async function showAddUserModal() {
    const ROLES = Object.entries(CFG.ROLE_LABELS);
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const roleOptions = ROLES.map(([k, v]) => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;
        border:2px solid ${ROLE_COLORS[k]?.border||"#e0e6ed"};background:${ROLE_COLORS[k]?.bg||"#fff"};
        cursor:pointer;margin-bottom:8px;transition:box-shadow .15s" class="role-option">
        <input type="radio" name="userRole" value="${k}" style="margin-top:3px;accent-color:${ROLE_COLORS[k]?.badge||"#2e86ab"}">
        <div>
          <div style="font-weight:bold;color:${ROLE_COLORS[k]?.text||"#333"}">${ROLE_ICONS[k]} ${v}</div>
          <div style="font-size:11px;color:#666;margin-top:2px">${CFG.ROLE_DESC[k]||""}</div>
        </div>
      </label>`).join("");

    overlay.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">➕ إضافة مستخدم جديد</div>
        <div class="modal-body">
          <div class="form-row">
            <label>اسم المستخدم</label>
            <div class="field"><input type="text" id="newUsername" autocomplete="off" placeholder="مثال: ahmed_sales"></div>
          </div>
          <div class="form-row">
            <label>الاسم الكامل</label>
            <div class="field"><input type="text" id="newFullname" placeholder="مثال: أحمد ولد محمد"></div>
          </div>
          <div class="form-row">
            <label>كلمة المرور</label>
            <div class="field"><input type="password" id="newPassword" autocomplete="new-password"></div>
          </div>
          <div style="margin-bottom:8px;font-weight:bold;color:#1f3a5f">🛡 اختر دور المستخدم:</div>
          <div style="max-height:320px;overflow-y:auto">${roleOptions}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelAdd">إلغاء</button>
          <button class="btn btn-success" id="confirmAdd">✅ حفظ المستخدم</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // اختيار دور seller افتراضياً
    const defaultRadio = overlay.querySelector('input[value="seller"]');
    if (defaultRadio) defaultRadio.checked = true;

    overlay.querySelector("#cancelAdd").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#confirmAdd").addEventListener("click", async () => {
      const username = overlay.querySelector("#newUsername").value.trim();
      const fullname = overlay.querySelector("#newFullname").value.trim();
      const password = overlay.querySelector("#newPassword").value;
      const roleRadio = overlay.querySelector('input[name="userRole"]:checked');

      if (!username) { Toast.error("اسم المستخدم مطلوب"); return; }
      if (!password) { Toast.error("كلمة المرور مطلوبة"); return; }
      if (!roleRadio) { Toast.error("يرجى اختيار دور للمستخدم"); return; }

      const res = await Auth.createUser(username, password, fullname, roleRadio.value);
      if (!res.success) { Toast.error(res.message); return; }
      Toast.success(`✅ تم إنشاء حساب "${username}" بنجاح`);
      overlay.remove();
      draw();
    });
  }

  /* ── نافذة تعديل مستخدم ── */
  async function showEditUserModal(user, onDone) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const ROLES = Object.entries(CFG.ROLE_LABELS);
    const roleOptions = ROLES.map(([k, v]) => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;
        border:2px solid ${ROLE_COLORS[k]?.border||"#e0e6ed"};background:${ROLE_COLORS[k]?.bg||"#fff"};
        cursor:pointer;margin-bottom:8px" class="role-option">
        <input type="radio" name="editRole" value="${k}" ${user.role===k?"checked":""} style="margin-top:3px;accent-color:${ROLE_COLORS[k]?.badge||"#2e86ab"}">
        <div>
          <div style="font-weight:bold;color:${ROLE_COLORS[k]?.text||"#333"}">${ROLE_ICONS[k]} ${v}</div>
          <div style="font-size:11px;color:#666;margin-top:2px">${CFG.ROLE_DESC[k]||""}</div>
        </div>
      </label>`).join("");

    overlay.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">✏️ تعديل المستخدم: ${escapeHtml(user.username)}</div>
        <div class="modal-body">
          <div class="form-row">
            <label>اسم المستخدم</label>
            <div class="field"><input type="text" value="${escapeHtml(user.username)}" readonly style="background:#f4f6f8;color:#999"></div>
          </div>
          <div class="form-row">
            <label>الاسم الكامل</label>
            <div class="field"><input type="text" id="editFullname" value="${escapeHtml(user.full_name||"")}"></div>
          </div>
          <div class="form-row">
            <label>الحالة</label>
            <div class="field">
              <select id="editStatus">
                <option value="active" ${user.active!==false?"selected":""}>● نشط</option>
                <option value="inactive" ${user.active===false?"selected":""}>○ معطل</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom:8px;font-weight:bold;color:#1f3a5f">🛡 دور المستخدم:</div>
          <div style="max-height:320px;overflow-y:auto">${roleOptions}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelEdit">إلغاء</button>
          <button class="btn btn-success" id="confirmEdit">💾 حفظ التغييرات</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#cancelEdit").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#confirmEdit").addEventListener("click", async () => {
      const fullName = overlay.querySelector("#editFullname").value.trim();
      const roleRadio = overlay.querySelector('input[name="editRole"]:checked');
      const active = overlay.querySelector("#editStatus").value === "active";

      if (!roleRadio) { Toast.error("يرجى اختيار دور"); return; }
      const role = roleRadio.value;

      // حماية: لا يمكن تعطيل آخر مدير
      if (user.role === CFG.ROLE_ADMIN && (role !== CFG.ROLE_ADMIN || !active)) {
        const admins = DB.load().users.filter(u => u.role === CFG.ROLE_ADMIN && u.active !== false && Number(u.id) !== Number(user.id));
        if (admins.length === 0) { Toast.error("لا يمكن تغيير دور أو تعطيل المدير الوحيد في النظام"); return; }
      }

      const res = await Auth.updateUser(user.id, { fullName, role, active });
      if (!res.success) { Toast.error(res.message); return; }

      // تحديث بيانات المستخدم الحالي إن كان هو نفسه
      if (Number(user.id) === Number(App.currentUser.id)) {
        App.currentUser.full_name = fullName;
        App.currentUser.role = role;
        App.currentUser.active = active;
      }

      Toast.success("✅ تم تحديث بيانات المستخدم");
      overlay.remove();
      if (onDone) onDone();
    });
  }

  draw();
};

Sections.renderSettings = function (content) {
  const draw = async () => {
    const storeName    = DB.getSetting("store_name", CFG.DEFAULT_STORE_NAME);
    const storeAddress = DB.getSetting("store_address", CFG.DEFAULT_STORE_ADDRESS);
    const storePhone   = DB.getSetting("store_phone", "");
    const lowStock     = DB.getSetting("low_stock_default", 5);

    const storageInfo = await DB.getStorageInfo();
    const storageHtml = storageInfo
      ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px">
           <div style="background:#e8f5e9;border-radius:8px;padding:12px;text-align:center">
             <div style="font-size:11px;color:#555;margin-bottom:4px">مستخدم</div>
             <div style="font-size:18px;font-weight:bold;color:#27ae60">${storageInfo.usage}</div>
           </div>
           <div style="background:#e3f2fd;border-radius:8px;padding:12px;text-align:center">
             <div style="font-size:11px;color:#555;margin-bottom:4px">السعة الكلية</div>
             <div style="font-size:18px;font-weight:bold;color:#2e86ab">${storageInfo.quota}</div>
           </div>
           <div style="background:#f3e5f5;border-radius:8px;padding:12px;text-align:center">
             <div style="font-size:11px;color:#555;margin-bottom:4px">نسبة الاستخدام</div>
             <div style="font-size:18px;font-weight:bold;color:#9b59b6">${storageInfo.percent}</div>
           </div>
         </div>`
      : `<div class="note-box" style="margin-top:10px">لا تتوفر معلومات عن المساحة في هذا المتصفح</div>`;

    const data = DB.load();
    const dbStats = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;font-size:13px">
        <div style="background:#f8f9fa;border-radius:6px;padding:8px;text-align:center"><b>${data.products.length}</b><br><span style="color:#666">منتج</span></div>
        <div style="background:#f8f9fa;border-radius:6px;padding:8px;text-align:center"><b>${data.customers.length}</b><br><span style="color:#666">زبون</span></div>
        <div style="background:#f8f9fa;border-radius:6px;padding:8px;text-align:center"><b>${data.sales.length}</b><br><span style="color:#666">فاتورة بيع</span></div>
        <div style="background:#f8f9fa;border-radius:6px;padding:8px;text-align:center"><b>${data.payments.length}</b><br><span style="color:#666">دفعة</span></div>
      </div>`;

    content.innerHTML = `
      <div class="section">
        <h2 class="section-title">إعدادات المحل</h2>

        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:10px;padding:24px;max-width:600px;margin-bottom:18px">
          <div class="form-row"><label>اسم المحل</label><div class="field"><input type="text" id="cfgName" value="${escapeHtml(storeName)}"></div></div>
          <div class="form-row"><label>عنوان المحل</label><div class="field"><input type="text" id="cfgAddress" value="${escapeHtml(storeAddress)}"></div></div>
          <div class="form-row"><label>هاتف المحل</label><div class="field"><input type="text" id="cfgPhone" value="${escapeHtml(storePhone)}"></div></div>
          <div class="form-row"><label>الحد الأدنى الافتراضي للمخزون</label><div class="field"><input type="number" id="cfgLowStock" value="${lowStock}" min="0" style="width:120px"></div></div>
          <div style="text-align:left;margin-top:16px">
            <button class="btn btn-success" id="btnSaveSettings">💾 حفظ الإعدادات</button>
          </div>
        </div>

        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:10px;padding:20px;max-width:600px;margin-bottom:18px">
          <h3 style="color:#1f3a5f;margin-top:0;display:flex;align-items:center;gap:8px">
            🗂 قاعدة البيانات (IndexedDB)
            <span style="font-size:11px;background:#e8f5e9;color:#27ae60;padding:2px 8px;border-radius:10px;font-weight:normal">سعة ضخمة</span>
          </h3>
          <div class="note-box" style="margin-bottom:8px">
            يستخدم التطبيق <b>IndexedDB</b> — سعتها تصل إلى <b>نصف مساحة القرص</b> (عشرات GB) مقارنةً بـ 5-10 MB في localStorage.
          </div>
          ${storageHtml}
          ${dbStats}
          <div style="margin-top:12px">
            <button class="btn btn-sm btn-secondary" id="btnRefreshStorage" style="font-size:12px">🔄 تحديث معلومات المساحة</button>
          </div>
        </div>

        <div style="background:#fff;border:1px solid #e0e6ed;border-radius:10px;padding:24px;max-width:600px">
          <h3 style="color:#1f3a5f;margin-top:0">🗄 النسخ الاحتياطي</h3>
          <div class="note-box">يُنصح بتصدير نسخة احتياطية بشكل دوري وحفظها في مكان آمن (الكمبيوتر أو USB أو السحابة).</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" id="btnExportDB">📤 تصدير نسخة احتياطية</button>
            <button class="btn btn-orange" id="btnImportDB">📥 استيراد نسخة احتياطية</button>
            <input type="file" id="importFile" accept=".json" style="display:none">
          </div>
        </div>
      </div>`;

    document.getElementById("btnSaveSettings").addEventListener("click", () => {
      const name = document.getElementById("cfgName").value.trim();
      if (!name) { Toast.error("اسم المحل مطلوب"); return; }
      const low = parseFloat(document.getElementById("cfgLowStock").value) || 0;
      DB.setSetting("store_name", name);
      DB.setSetting("store_address", document.getElementById("cfgAddress").value.trim());
      DB.setSetting("store_phone", document.getElementById("cfgPhone").value.trim());
      DB.setSetting("low_stock_default", low);
      App.updateStoreTitle(name);
      Toast.success("تم حفظ الإعدادات بنجاح");
    });

    document.getElementById("btnRefreshStorage").addEventListener("click", () => draw());

    document.getElementById("btnExportDB").addEventListener("click", async () => {
      await DB.saveImmediate();
      const json = DB.exportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `متجر_الفتح_نسخة_احتياطية_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success("✅ تم تصدير النسخة الاحتياطية بنجاح");
    });

    document.getElementById("btnImportDB").addEventListener("click", () => {
      document.getElementById("importFile").click();
    });

    document.getElementById("importFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!(await showConfirm("هذا الإجراء سيستبدل جميع البيانات الحالية.\nهل تريد المتابعة؟"))) {
        e.target.value = ""; return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await DB.importJSON(ev.target.result);
          Toast.success("✅ تم استيراد البيانات بنجاح. سيتم إعادة تحميل الصفحة.");
          setTimeout(() => location.reload(), 1200);
        } catch (err) {
          Toast.error("ملف غير صالح: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  };

  draw();
};

/* =========================================================================
   نقطة الدخول - تشغيل التطبيق
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
