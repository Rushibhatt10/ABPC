import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO, toDateObject } from "../utils/format";
import { isDriveUploadConfigured, uploadFileToDrive } from "../utils/driveUpload";
import { BarChart3, TrendingUp, Users, Briefcase, IndianRupee, CheckCircle2, Clock, Award, Calendar, Download, UploadCloud } from "lucide-react";
import { EmployeeS } from "../constants/authProfiles";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";

const saveAs = FileSaver.saveAs || FileSaver;
const CURRENCY_FORMAT = '"₹"#,##0.00';

const toISODate = (value) => {
  const date = toDateObject(value);
  if (!date) return "";
  return date.toISOString().split("T")[0];
};

const dateInRange = (value, from, to) => {
  const iso = toISODate(value);
  if (!iso) return from === "2020-01-01";
  return iso >= from && iso <= to;
};

const joinItemNames = (items = []) => items.map((item) => item.itemName || item.serviceName || item.name).filter(Boolean).join(", ");

const sumItems = (items = [], key) => items.reduce((sum, item) => sum + Number(item[key] || 0), 0);

const isCompleted = (status) => String(status || "").toLowerCase() === "completed";
const isCancelled = (status) => String(status || "").toLowerCase() === "cancelled";
const isResolved = (status) => String(status || "").toLowerCase() === "resolved";

const REPORT_OPTIONS = [
  { key: "customers", label: "Customers" },
  { key: "leads", label: "Leads / Enquiries" },
  { key: "jobs", label: "Jobs / Service Visits" },
  { key: "quotations", label: "Quotations" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "amc", label: "AMC Contracts" },
  { key: "amcVisits", label: "AMC Visits" },
  { key: "complaints", label: "Complaints / Feedback" },
  { key: "employees", label: "Employees / Technicians" },
  { key: "attendance", label: "Attendance" },
  { key: "services", label: "Services" },
];

function appendJsonSheet(wb, name, rows) {
  if (!rows.length) return false;
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!autofilter"] = { ref: ws["!ref"] || "A1" };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (headerCell) headerCell.s = { font: { bold: true } };
  }
  ws["!cols"] = Object.keys(rows[0] || {}).map((header) => ({
    wch: Math.min(42, Math.max(String(header).length + 2, ...rows.map((row) => String(row[header] ?? "").length + 2))),
  }));
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
      const header = Object.keys(rows[0] || {})[col] || "";
      if (cell && typeof cell.v === "number" && /(amount|gst|value|paid|received|outstanding|subtotal|discount|balance|price|revenue)/i.test(header)) {
        cell.z = CURRENCY_FORMAT;
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  return true;
}

const buildFileName = (from, to, complete) => {
  const fmt = (iso) => {
    const [year, month, day] = String(iso).split("-");
    return `${day}-${month}-${year}`;
  };
  const today = fmt(getTodayISO());
  if (complete && from === "2020-01-01" && to === getTodayISO()) return `AB_Pest_Control_Complete_Report_${today}.xlsx`;
  return `AB_Pest_Control_Report_${fmt(from)}_to_${fmt(to)}.xlsx`;
};

