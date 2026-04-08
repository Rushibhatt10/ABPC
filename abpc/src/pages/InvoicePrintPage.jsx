import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import Logo from "../components/Logo";
import { getRecord, subscribeDb } from "../utils/localDb";

export default function InvoicePrintPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      if (!id) return;
      setInvoice(getRecord("invoices", id));
      setLoading(false);
    };
    load();
    const unsubscribe = subscribeDb(load);
    return unsubscribe;
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center">Loading Invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-10 text-center text-red-500">Invoice not found.</div>;
  }

  return (
    <div className="bg-[#f5f5f5] min-h-screen py-6 px-2 sm:px-4">
      <article className="bg-white max-w-5xl mx-auto shadow rounded overflow-hidden text-sm">

        {/* HEADER */}
        <div className="bg-green-500 text-white px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-lg tracking-wide">TAX INVOICE</h1>
          <Logo variant="horizontal" className="h-8" />
        </div>

        {/* COMPANY */}
        <div className="px-4 py-3 border-b">
          <h2 className="font-bold text-green-600 text-base">
            A B PEST CONTROL INSECTICIDE SERVICES
          </h2>
          <div className="flex flex-col sm:flex-row sm:justify-between text-xs mt-1 gap-2">
            <div>
              SHOP NO: 4 B J HOUSE HANUMAN CHAR RASTA GOPIPURA <br />
              MAIN ROAD SURAT
            </div>
            <div className="text-left sm:text-right">
              Phone: 9825188413 <br />
              Email: abpestcontrol@gmail.com
            </div>
          </div>
        </div>

        {/* BILL + INVOICE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-3 border-b">
          <div>
            <p className="text-green-600 font-semibold">Invoice Details</p>
            <p><b>Invoice No:</b> {invoice.invoiceNumber}</p>
            <p><b>Date:</b> {formatDateDisplay(invoice.date)}</p>
            <p><b>Place:</b> Gujarat</p>
          </div>

          <div>
            <p className="text-green-600 font-semibold">Bill To</p>
            <p className="font-bold uppercase">{invoice.customerName}</p>
            <p>{invoice.customerAddress}</p>
            <p>Contact: {invoice.customerPhone}</p>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border text-xs sm:text-sm">
            <thead className="bg-green-500 text-white">
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2 text-left">Item name</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Price/unit</th>
                <th className="border p-2">Discount</th>
                <th className="border p-2">Amount</th>
              </tr>
            </thead>

            <tbody>
              {(invoice.items || []).map((item, index) => (
                <tr key={index}>
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2 font-semibold">
                    {item.itemName}
                  </td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2 text-center">UNIT</td>
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

              {/* TOTAL ROW */}
              <tr className="bg-green-100 font-bold">
                <td colSpan="5" className="border p-2 text-right">Total</td>
                <td className="border p-2 text-center">
                  {formatCurrency(invoice.discountTotal)}
                </td>
                <td className="border p-2 text-center">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* LOWER SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-4">

          {/* PAY TO */}
          <div className="text-xs space-y-1">
            <p className="font-bold text-green-600">Pay To:</p>
            <p>Bank: SUTEX COOPERATIVE BANK LIMITED</p>
            <p>Account No: 000610021002444</p>
            <p>IFSC: SUTB0248006</p>
            <p>Account Holder: A.B Pest Control</p>

            <div className="mt-3">
              <p className="font-bold text-green-600">Description</p>
              <p className="whitespace-pre-wrap">
                {invoice.warranty}
              </p>
            </div>
          </div>

          {/* TOTAL BOX */}
          <div className="border text-xs">
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
            <div className="flex justify-between p-2 font-bold border-b">
              <span>Balance</span>
              <span>{formatCurrency(invoice.balance)}</span>
            </div>
            <div className="flex justify-between p-2">
              <span>Payment Mode</span>
              <span>{invoice.paymentMode}</span>
            </div>
          </div>
        </div>

        {/* TERMS */}
        <div className="px-4 pb-4 text-[11px] whitespace-pre-wrap">
          <p className="font-bold text-green-600">Terms & Conditions</p>
          <p>{invoice.terms}</p>
        </div>

      </article>
    </div>
  );
}