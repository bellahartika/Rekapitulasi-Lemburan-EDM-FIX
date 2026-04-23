// @ts-nocheck
import { useState, useCallback } from "react";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) =>
    h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/ /g, "_")
  );
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

function mapRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k] || row[k.replace(/_/g, " ")] || row[k.replace(/ /g, "_")] || "";
      if (val) return val;
    }
    return "-";
  };
  return {
    nama:        get("nama_lengkap", "nama", "name", "full_name"),
    role:        get("role", "jabatan", "position"),
    div:         get("div", "divisi", "division", "department"),
    tim:         get("tim", "team"),
    tagihan:     get("tagihan", "tagihan_bulan", "billing"),
    bulan:       get("bulan", "month"),
    hari:        get("hari", "day"),
    tanggal:     get("tanggal_lembur", "tanggal", "date"),
    jam_mulai:   get("jam_mulai", "start_time", "mulai"),
    jam_selesai: get("jam_selesai", "end_time", "selesai"),
    total:       get("total", "total_jam", "jam_total", "hours"),
    usecase:     get("nama_use_case", "nama_use_case_/_nama_project", "project", "use_case"),
    kegiatan:    get("kegiatan", "kegiatan/task", "task", "activity"),
    alasan:      get("alasan_lembur", "alasan", "reason"),
    pic:         get("pic", "pic_(bri:_....._/_sv:_......)", "penanggung_jawab"),
    evidence:    get("evidence", "bukti"),
    lokasi:      get("lokasi_lembur", "lokasi", "location"),
  };
}

// Parse tanggal format dd/mm/yyyy or yyyy-mm-dd
function parseDate(str) {
  if (!str || str === "-") return null;
  const parts = str.includes("/") ? str.split("/") : str.split("-");
  if (parts.length !== 3) return null;
  let d, m, y;
  if (str.includes("/")) { [d, m, y] = parts; }
  else { [y, m, d] = parts; }
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return isNaN(date.getTime()) ? null : date;
}

