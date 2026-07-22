import React, { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import ShiftFormDialog from "@/components/ShiftFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Clock, MapPin, CalendarDays, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const DAY_LABELS = { monday: "M", tuesday: "T", wednesday: "W", thursday: "T", friday: "F", saturday: "S", sunday: "S" };
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function Shifts() {
  const { isAdmin } = useCurrentUser();
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [shfts, emps, locs] = await Promise.all([
        base44.entities.Shift.list("-created_date"),
        base44.entities.Employee.list(),
        base44.entities.WorkLocation.list(),
      ]);
      setShifts(shfts || []);
      setEmployees(emps || []);
      setLocations(locs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locName = (id) => locations.find((l) => l.id === id)?.name || "Not assigned";
  const empCount = (shiftId) => employees.filter((e) => e.shift_id === shiftId).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.Shift.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Shifts" />
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

  return (
    <div>
      <PageHeader title="Shift Management" subtitle={`${shifts.length} shifts configured`}>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Create Shift
        </Button>
      </PageHeader>

      {shifts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No shifts configured yet. Create your first shift to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map((s) => (
            <div key={s.id} className="glass-card rounded-xl p-5 border-l-4" style={{ borderLeftColor: s.color || "#6366f1" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{s.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{s.start_time} – {s.end_time}</span>
                  </div>
                </div>
                <Badge variant={s.is_active ? "default" : "secondary"} className={s.is_active ? "bg-emerald-100 text-emerald-700" : ""}>
                  {s.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{locName(s.work_location_id)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <div className="flex gap-1">
                    {DAY_ORDER.map((d) => (
                      <span
                        key={d}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold",
                          s.days_of_week?.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/40"
                        )}
                      >
                        {DAY_LABELS[d]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">Grace: {s.grace_period_minutes ?? 15} min</span>
                  {s.rotation_enabled && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <RefreshCw className="w-3 h-3" /> Rotation {s.rotation_cycle_days}d
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t">
                  <span className="text-xs">{empCount(s.id)} employee(s) assigned</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(s); setDialogOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ShiftFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        shift={editing}
        locations={locations}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Shift</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Assigned employees will need to be reassigned.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}