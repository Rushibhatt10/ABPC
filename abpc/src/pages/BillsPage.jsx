import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, nextDocumentNumber, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO, getWhatsAppNumber, toNumber } from "../utils/format";
import { subscribeCollection } from "../utils/firestoreHelpers";

const defaultMethodology =
  "Methodology: Drilling at regular intervals, chemical injection through nozzles, and final sealing for complete treatment.";
const defaultWarranty = "Warranty: As per treatment type, subject to site conditions and maintenance.";
const defaultPaymentTerms = "Payment terms: 50% advance and remaining amount on completion.";
const defaultBankDetails = "Bank: A B Pest Control | A/C: 1234567890 | IFSC: ABCD0001234";
const defaultTerms =
  "Terms: 1) Quotation valid for 15 days. 2) Client to make area accessible. 3) Taxes extra if applicable.";

const createQuoteItem = () => ({
  itemName: "",
  quantity: "",
  unit: "sq ft",
  unitPrice: "",
});

const createInvoiceItem = () => ({
  itemName: "",
  quantity: "",
  price: "",
  discount: "",
});

export default function BillsPage() {
  const { isEmployee } = useAuth();
  const [tab, setTab] = useState("quotations");
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [quotationForm, setQuotationForm] = useState({
    customerId: "",
    date: getTodayISO(),
    items: [createQuoteItem()],
    methodology: defaultMethodology,
    warranty: defaultWarranty,
    paymentTerms: defaultPaymentTerms,
    bankDetails: defaultBankDetails,
    terms: defaultTerms,
  });

  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    quotationId: "",
    date: getTodayISO(),
    items: [createInvoiceItem()],
    received: "",
    paymentMode: "UPI",
    warranty: defaultWarranty,
    terms: defaultTerms,
  });

  useEffect(() => {
    const unsubscribers = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("quotations", setQuotations),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("priceList", setPriceList),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  const [pricePicker, setPricePicker] = useState({ category: "", bhk: "1" });

  const selectedPriceRow = useMemo(() => {
    if (!pricePicker.category) return null;
    return priceList.find((row) => row.category === pricePicker.category) || null;
  }, [priceList, pricePicker.category]);

  const selectedPriceValue = useMemo(() => {
    const row = selectedPriceRow;
    if (!row) return null;
    const entry = row.bhkPrices?.[pricePicker.bhk] || null;
    const editable = entry?.editable;
    const base = entry?.base;
    const price = editable ?? base ?? null;
    return typeof price === "number" ? price : null;
  }, [pricePicker.bhk, selectedPriceRow]);

  const addFromPriceListToQuotation = () => {
    if (!selectedPriceRow || selectedPriceValue === null) {
      setMessage("Select a price list entry that has been initialized.");
      return;
    }
    setQuotationForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: selectedPriceRow.serviceName || selectedPriceRow.category,
          quantity: "1",
          unit: "job",
          unitPrice: String(selectedPriceValue),
        },
      ],
    }));
  };

  const addFromPriceListToInvoice = () => {
    if (!selectedPriceRow || selectedPriceValue === null) {
      setMessage("Select a price list entry that has been initialized.");
      return;
    }
    setInvoiceForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: selectedPriceRow.serviceName || selectedPriceRow.category,
          quantity: "1",
          price: String(selectedPriceValue),
          discount: "0",
        },
      ],
    }));
  };

  const quotationCustomer = useMemo(
    () => customers.find((customer) => customer.id === quotationForm.customerId) || null,
    [customers, quotationForm.customerId],
  );
  const invoiceCustomer = useMemo(
    () => customers.find((customer) => customer.id === invoiceForm.customerId) || null,
    [customers, invoiceForm.customerId],
  );

  const quoteTotal = useMemo(
    () =>
      quotationForm.items.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice),
        0,
      ),
    [quotationForm.items],
  );

  const invoiceTotals = useMemo(() => {
    const subtotal = invoiceForm.items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.price), 0);
    const discountTotal = invoiceForm.items.reduce((sum, item) => sum + toNumber(item.discount), 0);
    const total = Math.max(subtotal - discountTotal, 0);
    const received = toNumber(invoiceForm.received);
    const balance = Math.max(total - received, 0);
    return { subtotal, discountTotal, total, received, balance };
  }, [invoiceForm.items, invoiceForm.received]);

  const handleQuotationItemChange = (index, key, value) => {
    setQuotationForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const handleInvoiceItemChange = (index, key, value) => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const saveQuotation = async (event) => {
    event.preventDefault();
    if (!quotationCustomer) {
      setMessage("Select a customer first.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const estimateNumber = await nextDocumentNumber("EST");
      const items = quotationForm.items
        .filter((item) => item.itemName && toNumber(item.quantity) > 0)
        .map((item) => ({
          itemName: item.itemName,
          quantity: toNumber(item.quantity),
          unit: item.unit || "sq ft",
          unitPrice: toNumber(item.unitPrice),
          total: toNumber(item.quantity) * toNumber(item.unitPrice),
        }));

      await createRecord("quotations", {
        estimateNumber,
        date: quotationForm.date,
        customerId: quotationCustomer.id,
        customerName: quotationCustomer.name,
        customerPhone: quotationCustomer.phone,
        customerAddress: quotationCustomer.address,
        propertyType: quotationCustomer.propertyType,
        items,
        totalAmount: items.reduce((sum, item) => sum + item.total, 0),
        methodology: quotationForm.methodology,
        warranty: quotationForm.warranty,
        paymentTerms: quotationForm.paymentTerms,
        bankDetails: quotationForm.bankDetails,
        terms: quotationForm.terms,
        status: "Draft",
      });

      setQuotationForm((prev) => ({
        ...prev,
        items: [createQuoteItem()],
      }));
      setMessage(`Quotation ${estimateNumber} created.`);
      setError("");
    } catch (saveError) {
      setError(saveError?.message || "Failed to save quotation.");
    } finally {
      setBusy(false);
    }
  };

  const openQuotationOnWhatsApp = (quotation) => {
    const whatsappNumber = getWhatsAppNumber(quotation.customerPhone);
    if (!whatsappNumber) {
      setMessage("Customer phone not available for WhatsApp.");
      return;
    }

    const link = `${window.location.origin}/admin/quotations/${quotation.id}`;
    const messageBody = `Hello ${quotation.customerName}, estimate ${quotation.estimateNumber} from A B Pest Control is ${formatCurrency(quotation.totalAmount)}. View estimate: ${link}`;
    navigator.clipboard?.writeText(messageBody).catch(() => {});
    setMessage("WhatsApp message copied (offline mode). Paste into WhatsApp manually when online.");
  };

  const deleteQuotation = async (quotation) => {
    const confirmed = window.confirm(`Delete quotation ${quotation.estimateNumber}?`);
    if (!confirmed) return;

    setDeletingId(quotation.id);
    setError("");
    setMessage("");
    try {
      await deleteRecord("quotations", quotation.id);
      setMessage(`Quotation ${quotation.estimateNumber} deleted.`);
    } catch (deleteError) {
      setError(deleteError?.message || "Failed to delete quotation.");
    } finally {
      setDeletingId("");
    }
  };

  const convertQuotationToInvoice = (quotation) => {
    setTab("invoices");
    setInvoiceForm({
      customerId: quotation.customerId,
      quotationId: quotation.id,
      date: getTodayISO(),
      items: (quotation.items || []).map((item) => ({
        itemName: item.itemName,
        quantity: String(item.quantity || ""),
        price: String(item.unitPrice || ""),
        discount: "0",
      })),
      received: "",
      paymentMode: "UPI",
      warranty: quotation.warranty || defaultWarranty,
      terms: quotation.terms || defaultTerms,
    });
    setMessage(`Quotation ${quotation.estimateNumber} loaded into invoice form.`);
  };

  const saveInvoice = async (event) => {
    event.preventDefault();
    if (!invoiceCustomer) {
      setMessage("Select customer for invoice.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const invoiceNumber = await nextDocumentNumber("INV");
      const items = invoiceForm.items
        .filter((item) => item.itemName && toNumber(item.quantity) > 0)
        .map((item) => {
          const lineSubtotal = toNumber(item.quantity) * toNumber(item.price);
          const discount = toNumber(item.discount);
          return {
            itemName: item.itemName,
            quantity: toNumber(item.quantity),
            price: toNumber(item.price),
            discount,
            finalAmount: Math.max(lineSubtotal - discount, 0),
          };
        });

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
      const total = Math.max(subtotal - discountTotal, 0);
      const received = toNumber(invoiceForm.received);
      const balance = Math.max(total - received, 0);

      await createRecord("invoices", {
        invoiceNumber,
        date: invoiceForm.date,
        quotationId: invoiceForm.quotationId || null,
        customerId: invoiceCustomer.id,
        customerName: invoiceCustomer.name,
        customerPhone: invoiceCustomer.phone,
        customerAddress: invoiceCustomer.address,
        items,
        subtotal,
        discountTotal,
        total,
        received,
        balance,
        paymentMode: invoiceForm.paymentMode,
        warranty: invoiceForm.warranty,
        terms: invoiceForm.terms,
        status: balance > 0 ? "Pending" : "Paid",
      });

      if (invoiceForm.quotationId) {
        await updateRecord("quotations", invoiceForm.quotationId, { status: "Converted to Invoice" });
      }

      setInvoiceForm((prev) => ({
        ...prev,
        quotationId: "",
        items: [createInvoiceItem()],
        received: "",
      }));
      setMessage(`Invoice ${invoiceNumber} created.`);
      setError("");
    } catch (saveError) {
      setError(saveError?.message || "Failed to save invoice.");
    } finally {
      setBusy(false);
    }
  };

  const markInvoicePaid = async (invoice) => {
    try {
      setError("");
      await updateRecord("invoices", invoice.id, {
        received: invoice.total,
        balance: 0,
        status: "Paid",
      });
      setMessage(`${invoice.invoiceNumber} marked as paid.`);
    } catch (saveError) {
      setError(saveError?.message || "Failed to update invoice.");
    }
  };

  const deleteInvoice = async (invoice) => {
    const confirmed = window.confirm(`Delete invoice ${invoice.invoiceNumber}?`);
    if (!confirmed) return;

    setDeletingId(invoice.id);
    setError("");
    setMessage("");
    try {
      await deleteRecord("invoices", invoice.id);
      setMessage(`Invoice ${invoice.invoiceNumber} deleted.`);
    } catch (deleteError) {
      setError(deleteError?.message || "Failed to delete invoice.");
    } finally {
      setDeletingId("");
    }
  };

  if (isEmployee) {
    return (
      <section className="app-card text-center">
        <p className="text-sm text-slate-500">Employees can only access today&apos;s jobs.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <section className="app-card border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700">
          {error}
        </section>
      ) : null}
      <section className="app-card section-shell">
        <div>
          <p className="section-kicker">Billing Center</p>
          <p className="section-title">Quotations And Bills</p>
          <p className="section-subtitle">Create documents at the top and review all saved records in dedicated sections below.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`ghost-btn ${tab === "quotations" ? "btn-toggle-active" : ""}`}
            onClick={() => setTab("quotations")}
            type="button"
          >
            Quotations
          </button>
          <button
            className={`ghost-btn ${tab === "invoices" ? "btn-toggle-active" : ""}`}
            onClick={() => setTab("invoices")}
            type="button"
          >
            Tax Invoices
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      {tab === "quotations" ? (
        <>
          <form className="space-y-4" onSubmit={saveQuotation}>
            <section className="app-card section-shell">
              <div>
                <p className="section-kicker">New Entry</p>
                <p className="section-title">Create Estimate</p>
              </div>
              <input
                className="field-input"
                onChange={(event) => setQuotationForm((prev) => ({ ...prev, date: event.target.value }))}
                type="date"
                value={quotationForm.date}
              />

              <select
                className="field-input"
                onChange={(event) => setQuotationForm((prev) => ({ ...prev, customerId: event.target.value }))}
                required
                value={quotationForm.customerId}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>

              {quotationCustomer ? (
                <div className="surface-card text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{quotationCustomer.name}</p>
                  <p>{quotationCustomer.address}</p>
                </div>
              ) : null}
            </section>

            <section className="app-card section-shell">
              <p className="text-sm font-bold text-slate-900">Estimate Items</p>
              <div className="saved-card space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Add from price list</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="field-input"
                    onChange={(e) => setPricePicker((p) => ({ ...p, category: e.target.value }))}
                    value={pricePicker.category}
                  >
                    <option value="">Select category</option>
                    {priceList.map((row) => (
                      <option key={row.id} value={row.category}>
                        {row.category}
                      </option>
                    ))}
                  </select>
                  <select className="field-input" onChange={(e) => setPricePicker((p) => ({ ...p, bhk: e.target.value }))} value={pricePicker.bhk}>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="bunglow">Bunglow</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Selected price</span>
                  <span className="font-bold">{selectedPriceValue === null ? "-" : formatCurrency(selectedPriceValue)}</span>
                </div>
                <button className="secondary-btn btn-view" onClick={addFromPriceListToQuotation} type="button">
                  Add Item
                </button>
              </div>
              {quotationForm.items.map((item, index) => (
                <div key={`quote-item-${index}`} className="saved-card space-y-2">
                  <input
                    className="field-input"
                    onChange={(event) => handleQuotationItemChange(index, "itemName", event.target.value)}
                    placeholder="Item name"
                    value={item.itemName}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="field-input"
                      min="0"
                      step="0.01"
                      onChange={(event) => handleQuotationItemChange(index, "quantity", event.target.value)}
                      placeholder="Qty"
                      type="number"
                      value={item.quantity}
                    />
                    <input
                      className="field-input"
                      onChange={(event) => handleQuotationItemChange(index, "unit", event.target.value)}
                      placeholder="Unit"
                      value={item.unit}
                    />
                    <input
                      className="field-input"
                      min="0"
                      step="0.01"
                      onChange={(event) => handleQuotationItemChange(index, "unitPrice", event.target.value)}
                      placeholder="Price"
                      type="number"
                      value={item.unitPrice}
                    />
                  </div>
                  {quotationForm.items.length > 1 ? (
                    <button
                      className="ghost-btn"
                      onClick={() =>
                        setQuotationForm((prev) => ({
                          ...prev,
                          items: prev.items.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      type="button"
                    >
                      Remove item
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                className="secondary-btn btn-view"
                onClick={() => setQuotationForm((prev) => ({ ...prev, items: [...prev.items, createQuoteItem()] }))}
                type="button"
              >
                Add Item
              </button>
              <div className="surface-card flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Total</span>
                <span className="text-lg font-extrabold text-slate-900">{formatCurrency(quoteTotal)}</span>
              </div>
            </section>

            <section className="app-card section-shell">
              <p className="text-sm font-bold text-slate-900">Details</p>
              <textarea
                className="field-input min-h-20"
                onChange={(event) => setQuotationForm((prev) => ({ ...prev, methodology: event.target.value }))}
                value={quotationForm.methodology}
              />
              <textarea
                className="field-input min-h-20"
                onChange={(event) => setQuotationForm((prev) => ({ ...prev, warranty: event.target.value }))}
                value={quotationForm.warranty}
              />
              <textarea
                className="field-input min-h-20"
                onChange={(event) => setQuotationForm((prev) => ({ ...prev, paymentTerms: event.target.value }))}
                value={quotationForm.paymentTerms}
              />
              <textarea
                className="field-input min-h-20"
                onChange={(event) => setQuotationForm((prev) => ({ ...prev, bankDetails: event.target.value }))}
                value={quotationForm.bankDetails}
              />
              <textarea
                className="field-input min-h-24"
                onChange={(event) => setQuotationForm((prev) => ({ ...prev, terms: event.target.value }))}
                value={quotationForm.terms}
              />
            </section>

            <button className="primary-btn btn-save" disabled={busy} type="submit">
              {busy ? "Saving..." : "Save Quotation"}
            </button>
          </form>

          <section className="app-card saved-section">
            <div>
              <p className="section-kicker">Saved Things</p>
              <p className="section-title">Saved Quotations</p>
            </div>
            <div className="summary-strip">
              <div className="mini-stat">
                <p className="mini-stat-label">Stored</p>
                <p className="mini-stat-value">{quotations.length}</p>
              </div>
              <div className="mini-stat">
                <p className="mini-stat-label">Customers</p>
                <p className="mini-stat-value">{new Set(quotations.map((item) => item.customerId)).size}</p>
              </div>
              <div className="mini-stat">
                <p className="mini-stat-label">Value</p>
                <p className="mini-stat-value">{formatCurrency(quotations.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0))}</p>
              </div>
            </div>
            <div className="saved-list">
              {!quotations.length ? (
                <p className="text-sm text-slate-500">No quotations yet.</p>
              ) : (
                [...quotations].reverse().map((quotation) => (
                  <article key={quotation.id} className="saved-card">
                    <div className="saved-card-top">
                      <div>
                        <p className="saved-card-title">{quotation.estimateNumber}</p>
                        <p className="saved-card-meta">{quotation.customerName}</p>
                        <p className="saved-card-meta">{formatDateDisplay(quotation.date)}</p>
                      </div>
                      <p className="saved-card-amount">{formatCurrency(quotation.totalAmount)}</p>
                    </div>
                    <div className="saved-card-note">Status: {quotation.status || "Draft"}</div>
                    <div className="saved-card-actions grid grid-cols-3">
                      <Link className="ghost-btn btn-view text-center" to={`/admin/quotations/${quotation.id}`}>
                        View
                      </Link>
                      <button className="primary-btn btn-send text-xs" onClick={() => openQuotationOnWhatsApp(quotation)} type="button">
                        WhatsApp
                      </button>
                      <button className="primary-btn btn-convert text-xs" onClick={() => convertQuotationToInvoice(quotation)} type="button">
                        Convert
                      </button>
                    </div>
                    <button
                      className="danger-btn text-xs"
                      disabled={deletingId === quotation.id}
                      onClick={() => deleteQuotation(quotation)}
                      type="button"
                    >
                      {deletingId === quotation.id ? "Deleting..." : "Delete Quotation"}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <form className="space-y-4" onSubmit={saveInvoice}>
            <section className="app-card section-shell">
              <div>
                <p className="section-kicker">New Entry</p>
                <p className="section-title">Create Tax Invoice</p>
              </div>
              <input
                className="field-input"
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, date: event.target.value }))}
                type="date"
                value={invoiceForm.date}
              />
              <select
                className="field-input"
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, customerId: event.target.value }))}
                value={invoiceForm.customerId}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
              {invoiceCustomer ? (
                <div className="surface-card text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{invoiceCustomer.name}</p>
                  <p>{invoiceCustomer.address}</p>
                </div>
              ) : null}
            </section>

            <section className="app-card section-shell">
              <p className="text-sm font-bold text-slate-900">Invoice Items</p>
              <div className="saved-card space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Add from price list</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="field-input"
                    onChange={(e) => setPricePicker((p) => ({ ...p, category: e.target.value }))}
                    value={pricePicker.category}
                  >
                    <option value="">Select category</option>
                    {priceList.map((row) => (
                      <option key={row.id} value={row.category}>
                        {row.category}
                      </option>
                    ))}
                  </select>
                  <select className="field-input" onChange={(e) => setPricePicker((p) => ({ ...p, bhk: e.target.value }))} value={pricePicker.bhk}>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="bunglow">Bunglow</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Selected price</span>
                  <span className="font-bold">{selectedPriceValue === null ? "-" : formatCurrency(selectedPriceValue)}</span>
                </div>
                <button className="secondary-btn btn-view" onClick={addFromPriceListToInvoice} type="button">
                  Add Item
                </button>
              </div>
              {invoiceForm.items.map((item, index) => (
                <div key={`invoice-item-${index}`} className="saved-card space-y-2">
                  <input
                    className="field-input"
                    onChange={(event) => handleInvoiceItemChange(index, "itemName", event.target.value)}
                    placeholder="Item name"
                    value={item.itemName}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="field-input"
                      min="0"
                      step="0.01"
                      onChange={(event) => handleInvoiceItemChange(index, "quantity", event.target.value)}
                      placeholder="Qty"
                      type="number"
                      value={item.quantity}
                    />
                    <input
                      className="field-input"
                      min="0"
                      step="0.01"
                      onChange={(event) => handleInvoiceItemChange(index, "price", event.target.value)}
                      placeholder="Price"
                      type="number"
                      value={item.price}
                    />
                    <input
                      className="field-input"
                      min="0"
                      step="0.01"
                      onChange={(event) => handleInvoiceItemChange(index, "discount", event.target.value)}
                      placeholder="Discount"
                      type="number"
                      value={item.discount}
                    />
                  </div>
                  {invoiceForm.items.length > 1 ? (
                    <button
                      className="ghost-btn"
                      onClick={() =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          items: prev.items.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      type="button"
                    >
                      Remove item
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                className="secondary-btn btn-view"
                onClick={() => setInvoiceForm((prev) => ({ ...prev, items: [...prev.items, createInvoiceItem()] }))}
                type="button"
              >
                Add Item
              </button>
            </section>

            <section className="app-card section-shell">
              <p className="text-sm font-bold text-slate-900">Summary</p>
              <div className="surface-card flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(invoiceTotals.subtotal)}</span>
              </div>
              <div className="surface-card flex justify-between text-sm">
                <span>Discount</span>
                <span>{formatCurrency(invoiceTotals.discountTotal)}</span>
              </div>
              <div className="surface-card flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoiceTotals.total)}</span>
              </div>
              <input
                className="field-input"
                min="0"
                step="0.01"
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, received: event.target.value }))}
                placeholder="Received amount"
                type="number"
                value={invoiceForm.received}
              />
              <div className="surface-card flex justify-between text-sm font-bold">
                <span>Balance</span>
                <span>{formatCurrency(invoiceTotals.balance)}</span>
              </div>
              <select
                className="field-input"
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, paymentMode: event.target.value }))}
                value={invoiceForm.paymentMode}
              >
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <textarea
                className="field-input min-h-20"
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, warranty: event.target.value }))}
                value={invoiceForm.warranty}
              />
              <textarea
                className="field-input min-h-24"
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, terms: event.target.value }))}
                value={invoiceForm.terms}
              />
            </section>

            <button className="primary-btn btn-create" disabled={busy} type="submit">
              {busy ? "Saving..." : "Save Invoice"}
            </button>
          </form>

          <section className="app-card saved-section">
            <div>
              <p className="section-kicker">Saved Things</p>
              <p className="section-title">Saved Bills</p>
            </div>
            <div className="summary-strip">
              <div className="mini-stat">
                <p className="mini-stat-label">Stored</p>
                <p className="mini-stat-value">{invoices.length}</p>
              </div>
              <div className="mini-stat">
                <p className="mini-stat-label">Pending</p>
                <p className="mini-stat-value">{invoices.filter((item) => Number(item.balance || 0) > 0).length}</p>
              </div>
              <div className="mini-stat">
                <p className="mini-stat-label">Collected</p>
                <p className="mini-stat-value">{formatCurrency(invoices.reduce((sum, item) => sum + Number(item.received || 0), 0))}</p>
              </div>
            </div>
            <div className="saved-list">
              {!invoices.length ? (
                <p className="text-sm text-slate-500">No invoices yet.</p>
              ) : (
                [...invoices].reverse().map((invoice) => (
                  <article key={invoice.id} className="saved-card">
                    <div className="saved-card-top">
                      <div>
                        <p className="saved-card-title">{invoice.invoiceNumber}</p>
                        <p className="saved-card-meta">{invoice.customerName}</p>
                        <p className="saved-card-meta">{formatDateDisplay(invoice.date)}</p>
                      </div>
                      <span className="status-pill">{invoice.status || "Pending"}</span>
                    </div>
                    <p className="saved-card-note">
                      Total: {formatCurrency(invoice.total)} | Balance: {formatCurrency(invoice.balance)}
                    </p>
                    <div className="saved-card-actions grid grid-cols-2">
                      <Link className="ghost-btn btn-view text-center" to={`/admin/invoices/${invoice.id}`}>
                        View
                      </Link>
                      <button
                        className="primary-btn btn-pay text-xs"
                        disabled={false}
                        onClick={() => markInvoicePaid(invoice)}
                        type="button"
                      >
                        Mark Paid
                      </button>
                    </div>
                    <button
                      className="danger-btn text-xs"
                      disabled={deletingId === invoice.id}
                      onClick={() => deleteInvoice(invoice)}
                      type="button"
                    >
                      {deletingId === invoice.id ? "Deleting..." : "Delete Invoice"}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