function isDeployment(row) {
  return Object.values(row).some((v) =>
    String(v).toLowerCase().includes("deployment") ||
    String(v).toLowerCase().includes("deploy")
  );
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const DUMMY = [
  { nama: "Andi Pratama", role: "Backend Dev", div: "IT", tim: "Core", tagihan: "Internal", bulan: "April", hari: "Senin", tanggal: "07/04/2025", jam_mulai: "19:00", jam_selesai: "22:00", total: "3", usecase: "Payment Gateway", kegiatan: "Fix bug transaksi", alasan: "Deadline release", pic: "BRI: Budi / SV: Andi", evidence: "Screenshot Jira", lokasi: "WFH" },
  { nama: "Sari Dewi", role: "Frontend Dev", div: "IT", tim: "UI", tagihan: "External", bulan: "April", hari: "Selasa", tanggal: "15/04/2025", jam_mulai: "18:00", jam_selesai: "21:30", total: "3.5", usecase: "Dashboard Admin", kegiatan: "Deployment production v2.1", alasan: "Sprint review besok", pic: "BRI: Budi / SV: Sari", evidence: "Screenshot Figma", lokasi: "Kantor" },
  { nama: "Budi Santoso", role: "QA Engineer", div: "IT", tim: "QA", tagihan: "Internal", bulan: "April", hari: "Rabu", tanggal: "09/04/2025", jam_mulai: "20:00", jam_selesai: "23:00", total: "3", usecase: "Regression Testing", kegiatan: "Testing fitur baru", alasan: "UAT besok pagi", pic: "BRI: Citra / SV: Budi", evidence: "Test report", lokasi: "WFH" },
  { nama: "Rina Kusuma", role: "DevOps", div: "IT", tim: "Infra", tagihan: "Internal", bulan: "April", hari: "Kamis", tanggal: "11/04/2025", jam_mulai: "21:00", jam_selesai: "24:00", total: "3", usecase: "Infrastruktur", kegiatan: "Server deployment & monitoring", alasan: "Maintenance window", pic: "BRI: Eko / SV: Rina", evidence: "Deployment log", lokasi: "Kantor" },
  { nama: "Deni Wahyu", role: "Backend Dev", div: "IT", tim: "Core", tagihan: "External", bulan: "Mei", hari: "Jumat", tanggal: "02/05/2025", jam_mulai: "19:00", jam_selesai: "22:00", total: "3", usecase: "API Integration", kegiatan: "Fix timeout issue", alasan: "Go live besok", pic: "BRI: Budi / SV: Deni", evidence: "Postman log", lokasi: "WFH" },
];

const COLUMNS = [
  { key: "nama",        label: "Nama Lengkap" },
  { key: "role",        label: "Role" },
  { key: "div",         label: "Div" },
  { key: "tim",         label: "Tim" },
  { key: "tagihan",     label: "Tagihan" },
  { key: "bulan",       label: "Bulan" },
  { key: "hari",        label: "Hari" },
  { key: "tanggal",     label: "Tanggal Lembur" },
  { key: "jam_mulai",   label: "Jam Mulai" },
  { key: "jam_selesai", label: "Jam Selesai" },
  { key: "total",       label: "TOTAL" },
  { key: "usecase",     label: "Nama Use Case / Project" },
  { key: "kegiatan",    label: "Kegiatan/Task" },
  { key: "alasan",      label: "Alasan Lembur" },
  { key: "pic",         label: "PIC" },
  { key: "evidence",    label: "Evidence" },
  { key: "lokasi",      label: "Lokasi Lembur" },
];

const now = new Date();
const defaultMonth = now.getMonth(); // 0-indexed
const defaultYear = now.getFullYear();

export default function App() {
  const [rows, setRows] = useState(DUMMY);
  const [isDummy, setIsDummy] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [exportMsg, setExportMsg] = useState("");
  const [visibleCols, setVisibleCols] = useState(COLUMNS.map((c) => c.key));
  const [showColToggle, setShowColToggle] = useState(false);

  // Period filter state: bulan & tahun START (11th of that month)
  const [periodMonth, setPeriodMonth] = useState(defaultMonth); // 0-indexed
  const [periodYear, setPeriodYear]   = useState(defaultYear);
  const [usePeriod, setUsePeriod]     = useState(false);

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setRows(parsed.map(mapRow));
      setIsDummy(false);
      setSearch("");
      setSortKey(null);
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Period range: 11/periodMonth/periodYear ~ 10/nextMonth/nextYear
  const periodStart = new Date(periodYear, periodMonth, 11);
  const nextMonth   = (periodMonth + 1) % 12;
  const nextYear    = periodMonth === 11 ? periodYear + 1 : periodYear;
  const periodEnd   = new Date(nextYear, nextMonth, 10, 23, 59, 59);

  const periodLabel = `11 ${MONTHS[periodMonth]} ${periodYear} — 10 ${MONTHS[nextMonth]} ${nextYear}`;

  let filtered = rows.filter((r) => {
    const matchSearch = !search || Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
    if (!matchSearch) return false;
    if (!usePeriod) return true;
    const d = parseDate(r.tanggal);
    if (!d) return false;
    return d >= periodStart && d <= periodEnd;
  });

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const va = String(a[sortKey] || "").toLowerCase();
      const vb = String(b[sortKey] || "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const activeCols = COLUMNS.filter((c) => visibleCols.includes(c.key));
  const totalJam   = filtered.reduce((a, r) => a + (parseFloat(r.total) || 0), 0);
  const deployCount = filtered.filter(isDeployment).length;

  const exportCSV = () => {
    const header = activeCols.map((c) => c.label);
    const dataRows = filtered.map((r) => activeCols.map((c) => r[c.key] || "-"));
    const csv = "\uFEFF" + [header, ...dataRows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rekap_lembur.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setExportMsg("✓ CSV berhasil didownload!");
    setTimeout(() => setExportMsg(""), 3000);
  };

  const years = Array.from({ length: 5 }, (_, i) => defaultYear - 2 + i);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Mono', monospace", color: "#e8e6df" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 3px; }
        .drop-zone { border:1.5px dashed #2e3140; border-radius:10px; padding:10px 18px; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s; background:#13161f; }
        .drop-zone:hover, .drop-zone.drag-on { border-color:#a78bfa; background:#1a1428; }
        .stat-card { background:#13161f; border:1px solid #1e2130; border-radius:12px; padding:14px 18px; }
        .stat-card.deploy { border-color:#fb923c44; background:#1a1208; }
        .search-box { background:#13161f; border:1px solid #1e2130; color:#e8e6df; padding:8px 13px; border-radius:8px; font-family:'DM Mono',monospace; font-size:12px; outline:none; transition:border-color 0.2s; width:200px; }
        .search-box:focus { border-color:#a78bfa; }
        .select-box { background:#13161f; border:1px solid #1e2130; color:#e8e6df; padding:7px 10px; border-radius:7px; font-family:'DM Mono',monospace; font-size:11px; outline:none; cursor:pointer; }
        .select-box:focus { border-color:#a78bfa; }
        .btn { padding:7px 14px; border-radius:7px; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; transition:all 0.15s; border:1px solid; white-space:nowrap; }
        .btn-purple { background:#a78bfa18; border-color:#a78bfa44; color:#a78bfa; }
        .btn-purple:hover { background:#a78bfa30; }
        .btn-green { background:#6ee7b718; border-color:#6ee7b740; color:#6ee7b7; }
        .btn-green:hover { background:#6ee7b730; }
        .btn-orange { background:#fb923c18; border-color:#fb923c44; color:#fb923c; }
        .btn-orange:hover { background:#fb923c30; }
        .dummy-pill { background:#1a1f2e; border:1px solid #2a3050; border-radius:6px; padding:8px 14px; font-size:11px; color:#6272a4; display:flex; align-items:center; gap:8px; margin-bottom:16px; }
        .export-toast { position:fixed; bottom:24px; right:24px; background:#14211d; border:1px solid #6ee7b755; color:#6ee7b7; padding:10px 18px; border-radius:8px; font-size:12px; z-index:999; animation:fadeIn 0.3s ease; }
        .period-bar { background:#13161f; border:1px solid #1e2130; border-radius:10px; padding:12px 16px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:14px; }
        .period-active { border-color:#a78bfa44; background:#13111f; }
        .period-label { background:#a78bfa18; border:1px solid #a78bfa44; color:#a78bfa; padding:3px 12px; border-radius:20px; font-size:11px; }
        .tbl { width:100%; border-collapse:collapse; font-size:11px; }
        .tbl th { background:#13161f; border:1px solid #1e2130; padding:8px 10px; text-align:left; color:#6272a4; font-size:10px; letter-spacing:0.5px; cursor:pointer; white-space:nowrap; user-select:none; position:sticky; top:0; z-index:1; }
        .tbl th:hover { color:#a78bfa; }
        .tbl th.sort-active { color:#a78bfa; background:#13111f; }
        .tbl td { border:1px solid #1a1d2a; padding:8px 10px; vertical-align:top; color:#c8c6bf; }
        .tbl tr:hover td { background:#13161f; }
        .tbl tr:nth-child(even) td { background:#0d0f16; }
        .tbl tr.deploy-row td { background:#1a1208 !important; border-color:#fb923c22; }
        .tbl tr.deploy-row:hover td { background:#201608 !important; }
        .deploy-badge { display:inline-flex; align-items:center; gap:4px; background:#fb923c18; border:1px solid #fb923c55; color:#fb923c; padding:2px 8px; border-radius:12px; font-size:10px; margin-left:6px; }
        .col-toggle-wrap { background:#13161f; border:1px solid #1e2130; border-radius:10px; padding:12px 16px; margin-bottom:14px; }
        .col-chip { padding:3px 10px; border-radius:20px; font-size:10px; cursor:pointer; border:1px solid; transition:all 0.15s; user-select:none; display:inline-flex; margin:3px; }
        .col-chip.on { background:#a78bfa18; border-color:#a78bfa55; color:#a78bfa; }
        .col-chip.off { background:#1a1d2a; border-color:#2a2d3a; color:#4a4f6a; }
        .toggle-header { display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @media print {
          body { background:white !important; color:black !important; }
          .no-print { display:none !important; }
          .tbl th { background:#f3f4f6 !important; color:#374151 !important; border-color:#d1d5db !important; }
          .tbl td { color:#111827 !important; border-color:#e5e7eb !important; background:white !important; }
          .tbl tr:nth-child(even) td { background:#f9fafb !important; }
          .tbl tr.deploy-row td { background:#fff7ed !important; }
        }
      `}</style>

      {exportMsg && <div className="export-toast">{exportMsg}</div>}

      {/* Header */}
      <div className="no-print" style={{ borderBottom: "1px solid #1a1d2a", padding: "18px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(18px,3vw,32px)", letterSpacing: -2, lineHeight: 1 }}>LEMBUR</span>
            <span style={{ background: "#a78bfa18", border: "1px solid #a78bfa44", color: "#a78bfa", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>⬤ REKAP</span>
          </div>
          <label htmlFor="csvFile" style={{ cursor: "pointer" }}>
            <div className={`drop-zone${dragging ? " drag-on" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
              <span style={{ fontSize: 18 }}>📂</span>
              <div>
                <div style={{ fontSize: 11, color: "#a78bfa" }}>{isDummy ? "Upload CSV lembur" : "Ganti CSV"}</div>
                <div style={{ fontSize: 10, color: "#4a4f6a" }}>drag & drop atau klik</div>
              </div>
            </div>
            <input id="csvFile" type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) processFile(e.target.files[0]); }} />
          </label>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "20px 28px" }}>
        {isDummy && (
          <div className="dummy-pill no-print">
            <span>👁</span>
            <span>Menampilkan <strong style={{ color: "#8892b0" }}>data contoh</strong> — upload CSV kamu untuk melihat data asli</span>
          </div>
        )}

        {/* Stats */}
        <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { label: "TOTAL ENTRI", value: filtered.length, color: "#e8e6df" },
            { label: "KARYAWAN", value: new Set(filtered.map((r) => r.nama)).size, color: "#a78bfa" },
            { label: "TOTAL JAM", value: totalJam.toFixed(1), color: "#6ee7b7" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ color: "#4a4f6a", fontSize: 10, marginTop: 2, letterSpacing: "0.6px" }}>{s.label}</div>
            </div>
          ))}
          <div className="stat-card deploy">
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#fb923c" }}>{deployCount}</div>
            <div style={{ color: "#7a4a20", fontSize: 10, marginTop: 2, letterSpacing: "0.6px" }}>🚀 DEPLOYMENT</div>
          </div>
        </div>

        {/* Period Filter */}
        <div className={`period-bar no-print${usePeriod ? " period-active" : ""}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: usePeriod ? "#a78bfa" : "#4a4f6a" }}>
              <input type="checkbox" checked={usePeriod} onChange={(e) => setUsePeriod(e.target.checked)}
                style={{ accentColor: "#a78bfa", width: 14, height: 14 }} />
              FILTER PERIODE TAGIHAN
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#4a4f6a" }}>Mulai bulan:</span>
            <select className="select-box" value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))} disabled={!usePeriod} style={{ opacity: usePeriod ? 1 : 0.4 }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select className="select-box" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} disabled={!usePeriod} style={{ opacity: usePeriod ? 1 : 0.4 }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {usePeriod && (
            <span className="period-label">📅 {periodLabel}</span>
          )}
          {usePeriod && (
            <span style={{ fontSize: 11, color: "#4a4f6a" }}>{filtered.length} entri</span>
          )}
        </div>

        {/* Column toggle */}
        <div className="col-toggle-wrap no-print">
          <div className="toggle-header" onClick={() => setShowColToggle((v) => !v)}>
            <span style={{ fontSize: 10, color: "#4a4f6a", letterSpacing: "0.6px" }}>TAMPILKAN KOLOM ({visibleCols.length}/{COLUMNS.length})</span>
            <span style={{ color: "#4a4f6a", fontSize: 12 }}>{showColToggle ? "▲" : "▼"}</span>
          </div>
          {showColToggle && (
            <div style={{ marginTop: 10 }}>
              {COLUMNS.map((c) => (
                <span key={c.key} className={`col-chip ${visibleCols.includes(c.key) ? "on" : "off"}`} onClick={() => {
                  setVisibleCols((prev) => prev.includes(c.key) ? prev.filter((k) => k !== c.key) : [...prev, c.key]);
                }}>
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <input className="search-box" placeholder="🔍  Cari semua kolom..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {sortKey && (
            <span style={{ fontSize: 11, color: "#4a4f6a" }}>
              Urut: <span style={{ color: "#a78bfa" }}>{COLUMNS.find((c) => c.key === sortKey)?.label}</span> {sortDir === "asc" ? "↑" : "↓"}
              <button onClick={() => setSortKey(null)} style={{ marginLeft: 8, background: "none", border: "1px solid #2a2d3a", color: "#4a4f6a", padding: "2px 8px", borderRadius: 5, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 10 }}>reset</button>
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-green" onClick={exportCSV}>↓ Export CSV</button>
            <button className="btn btn-orange" onClick={() => window.print()}>🖨 Print / PDF</button>
          </div>
        </div>

        {/* Deploy legend */}
        {deployCount > 0 && (
          <div className="no-print" style={{ marginBottom: 8, fontSize: 11, color: "#7a4a20", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "#fb923c18", border: "1px solid #fb923c44", borderRadius: 4, padding: "2px 8px", color: "#fb923c" }}>🚀</span>
            <span>{deployCount} entri mengandung deployment — baris di-highlight</span>
          </div>
        )}

        {/* Print header */}
        <style>{`@media print { .print-header { display:block !important; } }`}</style>
        <div className="print-header" style={{ display: "none", marginBottom: 16, fontFamily: "sans-serif" }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Rekap Lembur</h2>
          {usePeriod && <p style={{ fontSize: 12, color: "#6b7280" }}>Periode: {periodLabel}</p>}
          <p style={{ fontSize: 12, color: "#6b7280" }}>Total entri: {filtered.length} · Total jam: {totalJam.toFixed(1)} jam · Deployment: {deployCount}</p>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #1e2130" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th className="no-print" style={{ width: 36, textAlign: "center" }}>#</th>
                {activeCols.map((c) => (
                  <th key={c.key} className={sortKey === c.key ? "sort-active" : ""} onClick={() => handleSort(c.key)}>
                    {c.label} {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={activeCols.length + 1} style={{ textAlign: "center", padding: 32, color: "#4a4f6a" }}>Tidak ada data ditemukan</td></tr>
              ) : (
                filtered.map((r, i) => {
                  const deploy = isDeployment(r);
                  return (
                    <tr key={i} className={deploy ? "deploy-row" : ""}>
                      <td className="no-print" style={{ textAlign: "center", color: "#4a4f6a", fontSize: 10 }}>{i + 1}</td>
                      {activeCols.map((c) => (
                        <td key={c.key} style={{
                          color: c.key === "total" ? "#6ee7b7" : c.key === "nama" ? (deploy ? "#fb923c" : "#e8e6df") : undefined,
                          fontWeight: c.key === "nama" ? 500 : undefined,
                          whiteSpace: ["kegiatan", "alasan", "pic", "evidence", "usecase"].includes(c.key) ? "normal" : "nowrap",
                          maxWidth: ["kegiatan", "alasan", "pic", "evidence", "usecase"].includes(c.key) ? 180 : undefined,
                        }}>
                          {c.key === "nama" && deploy
                            ? <>{r[c.key] || "-"}<span className="deploy-badge no-print">🚀 deploy</span></>
                            : r[c.key] || "-"
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="no-print" style={{ marginTop: 16, color: "#252838", fontSize: 10, borderTop: "1px solid #161926", paddingTop: 12 }}>
          Kolom CSV: nama_lengkap, role, div, tim, tagihan, bulan, hari, tanggal_lembur, jam_mulai, jam_selesai, total, nama_use_case, kegiatan, alasan_lembur, pic, evidence, lokasi_lembur
        </div>
      </div>
    </div>
  );
}
