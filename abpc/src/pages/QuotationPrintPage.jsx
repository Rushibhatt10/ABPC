import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import Logo from "../components/Logo";
import { subscribeDoc } from "../utils/firestoreHelpers";
import { generatePdfFromElement } from "../utils/generatePdf";

export default function QuotationPrintPage() {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const articleRef = useRef(null);

  useEffect(() => {
    if (!id) return undefined;
    const unsubscribe = subscribeDoc("quotations", id, (next) => {
      setQuotation(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!articleRef.current) return;
    setGeneratingPdf(true);
    try {
      await generatePdfFromElement(articleRef.current, `${quotation.estimateNumber}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading Estimate...</div>;
  }

  if (!quotation) {
    return <div className="p-10 text-center text-red-500">Estimate not found.</div>;
  }

  const total =
    quotation.totalAmount ||
    quotation.items?.reduce((sum, item) => sum + (item.total || 0), 0) ||
    0;

  return (
    <div className="bg-[#f5f5f5] min-h-screen py-6 px-2 sm:px-4">
      {/* PDF / Print buttons */}
      <div className="flex justify-end gap-2 max-w-5xl mx-auto mb-3 print:hidden">
        <button
          onClick={handleDownloadPdf}
          disabled={generatingPdf}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm disabled:opacity-60"
        >
          {generatingPdf ? "Generating..." : "Download PDF"}
        </button>
        <button
          onClick={() => window.print()}
          className="bg-green-600 text-white px-4 py-2 rounded shadow text-sm"
        >
          Print
        </button>
      </div>
      <article ref={articleRef} className="bg-white max-w-5xl mx-auto shadow rounded overflow-hidden text-sm">

        {/* HEADER */}
        <div className="bg-green-500 text-white px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-lg tracking-wide">ESTIMATE</h1>
          <Logo className="h-8" />
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

        {/* DETAILS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-3 border-b">
          <div>
            <p className="text-green-600 font-semibold">Estimate Details</p>
            <p><b>Estimate No:</b> {quotation.estimateNumber}</p>
            <p><b>Date:</b> {formatDateDisplay(quotation.date)}</p>
            <p><b>Place of Supply:</b> Gujarat</p>
          </div>

          <div>
            <p className="text-green-600 font-semibold">Estimate For</p>
            <p className="font-bold uppercase">{quotation.customerName}</p>
            <p>{quotation.customerAddress}</p>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border text-xs sm:text-sm">
            <thead className="bg-green-500 text-white">
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2 text-left">Item name</th>
                <th className="border p-2">Quantity</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Amount</th>
              </tr>
            </thead>

            <tbody>
              {(quotation.items || []).map((item, index) => (
                <tr key={index}>
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2 font-semibold">
                    {item.itemName}
                  </td>
                  <td className="border p-2 text-center">
                    {item.quantity}
                  </td>
                  <td className="border p-2 text-center">
                    {item.unit || "Sqf"}
                  </td>
                  <td className="border p-2 text-center font-bold">
                    {formatCurrency(item.total || item.finalPrice)}
                  </td>
                </tr>
              ))}

              {/* TOTAL ROW */}
              <tr className="bg-green-100 font-bold">
                <td colSpan="4" className="border p-2 text-right">
                  Total
                </td>
                <td className="border p-2 text-center">
                  {formatCurrency(total)}
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
          </div>

          {/* SUMMARY BOX */}
          <div className="border text-xs">
            <div className="flex justify-between p-2 border-b">
              <span>Sub Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between p-2 bg-green-500 text-white font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="px-4 pb-2">
          <p className="font-bold text-green-600">Description</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-700 text-xs">
            {quotation.methodology}
          </p>
        </div>

        {/* TERMS */}
        <div className="px-4 pb-4 text-[11px] whitespace-pre-wrap">
          <p className="font-bold text-green-600">Terms & Conditions</p>
          <p>{quotation.terms}</p>
        </div>

      </article>
    </div>
  );
}
