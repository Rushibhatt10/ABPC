import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, deleteRecordsByField } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import { listRecords, subscribeDb } from "../utils/localDb";

const propertyTypes = ["Residential", "Commercial", "Industrial"];

export default function CustomersPage() {
  const { isWorker } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    propertyType: "Residential",
  });

  useEffect(() => {
    const load = () => {
      const list = listRecords("customers");
      setCustomers(list);
      setJobs(listRecords("jobs"));
      setQuotations(listRecords("quotations"));
      setInvoices(listRecords("invoices"));
      setSelectedCustomerId((prev) => prev || (list[0]?.id ?? ""));
    };

    load();
    const unsubscribe = subscribeDb(load);
    return unsubscribe;
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  );

  const history = useMemo(() => {
    if (!selectedCustomerId) {
      return {
        visits: [],
        quotationList: [],
        invoiceList: [],
      };
    }
    return {
      visits: jobs.filter((job) => job.customerId === selectedCustomerId),
      quotationList: quotations.filter((item) => item.customerId === selectedCustomerId),
      invoiceList: invoices.filter((item) => item.customerId === selectedCustomerId),
    };
  }, [invoices, jobs, quotations, selectedCustomerId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const customerId = await createRecord("customers", {
        ...form,
      });
      setSelectedCustomerId(customerId);
      setForm({
        name: "",
        phone: "",
        address: "",
        propertyType: "Residential",
      });
    } catch (saveError) {
      setError(saveError?.message || "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async () => {
    if (!selectedCustomer) return;

    const confirmed = window.confirm(
      `Delete customer "${selectedCustomer.name}" and all linked jobs, quotations, invoices, and AMC records?`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      const customerId = selectedCustomer.id;
      const [jobCount, quotationCount, invoiceCount, amcCount] = await Promise.all([
        deleteRecordsByField("jobs", "customerId", "==", customerId),
        deleteRecordsByField("quotations", "customerId", "==", customerId),
        deleteRecordsByField("invoices", "customerId", "==", customerId),
        deleteRecordsByField("amc", "customerId", "==", customerId),
      ]);
      await deleteRecord("customers", customerId);
      setSelectedCustomerId("");
      setMessage(
        `Customer deleted. Removed ${jobCount} jobs, ${quotationCount} quotations, ${invoiceCount} invoices, ${amcCount} AMC records.`,
      );
    } catch (deleteError) {
      setError(deleteError?.message || "Failed to delete customer data.");
    } finally {
      setDeleting(false);
    }
  };

  if (isWorker) {
    return (
      <section className="app-card text-center">
        <p className="text-sm text-slate-500">Workers can only access today&apos;s jobs.</p>
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
      {message ? (
        <section className="app-card border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700">
          {message}
        </section>
      ) : null}
      <section className="app-card">
        <p className="section-title">Add Customer</p>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="field-label" htmlFor="customerName">
              Name
            </label>
            <input
              id="customerName"
              className="field-input"
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Customer full name"
              required
              value={form.name}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="customerPhone">
              Phone
            </label>
            <input
              id="customerPhone"
              className="field-input"
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="Phone number"
              required
              value={form.phone}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="customerAddress">
              Address
            </label>
            <textarea
              id="customerAddress"
              className="field-input min-h-20"
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              placeholder="Property address"
              required
              value={form.address}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="propertyType">
              Property Type
            </label>
            <select
              id="propertyType"
              className="field-input"
              onChange={(event) => setForm((prev) => ({ ...prev, propertyType: event.target.value }))}
              value={form.propertyType}
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button className="primary-btn" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save Customer"}
          </button>
        </form>
      </section>

      <section className="app-card">
        <p className="section-title">Customer List</p>
        <div className="space-y-2">
          {!customers.length ? (
            <p className="text-sm text-slate-500">No customers added yet.</p>
          ) : (
            customers.map((customer) => (
              <button
                key={customer.id}
                className={`surface-card w-full text-left ${
                  selectedCustomerId === customer.id ? "border-emerald-300 bg-emerald-50" : ""
                }`}
                onClick={() => setSelectedCustomerId(customer.id)}
                type="button"
              >
                <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                <p className="text-xs text-slate-500">{customer.phone}</p>
                <p className="mt-1 text-xs text-slate-500">{customer.propertyType}</p>
              </button>
            ))
          )}
        </div>
      </section>

      {selectedCustomer ? (
        <section className="app-card">
          <p className="section-title">Customer History</p>
          <div className="space-y-2 text-sm">
            <div className="surface-card">
              <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
              <p className="text-slate-500">{selectedCustomer.phone}</p>
              <p className="mt-1 text-slate-500">{selectedCustomer.address}</p>
            </div>
            <div className="surface-card">
              <p className="font-semibold text-slate-700">Past services / visits: {history.visits.length}</p>
              {history.visits.slice(0, 3).map((visit) => (
                <p key={visit.id} className="text-xs text-slate-500">
                  {visit.serviceName || "Service"} on {formatDateDisplay(visit.scheduledDate)} ({visit.status || "pending"})
                </p>
              ))}
            </div>
            <div className="surface-card">
              <p className="font-semibold text-slate-700">Quotations: {history.quotationList.length}</p>
              {history.quotationList.slice(0, 3).map((quote) => (
                <p key={quote.id} className="text-xs text-slate-500">
                  {quote.estimateNumber} - {formatCurrency(quote.totalAmount)}
                </p>
              ))}
            </div>
            <div className="surface-card">
              <p className="font-semibold text-slate-700">Bills / Invoices: {history.invoiceList.length}</p>
              {history.invoiceList.slice(0, 3).map((invoice) => (
                <p key={invoice.id} className="text-xs text-slate-500">
                  {invoice.invoiceNumber} - Balance {formatCurrency(invoice.balance)}
                </p>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <button
              className="w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"
              disabled={deleting}
              onClick={deleteCustomer}
              type="button"
            >
              {deleting ? "Deleting..." : "Delete Customer + All Linked Data"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}