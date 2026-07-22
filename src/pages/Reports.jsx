import React, { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { exportToExcel, exportToPDF, formatDate, formatTime, calculateHours, todayISO, getWeekRange, getMonthRange, getStatusBadgeClass } from "@/lib/attendanceUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileSpreadsheet, TrendingUp, Clock, UserX, CheckCircle2, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

export default function Reports() {
  const { isAdmin } = useCurrentUser();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [range, setRange] = useState("week"); // week | month | all
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const emps = await base44.entities.Employee.list();
      setEmployees(emps || []);

      let allRecords = [];
      const today = todayISO();
      if (range === "week") {
        const { start, end } = getWeekRange();
        allRecords = await base44.entities.AttendanceRecord.list("-date", 500);
        allRecords = (allRecords || []).filter((r) => r.date >= start && r.date <= end);
      } else if (range === "month") {
        const { start, end } = getMonthRange();
        allRecords = await base44.entities.AttendanceRecord.list("-date", 500);
        allRecords = (allRecords || []).filter((r) => r.date >= start && r.date <= end);
      } else {
        allRecords = await base44.entities.AttendanceRecord.list("-date", 500);
      }
      setRecords(allRecords || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Reports" />
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalEmployees = employees.filter((e) => e.status === "active").length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const uniqueDates = [...new Set(records.map((r) => r.date))];
  const uniqueEmployees = [...new Set(records.map((r) => r.employee_id))];
  const attendanceRate = totalEmployees > 0 && uniqueDates.length > 0
    ? Math.round((uniqueEmployees.length / (totalEmployees * uniqueDates.length)) * 100)
    : 0;

  // Department breakdown
  const deptMap = {};
  records.forEach((r) => {
    const emp = employees.find((e) => e.id === r.employee_id);
    const dept = emp?.department || "Unassigned";
    if (!deptMap[dept]) deptMap[dept] = { present: 0, late: 0, total: 0 };
    deptMap[dept].total++;
    if (r.status === "present") deptMap[dept].present++;
    else if (r.status === "late") deptMap[dept].late++;
  });
  const deptData = Object.entries(deptMap).map(([name, d]) => ({
    name, Present: d.present, Late: d.late,
  }));

  // Daily trend
  const dailyMap = {};
  records.forEach((r) => {
    if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, present: 0, late: 0 };
    if (r.status === "present") dailyMap[r.date].present++;
    else if (r.status === "late") dailyMap[r.date].late++;
  });
  const dailyData = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));

  const breakdownData = [
    { name: "Present", value: presentCount, color: "hsl(160 60% 45%)" },
    { name: "Late", value: lateCount, color: "hsl(38 92% 55%)" },
  ];

  const rangeLabel = range === "week" ? "This Week" : range === "month" ? "This Month" : "All Time";

  // Export handlers
  const getExportRows = () => {
    return records.map((r) => {
      const emp = employees.find((e) => e.id === r.employee_id);
      return [
        r.employee_name || emp?.full_name || "—",
        emp?.department || "—",
        emp?.position || "—",
        r.date,
        r.clock_in ? formatTime(r.clock_in) : "—",
        r.clock_out ? formatTime(r.clock_out) : "—",
        calculateHours(r.clock_in, r.clock_out) || "—",
        r.work_location_name || "—",
        r.status,
      ];
    });
  };

  const exportHeaders = ["Employee", "Department", "Position", "Date", "Clock In", "Clock Out", "Hours", "Location", "Status"];

  const handleExcel = () => {
    exportToExcel(`vibe-attendance-${range}`, exportHeaders, getExportRows(), "Attendance");
  };

  const handlePDF = () => {
    exportToPDF(
      "Vibe Attendance Report",
      exportHeaders,
      getExportRows(),
      `${rangeLabel} — ${records.length} records — Generated ${new Date().toLocaleDateString()}`
    );
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete attendance record for ${record.employee_name} on ${formatDate(record.date)}?`)) return;
    try {
      await base44.entities.AttendanceRecord.delete(record.id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Workforce attendance insights and exports">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["week", "month", "all"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                range === r ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              {r === "all" ? "All Time" : r === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={handleExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
        </Button>
        <Button onClick={handlePDF}>
          <FileText className="w-4 h-4 mr-2" /> PDF
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Active Employees" value={totalEmployees} accent="primary" />
        <StatCard icon={CheckCircle2} label="Present Records" value={presentCount} accent="emerald" />
        <StatCard icon={Clock} label="Late Arrivals" value={lateCount} accent="amber" />
        <StatCard icon={TrendingUp} label="Attendance Rate" value={`${attendanceRate}%`} accent="violet" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Daily Attendance Trend — {rangeLabel}</h3>
          {dailyData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(240 8% 42%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(240 8% 42%)" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="hsl(160 60% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="late" stroke="hsl(38 92% 55%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold mb-4">Status Breakdown</h3>
          {breakdownData.every((d) => d.value === 0) ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {breakdownData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 mb-6">
        <h3 className="font-semibold mb-4">Attendance by Department</h3>
        {deptData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(240 8% 42%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(240 8% 42%)" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Present" fill="hsl(160 60% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Late" fill="hsl(38 92% 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Record Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Attendance Records ({records.length})</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin max-h-96">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Employee</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">In</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Out</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Hours</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 50).map((r) => {
                const hrs = calculateHours(r.clock_in, r.clock_out);
                return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-sm font-medium">{r.employee_name || "—"}</td>
                  <td className="px-4 py-2 text-sm">{formatDate(r.date)}</td>
                  <td className="px-4 py-2 text-sm">{formatTime(r.clock_in)}</td>
                  <td className="px-4 py-2 text-sm">{r.clock_out ? formatTime(r.clock_out) : "—"}</td>
                  <td className="px-4 py-2 text-sm tabular-nums">{hrs ? `${hrs}h` : "—"}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("capitalize", getStatusBadgeClass(r.status))}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => handleDelete(r)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}