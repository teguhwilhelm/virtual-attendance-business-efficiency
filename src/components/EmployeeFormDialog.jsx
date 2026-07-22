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

const departments = ["Engineering", "Sales", "Marketing", "Human Resources", "Finance", "Operations", "Customer Support", "Design", "Product", "Warehouse", "Other"];

export default function EmployeeFormDialog({ open, onClose, onSaved, employee, locations, shifts }) {
  const [form, setForm] = useState({
    full_name: "", email: "", employee_code: "", department: "Engineering",
    position: "", phone: "", hire_date: "", work_location_id: "", shift_id: "", status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name || "",
        email: employee.email || "",
        employee_code: employee.employee_code || "",
        department: employee.department || "Engineering",
        position: employee.position || "",
        phone: employee.phone || "",
        hire_date: employee.hire_date || "",
        work_location_id: employee.work_location_id || "",
        shift_id: employee.shift_id || "",
        status: employee.status || "active",
      });
    } else {
      setForm({
        full_name: "", email: "", employee_code: "", department: "Engineering",
        position: "", phone: "", hire_date: "", work_location_id: "", shift_id: "", status: "active",
      });
    }
    setError("");
  }, [employee, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      setError("Name and email are required.");
      return;
    }
    if (!form.department || !form.department.trim()) {
      setError("Please select or type a department.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (employee) {
        await base44.entities.Employee.update(employee.id, form);
      } else {
        await base44.entities.Employee.create(form);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Employee Code</Label>
              <Input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} placeholder="EMP-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={departments.includes(form.department) ? form.department : "Other"}
                onValueChange={(v) => setForm({ ...form, department: v === "Other" ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {!departments.includes(form.department) && (
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Type custom department"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Software Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Hire Date</Label>
              <Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Work Location</Label>
              <Select value={form.work_location_id} onValueChange={(v) => setForm({ ...form, work_location_id: v })}>
                <SelectTrigger><SelectValue placeholder="Assign location" /></SelectTrigger>
                <SelectContent>
                  {locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select value={form.shift_id} onValueChange={(v) => setForm({ ...form, shift_id: v })}>
                <SelectTrigger><SelectValue placeholder="Assign shift" /></SelectTrigger>
                <SelectContent>
                  {shifts?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {employee ? "Save Changes" : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}