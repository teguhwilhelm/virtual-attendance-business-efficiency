import React, { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import { todayISO, getWeekRange, formatDate, formatTime, getStatusBadgeClass } from "@/lib/attendanceUtils";
import { Users, UserCheck, CalendarClock, TrendingUp, Clock, MapPin } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, employee, isAdmin, loading: userLoading } = useCurrentUser();

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }
  return <EmployeeDashboard employeeId={employee?.id} employeeName={employee?.full_name} />;
}

function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, onLeave: 0 });
  const [weekly, setWeekly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const today = todayISO();
        const [employees, todayRecords, leaveReqs] = await Promise.all([
          base44.entities.Employee.list(),
          base44.entities.AttendanceRecord.filter({ date: today }),
          base44.entities.LeaveRequest.filter({ status: "pending" }),
        ]);

        const present = todayRecords.filter((r) => r.status === "present").length;
        const late = todayRecords.filter((r) => r.status === "late").length;
        const total = employees.filter((e) => e.status === "active").length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        setStats({
          total,
          present,
          late,
          onLeave: leaveReqs.length,
          rate,
        });

        // Weekly trend (last 7 days)
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(d.toISOString().split("T")[0]);
        }
        const weekRecords = await Promise.all(
          days.map((d) => base44.entities.AttendanceRecord.filter({ date: d }))
        );
        const weekData = days.map((d, i) => {
          const recs = weekRecords[i] || [];
          return {
            date: new Date(d).toLocaleDateString("en-US", { weekday: "short" }),
            present: recs.filter((r) => r.status === "present").length,
            late: recs.filter((r) => r.status === "late").length,
          };
        });
        setWeekly(weekData);

        // Status breakdown
        setBreakdown([
          { name: "Present", value: present, color: "hsl(160 60% 45%)" },
          { name: "Late", value: late, color: "hsl(38 92% 55%)" },
          { name: "Absent", value: Math.max(0, total - present - late), color: "hsl(0 72% 55%)" },
        ]);

        // Recent activity
        const allRecent = (await base44.entities.AttendanceRecord.list("-clock_in", 8)).filter(Boolean);
        setRecent(allRecent);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Workforce overview for today" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Active Employees" value={stats.total} accent="primary" />
        <StatCard icon={UserCheck} label="Present Today" value={stats.present} sublabel={`${stats.late} late`} accent="emerald" />
        <StatCard icon={CalendarClock} label="Pending Leave" value={stats.onLeave} accent="amber" />
        <StatCard icon={TrendingUp} label="Attendance Rate" value={`${stats.rate}%`} accent="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Weekly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 60% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160 60% 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 92% 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38 92% 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(240 8% 42%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(240 8% 42%)" allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="present" stroke="hsl(160 60% 45%)" fill="url(#gPresent)" strokeWidth={2} />
              <Area type="monotone" dataKey="late" stroke="hsl(38 92% 55%)" fill="url(#gLate)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold mb-4">Today's Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {breakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No attendance records yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.employee_name || "Employee"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.date)} · In {formatTime(r.clock_in)}{r.clock_out ? ` · Out ${formatTime(r.clock_out)}` : ""}</p>
                  </div>
                </div>
                <Badge className={cn("capitalize", getStatusBadgeClass(r.status))}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeDashboard({ employeeId, employeeName }) {
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!employeeId) {
        setLoading(false);
        return;
      }
      try {
        const today = todayISO();
        const todayRecs = await base44.entities.AttendanceRecord.filter({
          employee_id: employeeId, date: today,
        });
        setTodayRecord(todayRecs[0] || null);

        const all = await base44.entities.AttendanceRecord.filter(
          { employee_id: employeeId }, "-date", 30
        );
        setRecords(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Your profile is not linked to an employee record yet. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const monthRecords = records.filter((r) => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const presentCount = monthRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const lateCount = monthRecords.filter((r) => r.status === "late").length;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your attendance summary" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={UserCheck} label="Days Present (Month)" value={presentCount} accent="emerald" />
        <StatCard icon={Clock} label="Late Arrivals" value={lateCount} accent="amber" />
        <StatCard icon={CalendarClock} label="Total Records" value={records.length} accent="primary" />
        <StatCard icon={MapPin} label="Today's Status" value={todayRecord ? (todayRecord.clock_out ? "Completed" : "Active") : "Not in"} accent={todayRecord ? "violet" : "rose"} />
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="font-semibold mb-4">Recent Attendance</h3>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No attendance records yet. Clock in to get started!</p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatDate(r.date)}</p>
                  <p className="text-xs text-muted-foreground">In {formatTime(r.clock_in)}{r.clock_out ? ` · Out ${formatTime(r.clock_out)}` : " · Still clocked in"}</p>
                </div>
                <Badge className={cn("capitalize", getStatusBadgeClass(r.status))}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}