function MiniBar({ value, max, color = "bg-[var(--brand)]" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { isEmployee } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reports, setReports] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [services, setServices] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [exportMsg, setExportMsg] = useState({ type: "", text: "" });
  const [exportBusy, setExportBusy] = useState(false);
  const [selectedReports, setSelectedReports] = useState(() => Object.fromEntries(REPORT_OPTIONS.map((option) => [option.key, true])));

  // Date range filter — default: last 30 days
  const today = getTodayISO();
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today);
  const [rangeLabel, setRangeLabel] = useState("30d");

  const RANGES = [
    { label: "7d",   days: 7 },
    { label: "30d",  days: 30 },
    { label: "90d",  days: 90 },
    { label: "1yr",  days: 365 },
    { label: "All",  days: null },
  ];

  const applyRange = (days) => {
    if (days === null) {
      setDateFrom("2020-01-01");
      setDateTo(today);
    } else {
      const from = new Date(); from.setDate(from.getDate() - days);
      setDateFrom(from.toISOString().split("T")[0]);
      setDateTo(today);
    }
  };

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("jobs", setJobs),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("jobReports", setReports),
      subscribeCollection("quotations", setQuotations),
      subscribeCollection("amc", setAmcs),
      subscribeCollection("complaints", setComplaints),
      subscribeCollection("services", setServices),
      subscribeCollection("attendance", setAttendance),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Filter invoices and jobs by date range
  const filteredInvoices = useMemo(() =>
    invoices.filter(i => {
      const d = String(i.date || "");
      return d >= dateFrom && d <= dateTo;
    }), [invoices, dateFrom, dateTo]);

  const filteredJobs = useMemo(() =>
    jobs.filter(j => {
      const d = String(j.scheduledDate || j.createdAt?.toDate?.()?.toISOString?.()?.split("T")[0] || "");
      return d >= dateFrom && d <= dateTo;
    }), [jobs, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((s, i) => s + Number(i.received || 0), 0);
    const pendingRevenue = filteredInvoices.reduce((s, i) => s + Number(i.balance || 0), 0);
    const completedJobs = filteredJobs.filter((j) => j.status === "completed").length;
    const pendingJobs = filteredJobs.filter((j) => j.status !== "completed").length;
    const paidInvoices = filteredInvoices.filter((i) => Number(i.balance || 0) === 0).length;
    const collectionRate = filteredInvoices.length > 0 ? Math.round((paidInvoices / filteredInvoices.length) * 100) : 0;
    return { totalRevenue, pendingRevenue, completedJobs, pendingJobs, paidInvoices, collectionRate };
  }, [filteredInvoices, filteredJobs]);

  // Employee performance
  const EmployeeStats = useMemo(() => {
    return EmployeeS.map((w) => {
      const EmployeeJobs = filteredJobs.filter((j) => Array.isArray(j.assignedTo) ? j.assignedTo.includes(w) : j.assignedTo === w);
      const completed = EmployeeJobs.filter((j) => j.status === "completed").length;
      const EmployeeReports = reports.filter((r) => r.EmployeeName === w).length;
      return { name: w, total: EmployeeJobs.length, completed, reports: EmployeeReports };
    });
  }, [filteredJobs, reports]);

  const maxEmployeeJobs = Math.max(...EmployeeStats.map((w) => w.total), 1);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const map = new Map();
    filteredJobs.forEach((j) => {
      const key = j.serviceType || j.serviceName || "Other";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredJobs]);

  const maxServiceCount = Math.max(...serviceBreakdown.map((s) => s[1]), 1);

  // Monthly revenue (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short" });
      const revenue = filteredInvoices
        .filter((inv) => String(inv.date || "").startsWith(key))
        .reduce((s, inv) => s + Number(inv.received || 0), 0);
      months.push({ key, label, revenue });
    }
    return months;
  }, [filteredInvoices]);

  const maxMonthRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  const reportData = useMemo(() => {
    const jobsInRange = jobs.filter((job) => dateInRange(job.scheduledDate || job.createdAt, dateFrom, dateTo));
    const invoicesInRange = invoices.filter((invoice) => dateInRange(invoice.date || invoice.createdAt, dateFrom, dateTo));
    const quotationsInRange = quotations.filter((quotation) => dateInRange(quotation.date || quotation.createdAt, dateFrom, dateTo));
    const amcsInRange = amcs.filter((amc) => dateInRange(amc.startDate || amc.createdAt, dateFrom, dateTo));
    const complaintsInRange = complaints.filter((complaint) => dateInRange(complaint.createdAt, dateFrom, dateTo));
    const attendanceInRange = attendance.filter((record) => dateInRange(record.timestamp || record.createdAt, dateFrom, dateTo));
    const reportsInRange = reports.filter((report) => dateInRange(report.timestamp || report.createdAt, dateFrom, dateTo));

    const customerRows = customers.filter((customer) => dateInRange(customer.createdAt, dateFrom, dateTo) || dateFrom === "2020-01-01").map((customer) => {
      const customerJobs = jobs.filter((job) => job.customerId === customer.id);
      const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id);
      const customerAmc = amcs.find((amc) => amc.customerId === customer.id && amc.status === "Active");
      return {
        "Customer ID": customer.customerId || customer.id,
        "Customer Name": customer.name || customer.customerName || "",
        "Company Name": customer.companyName || "",
        "Phone": customer.phone || customer.customerPhone || "",
        "Email": customer.email || "",
        "Address": customer.address || "",
        "City": customer.city || "",
        "GST Number": customer.gstNumber || customer.gstin || "",
        "Customer Type": customer.customerType || customer.propertyType || "",
        "Total Jobs": customerJobs.length,
        "Total Invoice Amount": customerInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
        "Amount Paid": customerInvoices.reduce((sum, invoice) => sum + Number(invoice.received || 0), 0),
        "Outstanding Amount": customerInvoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0),
        "AMC Status": customerAmc?.status || "No AMC",
        "Created Date": formatDateDisplay(customer.createdAt),
      };
    });

    const jobRows = jobsInRange.map((job) => {
      const invoice = invoices.find((item) => item.id === job.invoiceId || item.jobId === job.id || item.jobIds?.includes?.(job.id));
      return {
        "Job ID": job.jobNumber || job.id,
        "Customer": job.customerName || "",
        "Service": job.serviceType || job.serviceName || job.treatmentLabel || "",
        "Address": job.address || job.customerAddress || "",
        "Assigned Technician": Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : (job.assignedTo || ""),
        "Job Date": formatDateDisplay(job.scheduledDate),
        "Time": job.scheduledTime || job.time || "",
        "Status": job.status || "",
        "Job Amount": Number(job.finalPrice || job.totalAmount || 0),
        "Payment Status": invoice?.status || (invoice ? "Pending" : "Not Invoiced"),
        "Invoice ID": invoice?.invoiceNumber || job.invoiceId || "",
        "AMC/Non-AMC": job.amcId ? "AMC" : "Non-AMC",
        "Created Date": formatDateDisplay(job.createdAt),
        "Completed Date": formatDateDisplay(job.completedAt),
      };
    });

    const quotationRows = quotationsInRange.map((quotation) => ({
      "Quotation Number": quotation.estimateNumber || quotation.quotationNumber || quotation.id,
      "Customer": quotation.customerName || "",
      "Date": formatDateDisplay(quotation.date),
      "Service": joinItemNames(quotation.items),
      "Subtotal": Number(quotation.totalAmount || 0),
      "Discount": sumItems(quotation.items, "discount"),
      "GST": Number(quotation.gst || 0),
      "Total Amount": Number(quotation.totalAmount || 0),
      "Status": quotation.status || "",
      "Converted to Invoice": quotation.status === "Converted to Invoice" ? "Yes" : "No",
      "Invoice Number": invoices.find((invoice) => invoice.fromQuotation === quotation.estimateNumber)?.invoiceNumber || "",
    }));

    const invoiceRows = invoicesInRange.map((invoice) => ({
      "Invoice Number": invoice.invoiceNumber || invoice.id,
      "Customer": invoice.customerName || "",
      "Invoice Date": formatDateDisplay(invoice.date),
      "Service/Job": joinItemNames(invoice.items),
      "Taxable Amount": Number(invoice.subtotal || 0),
      "GST": Number(invoice.gst || 0),
      "Total Amount": Number(invoice.total || 0),
      "Paid Amount": Number(invoice.received || 0),
      "Outstanding Amount": Number(invoice.balance || 0),
      "Payment Status": invoice.status || "",
      "Payment Date": formatDateDisplay(invoice.lastPaymentAt),
    }));

    const paymentRows = invoicesInRange.flatMap((invoice) => {
      const history = invoice.paymentHistory?.length ? invoice.paymentHistory : Number(invoice.received || 0) > 0 ? [{
        amount: Number(invoice.received || 0),
        mode: invoice.paymentMode || "",
        at: invoice.lastPaymentAt || invoice.date,
        receivedIn: invoice.lastReceivedIn || invoice.receivedIn || "",
      }] : [];
      return history.map((payment, index) => ({
        "Payment ID": `${invoice.invoiceNumber || invoice.id}-${index + 1}`,
        "Customer": invoice.customerName || "",
        "Invoice Number": invoice.invoiceNumber || "",
        "Payment Date": formatDateDisplay(payment.at),
        "Amount": Number(payment.amount || 0),
        "Payment Method": payment.mode || invoice.paymentMode || "",
        "Transaction/Reference ID": payment.referenceId || payment.transactionId || "",
        "Receiving Account": payment.receivedIn || payment.bankName || "",
        "Payment Status": invoice.status || "",
        "Notes": payment.note || "",
      }));
    });

    const amcRows = amcsInRange.map((amc) => {
      const completedVisits = (amc.visitLog || []).length;
      const visits = Number(amc.visits || 0);
      return {
        "AMC ID": amc.id,
        "Customer": amc.customerName || "",
        "Package/Service": joinItemNames(amc.services),
        "Start Date": formatDateDisplay(amc.startDate),
        "End Date": formatDateDisplay(amc.endDate),
        "Contract Value": Number(amc.totalAmount || 0),
        "Number of Visits": visits,
        "Completed Visits": completedVisits,
        "Remaining Visits": Math.max(0, visits - completedVisits),
        "Next Visit Date": "",
        "AMC Status": amc.status || "",
        "Payment Status": Number(amc.balanceAmount || 0) > 0 ? "Pending" : "Paid",
      };
    });

    const amcVisitRows = amcs.flatMap((amc) => (amc.visitLog || []).filter((visit) => dateInRange(visit.date || visit.loggedAt, dateFrom, dateTo)).map((visit, index) => ({
      "AMC ID": amc.id,
      "Customer": amc.customerName || "",
      "Visit No": index + 1,
      "Visit Date": formatDateDisplay(visit.date),
      "Logged At": formatDateDisplay(visit.loggedAt),
      "Notes": visit.notes || "",
      "Status": "Completed",
    })));

    const complaintRows = complaintsInRange.map((complaint) => ({
      "Complaint ID": complaint.id,
      "Customer": complaint.customerName || "",
      "Job ID": complaint.jobNumber || complaint.linkedJobId || "",
      "Service": complaint.serviceType || "",
      "Type": complaint.complaintType || "",
      "Status": complaint.status || "",
      "Description": complaint.description || "",
      "Resolution": complaint.resolution || "",
      "Created Date": formatDateDisplay(complaint.createdAt),
      "Updated Date": formatDateDisplay(complaint.updatedAt),
    }));

    const summaryRows = [
      { "Metric": "Total Customers", "Value": customers.length },
      { "Metric": "New Customers", "Value": customerRows.length },
      { "Metric": "Total Leads", "Value": 0 },
      { "Metric": "Total Jobs", "Value": jobsInRange.length },
      { "Metric": "Completed Jobs", "Value": jobsInRange.filter((job) => isCompleted(job.status)).length },
      { "Metric": "Pending Jobs", "Value": jobsInRange.filter((job) => !isCompleted(job.status) && !isCancelled(job.status)).length },
      { "Metric": "Cancelled Jobs", "Value": jobsInRange.filter((job) => isCancelled(job.status)).length },
      { "Metric": "Total Quotations", "Value": quotationsInRange.length },
      { "Metric": "Quotation Value", "Value": quotationsInRange.reduce((sum, quotation) => sum + Number(quotation.totalAmount || 0), 0) },
      { "Metric": "Accepted Quotations", "Value": quotationsInRange.filter((quotation) => quotation.status === "Converted to Invoice").length },
      { "Metric": "Total Invoices", "Value": invoicesInRange.length },
      { "Metric": "Total Invoice Amount", "Value": invoicesInRange.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0) },
      { "Metric": "Total GST", "Value": invoicesInRange.reduce((sum, invoice) => sum + Number(invoice.gst || 0), 0) },
      { "Metric": "Total Payments Received", "Value": invoicesInRange.reduce((sum, invoice) => sum + Number(invoice.received || 0), 0) },
      { "Metric": "Outstanding Amount", "Value": invoicesInRange.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0) },
      { "Metric": "Pending Payments", "Value": invoicesInRange.filter((invoice) => Number(invoice.balance || 0) > 0).length },
      { "Metric": "Active AMCs", "Value": amcs.filter((amc) => amc.status === "Active").length },
      { "Metric": "Expired AMCs", "Value": amcs.filter((amc) => amc.status === "Expired" || (amc.endDate && toISODate(amc.endDate) < getTodayISO())).length },
      { "Metric": "Upcoming AMC Visits", "Value": amcs.filter((amc) => amc.status === "Active").length },
      { "Metric": "Total Complaints", "Value": complaintsInRange.length },
      { "Metric": "Resolved Complaints", "Value": complaintsInRange.filter((complaint) => isResolved(complaint.status)).length },
    ];

    return {
      summary: summaryRows,
      customers: customerRows,
      leads: [],
      jobs: jobRows,
      quotations: quotationRows,
      invoices: invoiceRows,
      payments: paymentRows,
      amc: amcRows,
      amcVisits: amcVisitRows,
      complaints: complaintRows,
      employees: EmployeeS.map((name) => ({ "Employee / Technician": name, "Assigned Jobs": jobsInRange.filter((job) => Array.isArray(job.assignedTo) ? job.assignedTo.includes(name) : job.assignedTo === name).length, "Submitted Reports": reportsInRange.filter((report) => (report.employeeName || report.EmployeeName) === name).length })),
      attendance: attendanceInRange.map((record) => ({ "Employee": record.employeeName || "", "Job ID": record.jobId || "", "Customer": record.customerName || "", "Check In": formatDateDisplay(record.timestamp || record.createdAt), "Latitude": record.latitude || record.location?.lat || "", "Longitude": record.longitude || record.location?.lng || "", "Notes": record.notes || "" })),
      services: services.map((service) => ({ "Service": service.name || service.label || service.serviceName || service.itemName || "", "Category": service.category || "", "Unit": service.unit || "", "Price": Number(service.price || service.basePrice || 0), "Warranty": service.warranty || service.warrantyPeriod || "", "Status": service.status || "" })),
    };
  }, [customers, jobs, invoices, reports, quotations, amcs, complaints, services, attendance, dateFrom, dateTo]);

  const setQuickExportRange = (key) => {
    const now = new Date();
    let from = new Date(now);
    let to = new Date(now);
    if (key === "today") {
      from = now;
    } else if (key === "week") {
      from.setDate(now.getDate() - now.getDay());
    } else if (key === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (key === "lastMonth") {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (key === "financialYear") {
      const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      from = new Date(startYear, 3, 1);
    } else {
      setDateFrom("2020-01-01");
      setDateTo(today);
      setRangeLabel("custom");
      return;
    }
    setDateFrom(toISODate(from));
    setDateTo(toISODate(to));
    setRangeLabel("custom");
  };

  const createWorkbook = (keys, complete = false) => {
    const wb = XLSX.utils.book_new();
    appendJsonSheet(wb, "Dashboard Summary", reportData.summary);
    const sheetMap = {
      customers: ["Customers", reportData.customers],
      leads: ["Leads", reportData.leads],
      jobs: ["Jobs", reportData.jobs],
      quotations: ["Quotations", reportData.quotations],
      invoices: ["Invoices", reportData.invoices],
      payments: ["Payments", reportData.payments],
      amc: ["AMC Contracts", reportData.amc],
      amcVisits: ["AMC Visits", reportData.amcVisits],
      complaints: ["Complaints", reportData.complaints],
      employees: ["Employees", reportData.employees],
      attendance: ["Attendance", reportData.attendance],
      services: ["Services", reportData.services],
    };
    keys.forEach((key) => appendJsonSheet(wb, sheetMap[key]?.[0] || key, sheetMap[key]?.[1] || []));
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    const fileName = buildFileName(dateFrom, dateTo, complete);
    return new File([excelBuffer], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  };

  const handleExport = async ({ complete = false, drive = false } = {}) => {
    const keys = complete ? REPORT_OPTIONS.map((option) => option.key) : REPORT_OPTIONS.filter((option) => selectedReports[option.key]).map((option) => option.key);
    if (!keys.length) {
      setExportMsg({ type: "error", text: "Select at least one report." });
      return;
    }
    setExportBusy(true);
    try {
      const file = createWorkbook(keys, complete);
      if (drive) {
        if (!isDriveUploadConfigured()) {
          setExportMsg({ type: "error", text: "Google Drive export is not configured in this build." });
          return;
        }
        await uploadFileToDrive({ file, fileName: file.name, mimeType: file.type, target: "reports", metadata: { module: "analytics", from: dateFrom, to: dateTo, complete } });
        setExportMsg({ type: "success", text: "Report generated and saved to Google Drive successfully." });
        return;
      }
      saveAs(file, file.name);
      setExportMsg({ type: "success", text: "Report generated successfully." });
    } catch (error) {
      setExportMsg({ type: "error", text: error.message || "Report generation failed." });
    } finally {
      setExportBusy(false);
      setTimeout(() => setExportMsg({ type: "", text: "" }), 4000);
    }
  };

  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-0.5">Business performance overview</p>
        </div>
        {/* Date range controls */}
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          {RANGES.map(r => (
            <button key={r.label} onClick={() => { applyRange(r.days); setRangeLabel(r.label); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={rangeLabel === r.label
                ? { background: "var(--brand)", color: "#fff" }
                : { background: "rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", color: "#64748b" }}>
              {r.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setRangeLabel("custom"); }}
              className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-[var(--brand)] focus:outline-none" />
            <span className="text-slate-400 text-xs">→</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setRangeLabel("custom"); }}
              className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-[var(--brand)] focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <h2 className="font-black text-slate-900">Reports & Export</h2>
            <p className="text-sm text-slate-500 mt-1">Download complete business records and operational reports in Excel format.</p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">From Date</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => { setDateFrom(event.target.value); setRangeLabel("custom"); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">To Date</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => { setDateTo(event.target.value); setRangeLabel("custom"); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["today", "Today"],
                ["week", "This Week"],
                ["month", "This Month"],
                ["lastMonth", "Last Month"],
                ["financialYear", "This Financial Year"],
                ["all", "All Time"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQuickExportRange(key)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={REPORT_OPTIONS.every((option) => selectedReports[option.key])}
                  onChange={(event) => setSelectedReports(Object.fromEntries(REPORT_OPTIONS.map((option) => [option.key, event.target.checked])))}
                  className="w-4 h-4 accent-[var(--brand)]"
                />
                Select All Reports
              </label>
              {REPORT_OPTIONS.map((option) => (
                <label key={option.key} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedReports[option.key])}
                    onChange={(event) => setSelectedReports((prev) => ({ ...prev, [option.key]: event.target.checked }))}
                    className="w-4 h-4 accent-[var(--brand)]"
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exportBusy}
                onClick={() => handleExport()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Selected Reports
              </button>
              <button
                type="button"
                disabled={exportBusy}
                onClick={() => handleExport({ complete: true })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Complete Business Report
              </button>
              <button
                type="button"
                disabled={exportBusy}
                onClick={() => handleExport({ complete: true, drive: true })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                Save to Drive
              </button>
            </div>

            {exportMsg.text && (
              <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
                exportMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
              }`}>
                {exportMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
          { label: "Pending Revenue", value: formatCurrency(stats.pendingRevenue), icon: Clock, color: "bg-amber-50 border-amber-100 text-amber-700" },
          { label: "Total Customers", value: customers.length, icon: Users, color: "bg-blue-50 border-blue-100 text-blue-700" },
          { label: "Jobs Completed", value: stats.completedJobs, icon: CheckCircle2, color: "bg-violet-50 border-violet-100 text-violet-700" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl border p-4 sm:p-5 ${s.color}`}>
              <Icon className="w-5 h-5 mb-2 opacity-70" />
              <p className="text-xl sm:text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h2 className="font-bold text-slate-800 mb-5">Monthly Revenue (Last 6 Months)</h2>
          <div className="space-y-3">
            {monthlyRevenue.map((m) => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 w-8 flex-shrink-0">{m.label}</span>
                <div className="flex-1">
                  <MiniBar value={m.revenue} max={maxMonthRevenue} color="bg-[var(--brand)]" />
                </div>
                <span className="text-xs font-bold text-slate-700 w-20 text-right flex-shrink-0">{formatCurrency(m.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-[var(--brand)]" />
            <h2 className="font-bold text-slate-800">Employee Performance</h2>
          </div>
          <div className="space-y-4">
            {EmployeeStats.map((w) => (
              <div key={w.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] text-xs font-black">
                      {w.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{w.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-emerald-600 font-bold">{w.completed} done</span>
                    <span>{w.total} total</span>
                    <span>{w.reports} reports</span>
                  </div>
                </div>
                <MiniBar value={w.completed} max={maxEmployeeJobs} color="bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h2 className="font-bold text-slate-800 mb-5">Top Services</h2>
          <div className="space-y-3">
            {serviceBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No job data yet</p>
            ) : (
              serviceBreakdown.map(([service, count]) => (
                <div key={service} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 flex-1 truncate">{service}</span>
                  <div className="w-32">
                    <MiniBar value={count} max={maxServiceCount} color="bg-blue-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-6 text-right flex-shrink-0">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h2 className="font-bold text-slate-800 mb-5">Business Summary</h2>
          <div className="space-y-3">
            {[
              { label: "Total Customers", value: customers.length, icon: Users },
              { label: "Jobs in Range", value: filteredJobs.length, icon: Briefcase },
              { label: "Completed Jobs", value: stats.completedJobs, icon: CheckCircle2 },
              { label: "Pending Jobs", value: stats.pendingJobs, icon: Clock },
              { label: "Invoices in Range", value: filteredInvoices.length, icon: IndianRupee },
              { label: "Collection Rate", value: `${stats.collectionRate}%`, icon: TrendingUp },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{s.label}</span>
                  </div>
                  <span className="font-bold text-slate-900">{s.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
