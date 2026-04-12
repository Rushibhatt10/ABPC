import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import { subscribeDoc } from "../utils/firestoreHelpers";

export default function InvoicePrintPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const articleRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeDoc("invoices", id, (data) => {
      setInvoice(data);
    });
    return unsub;
  }, [id]);

  if (!invoice) return <div className="p-10 text-center">Loading...</div>;

  const isPaid = invoice.status === "Paid" || Number(invoice.balance) === 0;

  return (
    <div className="bg-gray-100 py-6 flex justify-center print:bg-white">

      <article
        ref={articleRef}
        className="relative bg-white w-full max-w-[210mm] min-h-[297mm] shadow print:shadow-none px-6 sm:px-10 py-10 text-gray-800 overflow-hidden"
      >

        {/* WATERMARK */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <img src="/cropped_circle_image.png" alt="" className="w-[240px]" />
        </div>

        {/* HEADER */}
        <div className="bg-[#1f2937] text-white rounded-xl px-6 py-6 flex justify-between items-center">

          {/* LEFT */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">
              A B Pest Control
            </h1>
            <p className="text-xs tracking-widest opacity-70">
              INSECTICIDE SERVICES
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-5">

            <div className="text-right">
              <p className="text-lg font-semibold tracking-wider">
                INVOICE
              </p>
              <p className="text-xs opacity-70">
                #{invoice.invoiceNumber}
              </p>
              {isPaid && (
                <p className="text-xs mt-1 font-bold tracking-widest text-emerald-400">
                  PAID
                </p>
              )}
            </div>

            <div className="bg-white p-1.5 rounded-full flex items-center justify-center w-12 h-12 flex-shrink-0">
              <img src="/cropped_circle_image.png" alt="Logo" className="w-full h-full object-contain" />
            </div>

          </div>
        </div>

        {/* CUSTOMER + DATE */}
        <div className="mt-8 border-b border-gray-200 pb-4 flex justify-between text-sm">

          <div>
            <p className="text-gray-500">Bill To</p>
            <p className="font-semibold uppercase">
              {invoice.customerName}
            </p>
            <p className="text-gray-600">{invoice.customerAddress}</p>
            <p className="text-gray-600">{invoice.customerPhone}</p>
          </div>

          <div className="text-right space-y-1">
            <p>
              <span className="text-gray-500">Date:</span>{" "}
              {formatDateDisplay(invoice.date)}
            </p>
            {invoice.paymentMode && (
              <p>
                <span className="text-gray-500">Payment:</span>{" "}
                {invoice.paymentMode}
              </p>
            )}
            <p>
              <span className="text-gray-500">Place:</span> Gujarat
            </p>
          </div>

        </div>

        {/* TABLE */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">

            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="p-3 text-left">Service</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-center">Rate</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>

            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-center">
                    {item.price ? formatCurrency(item.price) : "—"}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {formatCurrency(
                      item.finalAmount ??
                      item.total ??
                      (item.quantity * (item.price || 0))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTAL */}
        <div className="flex justify-end mt-10">
          <div className="w-64 border border-gray-300">

            {Number(invoice.discountTotal) > 0 && (
              <div className="flex justify-between p-3 text-sm">
                <span>Discount</span>
                <span>−{formatCurrency(invoice.discountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between p-3 text-sm">
              <span>Sub Total</span>
              <span>{formatCurrency(invoice.subtotal ?? invoice.total)}</span>
            </div>

            <div className="flex justify-between p-3 bg-gray-900 text-white font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>

            <div className="flex justify-between p-3 text-sm">
              <span>Received</span>
              <span>{formatCurrency(invoice.received)}</span>
            </div>

            {Number(invoice.balance) > 0 && (
              <div className="flex justify-between p-3 text-sm font-semibold text-red-600 border-t border-gray-200">
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balance)}</span>
              </div>
            )}

          </div>
        </div>

        {/* TERMS */}
        <div className="mt-12 text-sm space-y-3">
          {invoice.warranty && (
            <div>
              <p className="font-semibold mb-1">Warranty</p>
              <p className="text-gray-600">{invoice.warranty}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="font-semibold mb-1">Terms & Conditions</p>
              <p className="text-gray-600">{invoice.terms}</p>
            </div>
          )}
        </div>

        {/* SIGNATURE */}
        <div className="mt-20 flex justify-between items-end">

          <div className="text-sm text-gray-500">
            For A B Pest Control
          </div>

          <div className="text-center">
            <div className="h-12"></div>
            <p className="text-sm font-medium border-t pt-1">
              Authorized Signatory
            </p>
          </div>

        </div>

      </article>
    </div>
  );
}
