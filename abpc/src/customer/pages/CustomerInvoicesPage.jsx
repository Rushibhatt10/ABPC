import { useEffect, useState, useMemo } from "react";
import { useCustomerAuth } from "../context/customerAuthState";
import { subscribeQuery } from "../../utils/firestoreHelpers";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";
import { formatCurrency, formatDateDisplay } from "../../utils/format";
import { Receipt, Printer, ShieldCheck, ShieldOff, ShieldAlert } from "lucide-react";

// Calculate warranty expiry date and status from invoice date + warranty string
function getWarrantyInfo(invoiceDate, warrantyStr) {
  if (!warrantyStr || !invoiceDate) return null;
  const lower = warrantyStr.toLowerCase().trim();
  const n = parseInt(lower) || 1;
  let ms = 0;
  if (lower.includes("year"))  ms = n * 365 * 24 * 60 * 60 * 1000;
  else if (lower.includes("month")) ms = n * 30 * 24 * 60 * 60 * 1000;
  else if (lower.includes("day")) ms = n * 24 * 60 * 60 * 1000;
  else return null;
  const start = new Date(invoiceDate);
  const expiry = new Date(start.getTime() + ms);
  const now = new Date();
  const daysLeft = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
  return {
    startDate: start.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    expiryDate: expiry.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    daysLeft,
    isActive: now <= expiry,
    isExpiringSoon: daysLeft > 0 && daysLeft <= 30,
  };
}

