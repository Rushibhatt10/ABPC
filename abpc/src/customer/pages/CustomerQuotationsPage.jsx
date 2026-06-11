import { useEffect, useState, useMemo } from "react";
import { useCustomerAuth } from "../context/customerAuthState";
import { subscribeQuery } from "../../utils/firestoreHelpers";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";
import { formatCurrency, formatDateDisplay } from "../../utils/format";
import { FileText, Printer, CheckCircle2, AlertTriangle } from "lucide-react";

export default function CustomerQuotationsPage() {
  const { activeCustomerId } = useCustomerAuth();
  
  const [quotations, setQuotations] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);

  useEffect(() => {
    if (!activeCustomerId) return;
    const q = query(collection(firestoreDb, "quotations"), where("customerId", "==", activeCustomerId));
    return subscribeQuery(q, setQuotations);
  }, [activeCustomerId]);

  const sortedQuotes = useMemo(() => {
    return [...quotations].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [quotations]);

  const printQuotation = () => {
    const docEl = document.querySelector('.doc-page');
    if (!docEl) { window.print(); return; }

    const clone = docEl.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { window.print(); return; }

    printWin.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Quotation</title>
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
        .text-emerald-600, .text-emerald-800 { color: #059669 !important; }
        .border-b { border-bottom: 1px solid #e2e8f0; }
        .border-t { border-top: 1px solid #e2e8f0; }
        .bg-slate-50 { background: #f8fafc !important; }
        .bg-emerald-50 { background: #ecfdf5 !important; }
        .border-emerald-200 { border: 1px solid #a7f3d0 !important; }
        .divide-y > * + * { border-top: 1px solid #f1f5f9; }
        .flex { display: flex; } .justify-between { justify-content: space-between; }
        .justify-end { justify-content: flex-end; } .items-start { align-items: flex-start; }
        .items-center { align-items: center; } .gap-3 { gap: 12px; }
        .grid { display: grid; } .grid-cols-2 { grid-template-columns: 1fr 1fr; }
        .gap-4 { gap: 16px; } .space-y-6 > * + * { margin-top: 24px; }
        .space-y-4 > * + * { margin-top: 16px; } .space-y-1\\.5 > * + * { margin-top: 6px; }
        .w-48 { width: 192px; } .text-right { text-align: right; }
        .text-center { text-align: center; } .text-left { text-align: left; }
        .font-semibold { font-weight: 600; } .font-bold { font-weight: 700; }
        .font-black { font-weight: 900; } .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; } .text-xl { font-size: 20px; }
        .text-lg { font-size: 18px; } .text-\\[10px\\] { font-size: 10px; }
        .text-\\[11px\\] { font-size: 11px; } .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; } .leading-normal { line-height: 1.5; }
        .leading-relaxed { line-height: 1.65; } .mt-1 { margin-top: 4px; }
        .mt-6 { margin-top: 24px; } .mt-0\\.5 { margin-top: 2px; }
        .pt-4 { padding-top: 16px; } .pb-4 { padding-bottom: 16px; }
        .px-3 { padding-left: 12px; padding-right: 12px; }
        .py-3 { padding-top: 12px; padding-bottom: 12px; }
        .py-2\\.5 { padding-top: 10px; padding-bottom: 10px; }
        .p-3 { padding: 12px; } .p-4 { padding: 16px; }
        .rounded-xl { border-radius: 12px; } .rounded-2xl { border-radius: 16px; }
        .whitespace-pre-line { white-space: pre-line; }
        .flex-wrap { flex-wrap: wrap; } .shrink-0 { flex-shrink: 0; }
        .w-8 { width: 32px; } .h-8 { height: 32px; }
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
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Quotations & Estimates</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Review and print estimates for pest control service</p>
        <p className="text-slate-500 mt-0.5 text-sm">NOTE (This quotation is just for USER record)</p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        
        {/* Left column - list (hidden when printing) */}
        <div className="md:col-span-2 space-y-3 no-print">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Estimate List</h2>
          {sortedQuotes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-sm text-slate-400">
              <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              No quotations issued.
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {sortedQuotes.map((q) => {
                const active = selectedQuote?.id === q.id;
                const statusColor = 
                  q.customerApprovalStatus === "approved" ? "bg-emerald-100 text-emerald-800" :
                  q.customerApprovalStatus === "rejected" ? "bg-rose-100 text-rose-800" :
                  "bg-amber-100 text-amber-800";
                
                const statusLabel = 
                  q.customerApprovalStatus === "approved" ? "Approved" :
                  q.customerApprovalStatus === "rejected" ? "Rejected" :
                  "Pending Action";

                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                      active ? "border-[var(--brand)] shadow-sm" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{q.estimateNumber}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{formatDateDisplay(q.date)}</p>
                      </div>
                      <p className="font-black text-slate-800 text-sm shrink-0">{formatCurrency(q.totalAmount)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column - details */}
        <div className="md:col-span-3">
          {selectedQuote ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden doc-page">
              
              {/* Toolbar Actions (no-print) */}
              <div className="no-print bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button onClick={printQuotation} className="ghost-btn flex items-center gap-1.5 py-1.5 px-3">
                    <Printer className="w-3.5 h-3.5" /> Print / PDF
                  </button>
                </div>
              </div>

              {/* Printable Content page */}
              <div className="p-5 sm:p-8 space-y-6">
                
                {/* Print Invoice Header */}
                <div className="flex justify-between items-start gap-4 flex-wrap border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">AB PEST CONTROL</h2>
                    <p className="text-xs text-slate-400 leading-normal">
                      Est. 1980 · Surat, Gujarat<br/>
                      Email: abpestcontrol@gmail.com<br/>
                      Phone: +91 93744 88004
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">QUOTATION</h3>
                    <p className="text-lg font-black text-slate-800 mt-1">{selectedQuote.estimateNumber}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Date: {formatDateDisplay(selectedQuote.date)}</p>
                  </div>
                </div>

                {/* Billing details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Details</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedQuote.customerName}</p>
                    <p className="text-[10px] font-bold text-[var(--brand)] mt-1">Customer ID: {selectedQuote.customerId}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{selectedQuote.customerAddress}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2.5 px-3 font-bold text-slate-600">Service Description</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600 text-center w-16">Qty</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600 text-right w-24">Unit Price</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedQuote.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-800">{item.itemName}</p>
                            {item.warranty && <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">🛡 {item.warranty} Warranty</p>}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600">{item.quantity} {item.unit || "job"}</td>
                          <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800">{formatCurrency(item.total || item.quantity * item.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand Total */}
                <div className="flex justify-end pt-2">
                  <div className="w-48 text-right space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-150">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Amount</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(selectedQuote.totalAmount)}</p>
                  </div>
                </div>

                {/* Methodology & Conditions */}
                <div className="space-y-4 pt-4 border-t border-slate-100 text-[11px] leading-relaxed text-slate-600">
                  {selectedQuote.methodology && (
                    <div>
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Methodology</p>
                      <p className="mt-1 whitespace-pre-line">{selectedQuote.methodology}</p>
                    </div>
                  )}
                  {selectedQuote.paymentTerms && (
                    <div>
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Payment Terms</p>
                      <p className="mt-1">{selectedQuote.paymentTerms}</p>
                    </div>
                  )}
                  {selectedQuote.terms && (
                    <div>
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Terms & Conditions</p>
                      <p className="mt-1 whitespace-pre-line">{selectedQuote.terms}</p>
                    </div>
                  )}
                </div>

                {/* Approval Signature section */}
                {selectedQuote.customerApprovalStatus === "approved" && (
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800 text-sm">Digitally Signed & Approved</p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Signed by: <strong>{selectedQuote.customerSignatureName}</strong> on {new Date(selectedQuote.customerApprovalTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                )}

                {selectedQuote.customerApprovalStatus === "rejected" && (
                  <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-800 text-sm">Quotation Rejected</p>
                      <p className="text-xs text-rose-600 mt-0.5 italic">
                        Reason: "{selectedQuote.customerRejectionReason}"
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center no-print">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-500">Select an Estimate</p>
              <p className="text-sm text-slate-400 mt-1">Choose a quotation from the list to view or print.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
