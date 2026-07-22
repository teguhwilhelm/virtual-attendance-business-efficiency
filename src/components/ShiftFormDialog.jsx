import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

export default function ShiftFormDialog({ open, onClose, onSaved, shift, locations }) {
  const [form, setForm] = useState({
    name: "", start_time: "09:00", end_time: "17:00",
    days_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    work_location_id: "", grace_period_minutes: 15,
    rotation_enabled: false, rotation_cycle_days: 7, color: "#6366f1", is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (shift) {
      setForm({
        name: shift.name || "",
        start_time: shift.start_time || "09:00",
        end_time: shift.end_time || "17:00",
        days_of_week: shift.days_of_week || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        work_location_id: shift.work_location_id || "",
        grace_period_minutes: shift.grace_period_minutes ?? 15,
        rotation_enabled: shift.rotation_enabled ?? false,
        rotation_cycle_days: shift.rotation_cycle_days ?? 7,
        color: shift.color || "#6366f1",
        is_active: shift.is_active ?? true,
      });
    } else {
      setForm({
        name: "", start_time: "09:00", end_time: "17:00",
        days_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        work_location_id: "", grace_period_minutes: 15,
        rotation_enabled: false, rotation_cycle_days: 7, color: "#6366f1", is_active: true,
      });
    }
    setError("");
  }, [shift, open]);

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.start_time || !form.end_time) {
      setError("Name, start time, and end time are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (shift) {
        await base44.entities.Shift.update(shift.id, form);
      } else {
        await base44.entities.Shift.create(form);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to save shift.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{shift ? "Edit Shift" : "Create Shift"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Shift Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Morning Shift" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time *</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time *</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Working Days</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.days_of_week.includes(d.key)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Work Location</Label>
              <Select value={form.work_location_id} onValueChange={(v) => setForm({ ...form, work_location_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Grace Period (min)</Label>
              <Input type="number" min={0} value={form.grace_period_minutes} onChange={(e) => setForm({ ...form, grace_period_minutes: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-lg ${form.color === c ? "ring-2 ring-offset-2 ring-foreground" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rotation</Label>
              <Select value={form.rotation_enabled ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, rotation_enabled: v === "yes" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Disabled</SelectItem>
                  <SelectItem value="yes">Enabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.rotation_enabled && (
            <div className="space-y-1.5">
              <Label>Rotation Cycle (days)</Label>
              <Input type="number" min={1} value={form.rotation_cycle_days} onChange={(e) => setForm({ ...form, rotation_cycle_days: parseInt(e.target.value) || 7 })} />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {shift ? "Save Changes" : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}