export default function CustomerInvoicesPage() {
  const { activeCustomerId } = useCustomerAuth();
  
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (!activeCustomerId) return;
    const q = query(collection(firestoreDb, "invoices"), where("customerId", "==", activeCustomerId));
    return subscribeQuery(q, setInvoices);
  }, [activeCustomerId]);

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices]);

  const printInvoice = () => {
    // Temporarily move the doc-page to body level so print CSS can find it cleanly
    const docEl = document.querySelector('.doc-page');
    if (!docEl) { window.print(); return; }

    const clone = docEl.cloneNode(true);
    // Remove the no-print toolbar from clone if it snuck in
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { window.print(); return; }

    printWin.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Invoice</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: white; font-family: system-ui, sans-serif; }
        .doc-page { width: 210mm; min-height: 297mm; padding: 14mm 16mm; background: white; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; font-size: 11px; }
        .text-slate-900, .font-black { color: #0f172a !important; }
        .text-slate-800 { color: #1e293b !important; }
        .text-slate-600 { color: #475569 !important; }
        .text-slate-500 { color: #64748b !important; }
        .text-slate-400 { color: #94a3b8 !important; }
        .text-rose-500, .text-rose-600 { color: #e11d48 !important; }
        .text-emerald-600 { color: #059669 !important; }
        .border-b { border-bottom: 1px solid #e2e8f0; }
        .border-t { border-top: 1px solid #e2e8f0; }
        .bg-slate-50 { background: #f8fafc !important; }
        .divide-y > * + * { border-top: 1px solid #f1f5f9; }
        .flex { display: flex; } .justify-between { justify-content: space-between; }
        .justify-end { justify-content: flex-end; } .items-start { align-items: flex-start; }
        .grid { display: grid; } .grid-cols-2 { grid-template-columns: 1fr 1fr; }
        .gap-4 { gap: 16px; } .space-y-6 > * + * { margin-top: 24px; }
        .space-y-2 > * + * { margin-top: 8px; } .space-y-1\\.5 > * + * { margin-top: 6px; }
        .w-64 { width: 256px; } .text-right { text-align: right; }
        .text-center { text-align: center; } .text-left { text-align: left; }
        .font-semibold { font-weight: 600; } .font-bold { font-weight: 700; }
        .font-black { font-weight: 900; } .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; } .text-xl { font-size: 20px; }
        .text-lg { font-size: 16px; } .text-\\[10px\\] { font-size: 10px; }
        .text-\\[11px\\] { font-size: 11px; } .uppercase { text-transform: uppercase; }
        .tracking-widest { letter-spacing: 0.1em; } .leading-normal { line-height: 1.5; }
        .leading-relaxed { line-height: 1.65; } .mt-1 { margin-top: 4px; }
        .mt-0\\.5 { margin-top: 2px; } .pt-2 { padding-top: 8px; }
        .pt-3 { padding-top: 12px; } .pt-4 { padding-top: 16px; }
        .pb-4 { padding-bottom: 16px; } .px-3 { padding-left: 12px; padding-right: 12px; }
        .py-3 { padding-top: 12px; padding-bottom: 12px; }
        .py-2\\.5 { padding-top: 10px; padding-bottom: 10px; }
        .wrap { flex-wrap: wrap; } .gap-4 { gap: 16px; }
        .whitespace-pre-line { white-space: pre-line; }
      </style>
    </head><body>`);
    printWin.document.write(clone.outerHTML);
    printWin.document.write('</body></html>');
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="no-print">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Invoices & Bills</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Track billing histories, download receipts, and settle payments</p>
        <p className="text-slate-500 mt-0.5 text-sm">NOTE (This invoice is just for USER record)</p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        
        {/* Left column - list (no-print) */}
        <div className="no-print md:col-span-2 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Bill History</h2>
          {sortedInvoices.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-sm text-slate-400">
              <Receipt className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              No invoices issued.
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {sortedInvoices.map((inv) => {
                const active = selectedInvoice?.id === inv.id;
                const balance = Number(inv.balance || 0);
                const isPaid = balance === 0;

                const statusColor = isPaid 
                  ? "bg-emerald-100 text-emerald-800" 
                  : balance === Number(inv.total) 
                    ? "bg-rose-100 text-rose-800" 
                    : "bg-amber-100 text-amber-800";
                
                const statusLabel = isPaid 
                  ? "Paid" 
                  : balance === Number(inv.total) 
                    ? "Unpaid" 
                    : "Partially Paid";

                return (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                      active ? "border-[var(--brand)] shadow-sm" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{inv.invoiceNumber}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{formatDateDisplay(inv.date)}</p>
                        {inv.items?.some(i => i.warranty) && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Warranty included
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-800 text-sm">{formatCurrency(inv.total)}</p>
                        {!isPaid && (
                          <p className="text-[10px] text-rose-500 font-bold mt-0.5">Due: {formatCurrency(balance)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column - details */}
        <div className="md:col-span-3">
          {selectedInvoice ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden doc-page">
              
              {/* Toolbar Actions (no-print) */}
              <div className="no-print bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex items-center gap-3 flex-wrap">
                <button onClick={printInvoice} className="ghost-btn flex items-center gap-1.5 py-1.5 px-3">
                  <Printer className="w-3.5 h-3.5" /> Print / Receipt
                </button>
              </div>

              {/* Printable Invoice Card */}
              <div className="p-5 sm:p-8 space-y-6">
                
                {/* Logo & Header */}
                <div className="flex justify-between items-start gap-4 flex-wrap border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">AB PEST CONTROL INSECTICIDE SERVICES INSECTISIDE SERVICES</h2>
                    <p className="text-xs text-slate-400 leading-normal">
                      Est. 1980 · Surat, Gujarat<br/>
                      Website: abpestcontrol.in<br/>
                      Email: abpestcontrol@gmail.com<br/>
                      Phone: +91 93744 88004
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">INVOICE</h3>
                    <p className="text-lg font-black text-slate-800 mt-1">{selectedInvoice.invoiceNumber}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Date: {formatDateDisplay(selectedInvoice.date)}</p>
                  </div>
                </div>

                {/* Billing Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client details</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedInvoice.customerName}</p>
                    <p className="text-[10px] font-bold text-[var(--brand)] mt-1">Customer ID: {selectedInvoice.customerId}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{selectedInvoice.customerAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</p>
                    <p className="text-xs font-bold text-slate-700 mt-1">{selectedInvoice.paymentMode || "UPI"}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2.5 px-3 font-bold text-slate-600">Service Description</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600 text-center w-16">Qty</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600 text-right w-24">Rate</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3 font-semibold text-slate-800">{item.itemName}</td>
                          <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(item.price || item.unitPrice)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800">{formatCurrency(item.finalAmount || item.total || (item.quantity * item.price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Warranty Section — shown if any item has warranty, or invoice-level warranty exists */}
                {(() => {
                  // Collect warranty items — check per-item first, then fall back to invoice-level
                  const warrantyItems = (selectedInvoice.items || []).map(item => ({
                    ...item,
                    warranty: item.warranty || selectedInvoice.warranty || "",
                  })).filter(i => i.warranty);

                  if (warrantyItems.length === 0) return null;

                  return (
                    <div className="border border-emerald-200 rounded-2xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">Warranty Coverage</p>
                      </div>
                      <div className="divide-y divide-emerald-50">
                        {warrantyItems.map((item, idx) => {
                          const wInfo = getWarrantyInfo(selectedInvoice.date, item.warranty);
                          return (
                            <div key={idx} className="px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-slate-800">{item.itemName}</p>
                                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">🛡 {item.warranty}</p>
                                </div>
                                {wInfo && (
                                  <div className="text-right flex-shrink-0">
                                    {wInfo.isActive ? (
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        wInfo.isExpiringSoon
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-emerald-100 text-emerald-700"
                                      }`}>
                                        {wInfo.isExpiringSoon
                                          ? <ShieldAlert className="w-3 h-3" />
                                          : <ShieldCheck className="w-3 h-3" />
                                        }
                                        {wInfo.isExpiringSoon ? `Expires in ${wInfo.daysLeft}d` : "Active"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                        <ShieldOff className="w-3 h-3" /> Expired
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {wInfo && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Start Date</p>
                                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{wInfo.startDate}</p>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Valid Until</p>
                                    <p className={`text-xs font-semibold mt-0.5 ${wInfo.isActive ? "text-emerald-700" : "text-slate-400 line-through"}`}>
                                      {wInfo.expiryDate}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Totals Breakdown */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Subtotal:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(selectedInvoice.subtotal || selectedInvoice.total)}</span>
                    </div>
                    {Number(selectedInvoice.discountTotal) > 0 && (
                      <div className="flex justify-between items-center text-xs text-rose-500">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedInvoice.discountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-black border-t border-slate-150 pt-2 text-slate-900">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
                      <span>Amount Received:</span>
                      <span>{formatCurrency(selectedInvoice.received || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1.5 text-rose-600 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(selectedInvoice.balance || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                {selectedInvoice.terms && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terms & Notes</p>
                    <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-line leading-relaxed">{selectedInvoice.terms}</p>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center no-print">
              <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-500">Select an Invoice</p>
              <p className="text-sm text-slate-400 mt-1">Choose an invoice from the history list to view receipts or initiate payment.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
