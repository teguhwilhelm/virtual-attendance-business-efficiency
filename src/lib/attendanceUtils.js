import React from "react";

export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinRadius(userLat, userLng, locLat, locLng, radiusMeters) {
  const dist = calculateDistance(userLat, userLng, locLat, locLng);
  return { within: dist <= radiusMeters, distance: Math.round(dist) };
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(err.message || "Unable to retrieve your location.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return null;
  const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  if (isNaN(diffMs) || diffMs < 0) return null;
  return (diffMs / (1000 * 60 * 60)).toFixed(2);
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format tanggal YYYY-MM-DD dalam timezone lokal (WIB), bukan UTC
function localDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return localDateISO(new Date());
}

export function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateISO(d);
}

export function getDayName(date) {
  return new Date(date).toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
}

export function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 6);
  return {
    start: localDateISO(monday),
    end: localDateISO(friday),
  };
}

export function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: localDateISO(start),
    end: localDateISO(end),
  };
}

export function exportToExcel(filename, headers, rows, sheetName = "Sheet1") {
  import("xlsx").then((XLSX) => {
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  });
}

export function exportToPDF(title, headers, rows, subtitle) {
  // Dynamic import to keep initial bundle smaller
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 80);
    doc.text(title, 14, y);

    if (subtitle) {
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(subtitle, 14, y);
    }

    y += 8;
    doc.setDrawColor(220, 220, 230);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    const colWidth = (pageWidth - 28) / headers.length;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.setFillColor(240, 240, 248);
    doc.rect(14, y - 5, pageWidth - 28, 7, "F");
    headers.forEach((h, i) => {
      doc.text(String(h).substring(0, 30), 14 + i * colWidth, y);
    });
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    rows.forEach((row, ri) => {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 18;
      }
      if (ri % 2 === 0) {
        doc.setFillColor(248, 248, 252);
        doc.rect(14, y - 5, pageWidth - 28, 7, "F");
      }
      row.forEach((cell, i) => {
        doc.text(String(cell ?? "").substring(0, 30), 14 + i * colWidth, y);
      });
      y += 7;
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by Vibe — ${new Date().toLocaleString()}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.save(`${title}.pdf`);
  });
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case "present":
      return "bg-emerald-100 text-emerald-700";
    case "late":
      return "bg-amber-100 text-amber-700";
    case "absent":
      return "bg-rose-100 text-rose-700";
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "inactive":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}