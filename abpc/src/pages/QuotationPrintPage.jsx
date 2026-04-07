import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import Logo from "../components/Logo";
import { getRecord, subscribeDb } from "../utils/localDb";

export default function QuotationPrintPage() {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      if (!id) return;
      setQuotation(getRecord("quotations", id));
      setLoading(false);
    };
    load();
    const unsubscribe = subscribeDb(load);
    return unsubscribe;
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center">Loading Estimate...</div>;
  }

  if (!quotation) {
    return <div className="p-10 text-center text-red-500">Estimate not found.</div>;
  }

  const total = quotation.totalAmount || quotation.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;

  return (
    <article className="bg-white p-6 shadow-lg rounded-lg text-sm max-w-4xl mx-auto my-8">
      <div className="bg-green-500 text-white text-center py-2 font-bold text-lg">
        ESTIMATE
      </div>

      <div className="flex justify-between mt-3">
        <div>
          <p className="font-bold text-green-600 text-lg">
            A B PEST CONTROL INSECTICIDE SERVICES
          </p>
          <p>SHOP NO: 4 B J HOUSE HANUMAN CHAR RASTA GOPIPURA</p>
          <p>MAIN ROAD SURAT</p>
        </div>

        <div className="text-right">
          <Logo className="w-48 ml-auto" />
          <p className="mt-2 text-xs">Phone: 9825188413</p>
          <p className="text-xs">Email: abpestcontrol@gmail.com</p>
        </div>
      </div>

      <div className="grid grid-cols-2 mt-4 border-t pt-3">
        <div>
          <p><b>Estimate No:</b> {quotation.estimateNumber}</p>
          <p><b>Date:</b> {formatDateDisplay(quotation.date)}</p>
          <p><b>Place of Supply:</b> Gujarat</p>
        </div>

        <div>
          <p className="font-bold">Estimate For</p>
          <p>{quotation.customerName}</p>
          <p>{quotation.customerAddress}</p>
        </div>
      </div>

      <table className="w-full mt-4 border text-sm">
        <thead className="bg-green-500 text-white">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">Item name</th>
            <th className="border p-2">Quantity</th>
            <th className="border p-2">Unit</th>
            <th className="border p-2">Price / unit</th>
            <th className="border p-2">Amount</th>
          </tr>
        </thead>

        <tbody>
          {(quotation.items || []).map((item, index) => (
            <tr key={index}>
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2">{item.itemName}</td>
              <td className="border p-2 text-center">{item.quantity}</td>
              <td className="border p-2 text-center">{item.unit || "Sqf"}</td>
              <td className="border p-2 text-center">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="border p-2 text-center font-semibold">
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}

          <tr className="bg-green-100 font-bold">
            <td colSpan="5" className="border p-2 text-right">
              Total
            </td>
            <td className="border p-2 text-center">
              {formatCurrency(total)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 mt-4 gap-4">

        <div>
          <p className="font-bold">Pay To:</p>
          <p>Bank Name: SUTEX COOPERATIVE BANK LIMITED</p>
          <p>Account No: 000610021002444</p>
          <p>IFSC code: SUTB0248006</p>
          <p>Account Holder: A.B Pest Control</p>
        </div>

        <div className="border">
          <div className="flex justify-between p-2 border-b">
            <span>Sub Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between p-2 bg-green-100 font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="font-bold">Description</p>
        <p className="mt-1 whitespace-pre-wrap text-gray-700">
          {quotation.methodology}
        </p>
      </div>

      <div className="mt-4 text-xs whitespace-pre-wrap text-gray-600">
        <p className="font-bold">Terms & Conditions</p>
        <p>{quotation.terms}</p>
      </div>

    </article>
  );
}