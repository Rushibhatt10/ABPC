import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import Logo from "../components/Logo";
import { subscribeDoc } from "../utils/firestoreHelpers";

export default function InvoicePrintPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeDoc("invoices", id, (data) => {
      setInvoice(data);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center">Loading Invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-10 text-center text-red-500">Invoice not found.</div>;
  }

  return (
    <div className="bg-gray-200 flex justify-center py-6 print:bg-white print:py-0">

      {/* PRINT BUTTON */}
      <button
        onClick={() => window.print()}
        className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded shadow print:hidden"
      >
        Print
      </button>

      {/* A4 CONTAINER */}
      <article className="bg-white w-[210mm] min-h-[297mm] shadow print:shadow-none text-[12px] leading-tight">

        {/* HEADER */}
        <div className="bg-green-500 text-white px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-lg tracking-wide">TAX INVOICE</h1>
          <Logo variant="horizontal" className="h-8" />
        </div>

        {/* COMPANY */}
        <div className="px-4 py-3 border-b text-xs">
          <h2 className="font-bold text-green-600">
            A B PEST CONTROL INSECTICIDE SERVICES
          </h2>

          <div className="flex justify-between mt-1">
            <div>
              SHOP NO: 4 B J HOUSE HANUMAN CHAR RASTA GOPIPURA <br />
              MAIN ROAD SURAT
            </div>
            <div className="text-right">
              Phone: 9825188413 <br />
              Email: abpestcontrol@gmail.com
            </div>
          </div>
        </div>

        {/* DETAILS */}
        <div className="grid grid-cols-2 px-4 py-3 border-b text-xs">
          <div>
            <p className="font-bold text-green-600">Invoice Details</p>
            <p>Invoice No: {invoice.invoiceNumber}</p>
            <p>Date: {formatDateDisplay(invoice.date)}</p>
            <p>Place: Gujarat</p>
          </div>

          <div>
            <p className="font-bold text-green-600">Bill To</p>
            <p className="font-semibold uppercase">{invoice.customerName}</p>
            <p>{invoice.customerAddress}</p>
            <p>Phone: {invoice.customerPhone}</p>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full">
          <table className="w-full border text-[11px]">
            <thead className="bg-green-500 text-white">
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2 text-left">Item</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Price</th>
                <th className="border p-2">Discount</th>
                <th className="border p-2">Amount</th>
              </tr>
            </thead>

            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={i}>
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{item.itemName}</td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2 text-center">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="border p-2 text-center">
                    {formatCurrency(item.discount)}
                  </td>
                  <td className="border p-2 text-center font-bold">
                    {formatCurrency(item.finalAmount)}
                  </td>
                </tr>
              ))}

              <tr className="bg-green-100 font-bold">
                <td colSpan="5" className="border p-2 text-right">
                  Total
                </td>
                <td className="border p-2 text-center">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-4 px-4 py-4 text-xs">

          {/* BANK */}
          <div>
            <p className="font-bold text-green-600">Bank Details</p>
            <p>Bank: SUTEX COOPERATIVE BANK LIMITED</p>
            <p>Account No: 000610021002444</p>
            <p>IFSC: SUTB0248006</p>

            <div className="mt-3">
              <p className="font-bold text-green-600">Description</p>
              <p className="whitespace-pre-wrap">{invoice.warranty}</p>
            </div>
          </div>

          {/* TOTAL BOX */}
          <div className="border">
            <div className="flex justify-between p-2 border-b">
              <span>Sub Total</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between p-2 border-b">
              <span>Discount</span>
              <span>{formatCurrency(invoice.discountTotal)}</span>
            </div>
            <div className="flex justify-between p-2 bg-green-500 text-white font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between p-2 border-b">
              <span>Received</span>
              <span>{formatCurrency(invoice.received)}</span>
            </div>
            <div className="flex justify-between p-2 font-bold">
              <span>Balance</span>
              <span>{formatCurrency(invoice.balance)}</span>
            </div>
          </div>
        </div>

        {/* TERMS */}
        <div className="px-4 pb-4 text-[11px]">
          <p className="font-bold text-green-600">Terms & Conditions</p>
          <p className="whitespace-pre-wrap">{invoice.terms}</p>
        </div>

      </article>
    </div>
  );
}