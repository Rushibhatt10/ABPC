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
    <article className="bg-white p-6 shadow-lg rounded-lg max-w-4xl mx-auto my-8">

      <header className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="bg-green-500 text-white px-4 py-1 font-bold inline-block">
              TAX INVOICE
            </h1>
            <p className="font-bold mt-2">A B Pest Control Insecticide Services</p>
            <p className="text-xs text-gray-500">
              SHOP NO: 4 B J HOUSE HANUMAN CHAR RASTA GOPIPURA, SURAT
            </p>
          </div>

          <div className="w-48 text-right">
            <Logo variant="horizontal" className="justify-end" />
          </div>
        </div>

        <div className="grid grid-cols-2 mt-4 text-sm">
          <div>
            <p><b>Bill To:</b> {invoice.customerName}</p>
            <p>{invoice.customerAddress}</p>
            <p>Phone: {invoice.customerPhone}</p>
          </div>

          <div className="text-right">
            <p><b>Invoice No:</b> {invoice.invoiceNumber}</p>
            <p><b>Date:</b> {formatDateDisplay(invoice.date)}</p>
            <p><b>Place:</b> Gujarat</p>
          </div>
        </div>
      </header>

      <section className="mt-4">
        <table className="w-full border text-sm">
          <thead className="bg-green-500 text-white">
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">Item</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Price</th>
              <th className="border p-2">Discount</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>

          <tbody>
            {(invoice.items || []).map((item, index) => (
              <tr key={index}>
                <td className="border p-2 text-center">{index + 1}</td>
                <td className="border p-2">{item.itemName}</td>
                <td className="border p-2 text-center">{item.quantity}</td>
                <td className="border p-2 text-center">{formatCurrency(item.price)}</td>
                <td className="border p-2 text-center">{formatCurrency(item.discount)}</td>
                <td className="border p-2 text-center font-semibold">
                  {formatCurrency(item.finalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="flex justify-end mt-4">
        <div className="w-72 border text-sm">
          <div className="flex justify-between p-2 border-b">
            <span>Sub Total</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between p-2 border-b">
            <span>Discount</span>
            <span>{formatCurrency(invoice.discountTotal)}</span>
          </div>
          <div className="flex justify-between p-2 bg-green-100 font-bold">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between p-2 border-t">
            <span>Received</span>
            <span>{formatCurrency(invoice.received)}</span>
          </div>
          <div className="flex justify-between p-2 font-bold">
            <span>Balance</span>
            <span>{formatCurrency(invoice.balance)}</span>
          </div>
          <div className="flex justify-between p-2 border-t">
            <span>Payment Mode</span>
            <span>{invoice.paymentMode}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p className="font-bold">Pay To:</p>
        <p>Bank: SUTEX COOPERATIVE BANK LIMITED</p>
        <p>Account No: 000610021002444</p>
        <p>IFSC: SUTB0248006</p>
      </div>

      <div className="mt-4 text-sm">
        <p className="font-bold">Description</p>
        <p className="whitespace-pre-wrap">{invoice.warranty}</p>
      </div>

      <div className="mt-4 text-xs text-gray-600 whitespace-pre-wrap">
        <p className="font-bold">Terms & Conditions</p>
        <p>{invoice.terms}</p>
      </div>

    </article>
  );
}