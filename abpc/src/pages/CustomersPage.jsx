import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, deleteRecordsByField, updateRecord, subscribeCollection } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import { Users, Plus, Search, Phone, MapPin, Edit2, Trash2, X, ChevronRight, Home, Building2, Factory, Copy, BadgeCheck } from "lucide-react";
import { updatePhoneMapping, removePhoneMapping } from "../customer/utils/customerHelpers";


const propertyTypes = ["Residential", "Commercial", "Industrial"];
const propertyIcons = { Residential: Home, Commercial: Building2, Industrial: Factory };

/** Build a single address string from structured parts for geocoding */
function buildAddress({ flatNo, society, area, city, pin }) {
  return [flatNo, society, area, city, pin].filter(Boolean).join(", ");
}

/** Parse existing flat address string back into parts (best-effort for edit) */
function parseAddressParts(address = "") {
  const parts = address.split(",").map(s => s.trim());
  return {
    flatNo:  parts[0] || "",
    society: parts[1] || "",
    area:    parts[2] || "",
    city:    parts[3] || "",
    pin:     parts[4] || "",
  };
}

function CustomerModal({ customer, onClose, onSave, saving }) {
  const parsed = parseAddressParts(customer?.address || "");
  const [form, setForm] = useState({
    name:         customer?.name || "",
    phone:        customer?.phone || "",
    propertyType: customer?.propertyType || "Residential",
    email:        customer?.email || "",
    notes:        customer?.notes || "",
    // structured address parts
    flatNo:  parsed.flatNo,
    society: parsed.society,
    area:    parsed.area,
    city:    parsed.city,
    pin:     parsed.pin,
  });

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const address = buildAddress(form);
    if (!address) { alert("Please fill at least Society/Area and City."); return; }
    onSave({ ...form, address });
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm min-h-[42px]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-md mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{customer ? "Edit Customer" : "Add Customer"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
            <input value={form.name} onChange={f("name")} required placeholder="Customer full name" className={inputCls} />
          </div>
          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => f("phone")({ target: { value: e.target.value.replace(/\D/g, "").slice(0, 10) } })}
              required
              maxLength={10}
              pattern="\d{10}"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              className={inputCls}
            />
            {form.phone && form.phone.length > 0 && form.phone.length < 10 && (
              <p className="text-xs text-slate-400 mt-1">{10 - form.phone.length} more digits needed</p>
            )}
          </div>
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input value={form.email} onChange={f("email")} placeholder="Email address" type="email" className={inputCls} />
          </div>

          {/* ── Structured Address ── */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Address *</label>
            <p className="text-[10px] text-slate-400 -mt-1">Fill what you know — society/area + city is enough for GPS to work.</p>

            {/* Row 1: Flat/House No */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Flat / House No.</label>
              <input value={form.flatNo} onChange={f("flatNo")} placeholder="e.g. B-204, House No. 12"
                className={inputCls} />
            </div>

            {/* Row 2: Society / Building */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Society / Building Name *</label>
              <input value={form.society} onChange={f("society")} placeholder="e.g. Shyam Residency, Green Park Society"
                className={inputCls} />
            </div>

            {/* Row 3: Area / Landmark */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Area / Landmark *</label>
              <input value={form.area} onChange={f("area")} placeholder="e.g. Satellite, Near Iscon Cross Road"
                className={inputCls} />
            </div>

            {/* Row 4: City + PIN side by side */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">City *</label>
                <input value={form.city} onChange={f("city")} placeholder="e.g. Ahmedabad"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">PIN Code</label>
                <input value={form.pin} onChange={f("pin")} placeholder="e.g. 380015" maxLength={6}
                  className={inputCls} />
              </div>
            </div>

            {/* Live preview */}
            {buildAddress(form) && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-700 leading-relaxed">{buildAddress(form)}</p>
              </div>
            )}
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Property Type</label>
            <div className="grid grid-cols-3 gap-2">
              {propertyTypes.map((t) => (
                <button key={t} type="button" onClick={() => setForm(p => ({ ...p, propertyType: t }))}
                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    form.propertyType === t
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={f("notes")} placeholder="Any additional notes..." rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none min-h-[42px]" />
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

function CustomerDetail({ customer, jobs, quotations, invoices, onEdit, onDelete, deleting, onCopyId }) {
  const Icon = propertyIcons[customer.propertyType] || Home;
  const portalCustomerId = customer.customerId || customer.id;
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
          <BadgeCheck className="w-3.5 h-3.5 text-[var(--brand)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer ID</span>
          <code className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{portalCustomerId}</code>
          <button
            type="button"
            onClick={() => onCopyId(portalCustomerId)}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-[var(--brand)]"
            title="Copy Customer ID"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
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
            <p className="text-lg sm:text-xl font-black text-slate-900">{s.value}</p>
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
        setSelected((current) => current || list[list.length - 1] || null);
      }),
      subscribeCollection("jobs", setJobs),
      subscribeCollection("quotations", setQuotations),
      subscribeCollection("invoices", setInvoices),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    const customersMissingId = customers.filter((customer) => !customer.customerId);
    if (customersMissingId.length === 0) return;

    Promise.all(customersMissingId.map(async (customer) => {
      await updateRecord("customers", customer.id, { customerId: customer.id });
      await updatePhoneMapping(customer.id, customer.phone);
    })).catch((error) => {
      console.error("Failed to assign customer IDs:", error);
      setMsg({ type: "error", text: "Some existing customer IDs could not be assigned." });
    });
  }, [customers]);

  const filtered = useMemo(() => {
    if (!search) return [...customers].reverse();
    const q = search.toLowerCase();
    return [...customers].reverse().filter(
      (c) => c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        (c.customerId || c.id)?.toLowerCase().includes(q)
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
        await updatePhoneMapping(editCustomer.id, form.phone, editCustomer.phone);
        showMsg("success", "Customer updated.");
      } else {
        const id = await createRecord("customers", form);
        await updateRecord("customers", id, { customerId: id });
        await updatePhoneMapping(id, form.phone);
        const newC = { id, customerId: id, ...form };
        setSelected(newC);
        showMsg("success", `Customer added. Customer ID: ${id}`);
      }
      setShowModal(false);
      setEditCustomer(null);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = async (customerId) => {
    try {
      await navigator.clipboard.writeText(customerId);
      showMsg("success", "Customer ID copied.");
    } catch {
      showMsg("error", "Could not copy Customer ID.");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}" and all linked data?`)) return;
    setDeleting(true);
    try {
      await removePhoneMapping(selected.id, selected.phone);
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-0.5">{customers.length} total customers in CRM</p>
        </div>
        <button
          onClick={() => { setEditCustomer(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm w-full sm:w-auto min-h-[44px] active:scale-95 sm:ml-auto"
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
              placeholder="Search name, phone, address, or Customer ID..."
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
                        <p className="text-[10px] font-semibold text-[var(--brand)] truncate">ID: {c.customerId || c.id}</p>
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
              onCopyId={handleCopyId}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
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
