import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, deleteRecordsByField, updateRecord, subscribeCollection } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import { Users, Plus, Search, Phone, MapPin, Edit2, Trash2, X, ChevronRight, Home, Building2, Factory } from "lucide-react";

const propertyTypes = ["Residential", "Commercial", "Industrial"];
const propertyIcons = { Residential: Home, Commercial: Building2, Industrial: Factory };

function CustomerModal({ customer, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    propertyType: customer?.propertyType || "Residential",
    email: customer?.email || "",
    notes: customer?.notes || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{customer ? "Edit Customer" : "Add Customer"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Customer full name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone *</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              required
              placeholder="10-digit mobile number"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email address"
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address *</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              required
              placeholder="Full property address"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Property Type</label>
            <div className="grid grid-cols-3 gap-2">
              {propertyTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, propertyType: t }))}
                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    form.propertyType === t
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
              {saving ? "Saving..." : customer ? "Update" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerDetail({ customer, jobs, quotations, invoices, onEdit, onDelete, deleting }) {
  const Icon = propertyIcons[customer.propertyType] || Home;
  const customerJobs = jobs.filter((j) => j.customerId === customer.id);
  const customerQuotes = quotations.filter((q) => q.customerId === customer.id);
  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const totalSpent = customerInvoices.reduce((s, i) => s + Number(i.received || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] font-black text-lg">
            {customer.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-lg">{customer.name}</h2>
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Icon className="w-3.5 h-3.5" />
              <span>{customer.propertyType}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--brand)] hover:border-[var(--brand)] transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} disabled={deleting} className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-60">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <a href={`tel:${customer.phone}`} className="hover:text-[var(--brand)]">{customer.phone}</a>
        </div>
        <div className="flex items-start gap-2 text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>{customer.address}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Jobs", value: customerJobs.length },
          { label: "Quotations", value: customerQuotes.length },
          { label: "Invoices", value: customerInvoices.length },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--brand-soft)] rounded-xl p-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--brand-dark)]">Total Spent</span>
        <span className="font-black text-[var(--brand)]">{formatCurrency(totalSpent)}</span>
      </div>

      {customerJobs.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Jobs</p>
          <div className="space-y-1.5">
            {customerJobs.slice(-3).reverse().map((j) => (
              <div key={j.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{j.serviceType || j.serviceName}</p>
                  <p className="text-xs text-slate-400">{formatDateDisplay(j.scheduledDate)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  j.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>{j.status || "pending"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {customer.notes && (
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
          <p className="text-sm text-amber-800">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const { isEmployee } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", (list) => {
        setCustomers(list);
        if (!selected && list.length > 0) setSelected(list[list.length - 1]);
      }),
      subscribeCollection("jobs", setJobs),
      subscribeCollection("quotations", setQuotations),
      subscribeCollection("invoices", setInvoices),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const filtered = useMemo(() => {
    if (!search) return [...customers].reverse();
    const q = search.toLowerCase();
    return [...customers].reverse().filter(
      (c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.address?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editCustomer) {
        await updateRecord("customers", editCustomer.id, form);
        showMsg("success", "Customer updated.");
      } else {
        const id = await createRecord("customers", form);
        const newC = { id, ...form };
        setSelected(newC);
        showMsg("success", "Customer added.");
      }
      setShowModal(false);
      setEditCustomer(null);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}" and all linked data?`)) return;
    setDeleting(true);
    try {
      await Promise.all([
        deleteRecordsByField("jobs", "customerId", "==", selected.id),
        deleteRecordsByField("quotations", "customerId", "==", selected.id),
        deleteRecordsByField("invoices", "customerId", "==", selected.id),
        deleteRecordsByField("amc", "customerId", "==", selected.id),
      ]);
      await deleteRecord("customers", selected.id);
      setSelected(null);
      showMsg("success", "Customer deleted.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
          <p className="text-sm text-slate-400">Employees cannot access customer data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-0.5">{customers.length} total customers in CRM</p>
        </div>
        <button
          onClick={() => { setEditCustomer(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-500">No customers found</p>
              </div>
            ) : (
              filtered.map((c) => {
                const Icon = propertyIcons[c.propertyType] || Home;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-all hover:shadow-sm ${
                      selected?.id === c.id ? "border-[var(--brand)] shadow-sm" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] text-xs font-black flex-shrink-0">
                        {c.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-slate-400 truncate">{c.phone}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">{c.propertyType}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <CustomerDetail
              customer={selected}
              jobs={jobs}
              quotations={quotations}
              invoices={invoices}
              onEdit={() => { setEditCustomer(selected); setShowModal(true); }}
              onDelete={handleDelete}
              deleting={deleting}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-500">Select a customer</p>
              <p className="text-sm text-slate-400 mt-1">Click on a customer to view their details</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CustomerModal
          customer={editCustomer}
          onClose={() => { setShowModal(false); setEditCustomer(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
