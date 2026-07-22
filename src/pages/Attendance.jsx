import React, { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { todayISO, yesterdayISO, formatDate, formatTime, calculateHours, getCurrentPosition, isWithinRadius, getStatusBadgeClass } from "@/lib/attendanceUtils";
import { Clock, LogIn, LogOut, MapPin, Loader2, CheckCircle2, AlertTriangle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Attendance() {
  const { user, employee, isAdmin, loading: userLoading } = useCurrentUser();
  const [locations, setLocations] = useState([]);
  const [selectedLocId, setSelectedLocId] = useState("");
  const [todayRecord, setTodayRecord] = useState(null);
  const [recent, setRecent] = useState([]);
  const [now, setNow] = useState(new Date());
  const [action, setAction] = useState(null); // 'in' | 'out'
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!employee) {
      setLoading(false);
      return;
    }
    try {
      const today = todayISO();
      const locs = await base44.entities.WorkLocation.list();
      setLocations(locs || []);

      const defaultLoc = employee.work_location_id
        ? locs.find((l) => l.id === employee.work_location_id)
        : locs[0];
      if (defaultLoc) setSelectedLocId(defaultLoc.id);

      const todayRecs = await base44.entities.AttendanceRecord.filter({
        employee_id: employee.id, date: today,
      });
      let activeRecord = todayRecs[0] || null;

      // Shift malam / lupa clock out: jika tidak ada sesi aktif hari ini
      // dan masih sebelum jam 12, cari record kemarin yang belum clock-out
      if ((!activeRecord || activeRecord.clock_out) && new Date().getHours() < 12) {
        const yesterday = yesterdayISO();
        const yesterdayRecs = await base44.entities.AttendanceRecord.filter(
          { employee_id: employee.id, date: yesterday }, "-clock_in", 10
        );
        const openYesterday = yesterdayRecs.find((r) => !r.clock_out);
        if (openYesterday) {
          activeRecord = openYesterday;
        }
      }
      setTodayRecord(activeRecord);

      const all = await base44.entities.AttendanceRecord.filter(
        { employee_id: employee.id }, "-date", 15
      );
      setRecent(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClockIn = async () => {
    setAction("in");
    setStatusMsg(null);
    try {
      const loc = locations.find((l) => l.id === selectedLocId);
      if (!loc) {
        setStatusMsg({ type: "error", text: "Please select a work location." });
        return;
      }
      const pos = await getCurrentPosition();
      const { within, distance } = isWithinRadius(
        pos.latitude, pos.longitude, loc.latitude, loc.longitude, loc.radius_meters
      );
      if (!within) {
        setStatusMsg({
          type: "error",
          text: `You are ${distance}m away from "${loc.name}". You must be within ${loc.radius_meters}m to clock in.`,
        });
        return;
      }

      const now = new Date();
      const today = todayISO();
      // Determine late status from employee's shift
      let status = "present";
      if (employee.shift_id) {
        const shifts = await base44.entities.Shift.filter({ id: employee.shift_id });
        const shift = shifts?.[0];
        if (shift && shift.start_time) {
          const [h, m] = shift.start_time.split(":").map(Number);
          const shiftStart = new Date();
          shiftStart.setHours(h, m, 0, 0);
          const grace = (shift.grace_period_minutes || 15) * 60000;
          if (now.getTime() > shiftStart.getTime() + grace) {
            status = "late";
          }
        }
      }

      const record = await base44.entities.AttendanceRecord.create({
        employee_id: employee.id,
        employee_name: employee.full_name,
        date: today,
        clock_in: now.toISOString(),
        clock_in_latitude: pos.latitude,
        clock_in_longitude: pos.longitude,
        work_location_id: loc.id,
        work_location_name: loc.name,
        status,
      });
      setTodayRecord(record);
      setStatusMsg({ type: "success", text: `Clocked in at ${formatTime(now.toISOString())} at ${loc.name}. ${status === "late" ? "Marked as late." : ""}` });
      loadData();
    } catch (e) {
      setStatusMsg({ type: "error", text: e.message || "Failed to clock in." });
    } finally {
      setAction(null);
    }
  };

  const handleClockOut = async () => {
    setAction("out");
    setStatusMsg(null);
    try {
      const loc = locations.find((l) => l.id === selectedLocId);
      const pos = await getCurrentPosition();
      const now = new Date();

      await base44.entities.AttendanceRecord.update(todayRecord.id, {
        clock_out: now.toISOString(),
        clock_out_latitude: pos.latitude,
        clock_out_longitude: pos.longitude,
      });
      setTodayRecord({ ...todayRecord, clock_out: now.toISOString() });
      setStatusMsg({ type: "success", text: `Clocked out at ${formatTime(now.toISOString())}.` });
      loadData();
    } catch (e) {
      setStatusMsg({ type: "error", text: e.message || "Failed to clock out." });
    } finally {
      setAction(null);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div>
        <PageHeader title="Attendance" />
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Your profile is not linked to an employee record. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const clockedIn = !!todayRecord?.clock_in;
  const clockedOut = !!todayRecord?.clock_out;

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Clock in and out with GPS verification" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock Card */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6 sm:p-8 flex flex-col items-center">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">{formatDate(todayISO())}</p>
            <p className="text-5xl sm:text-6xl font-bold font-heading tracking-tight tabular-nums mt-1">
              {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </p>
          </div>

          {/* Location selector */}
          <div className="w-full max-w-xs mb-6">
            <label className="text-sm text-muted-foreground mb-1.5 block text-center">Work Location</label>
            <Select value={selectedLocId} onValueChange={setSelectedLocId}>
              <SelectTrigger className="w-full">
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clock buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleClockIn}
              disabled={clockedIn || action !== null}
              size="lg"
              className="h-16 w-40 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
            >
              {action === "in" ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogIn className="w-5 h-5 mr-2" />}
              Clock In
            </Button>
            <Button
              onClick={handleClockOut}
              disabled={!clockedIn || clockedOut || action !== null}
              size="lg"
              variant="outline"
              className="h-16 w-40 rounded-2xl text-base font-semibold border-2"
            >
              {action === "out" ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogOut className="w-5 h-5 mr-2" />}
              Clock Out
            </Button>
          </div>

          {/* Status */}
          {statusMsg && (
            <div className={cn(
              "mt-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm w-full max-w-md",
              statusMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}>
              {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Today's record */}
          {todayRecord && (
            <div className="mt-6 w-full max-w-md grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Clock In</p>
                <p className="text-lg font-semibold">{formatTime(todayRecord.clock_in)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Clock Out</p>
                <p className="text-lg font-semibold">{todayRecord.clock_out ? formatTime(todayRecord.clock_out) : "—"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <StatCard
            icon={Clock}
            label="Today's Status"
            value={clockedOut ? "Completed" : clockedIn ? "Active" : "Not Started"}
            accent={clockedIn ? "emerald" : "rose"}
          />
          {todayRecord && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">{todayRecord.work_location_name || "—"}</p>
              </div>
              <div className="mt-3">
                <Badge className={cn("capitalize", getStatusBadgeClass(todayRecord.status))}>{todayRecord.status}</Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="glass-card rounded-xl p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Recent History</h3>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No records yet.</p>
        ) : (
          <div className="space-y-1">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatDate(r.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    In {formatTime(r.clock_in)}{r.clock_out ? ` · Out ${formatTime(r.clock_out)}${calculateHours(r.clock_in, r.clock_out) ? ` · ${calculateHours(r.clock_in, r.clock_out)}h` : ""}` : " · Active"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.work_location_name && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">{r.work_location_name}</span>
                  )}
                  <Badge className={cn("capitalize", getStatusBadgeClass(r.status))}>{r.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}