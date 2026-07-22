import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const LEAVE_TYPES = [
  { value: "sick", label: "Sick Leave" },
  { value: "vacation", label: "Vacation" },
  { value: "personal", label: "Personal" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

export default function LeaveFormDialog({ open, onClose, onSaved, employee }) {
  const [form, setForm] = useState({
    leave_type: "vacation", start_date: "", end_date: "", reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ leave_type: "vacation", start_date: "", end_date: "", reason: "" });
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      setError("Start and end dates are required.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError("End date must be after start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await base44.entities.LeaveRequest.create({
        employee_id: employee.id,
        employee_name: employee.full_name,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        status: "pending",
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Leave Type</Label>
            <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Brief description..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}