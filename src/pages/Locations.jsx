import React, { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import LocationFormDialog from "@/components/LocationFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Navigation, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export default function Locations() {
  const { isAdmin } = useCurrentUser();
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [locs, emps] = await Promise.all([
        base44.entities.WorkLocation.list(),
        base44.entities.Employee.list(),
      ]);
      setLocations(locs || []);
      setEmployees(emps || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const empCount = (locId) => employees.filter((e) => e.work_location_id === locId).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.WorkLocation.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Work Locations" />
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
      <PageHeader title="Work Locations" subtitle="Define GPS-verified work locations for clock-in/out">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Location
        </Button>
      </PageHeader>

      {locations.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No locations configured. Add your first work location to enable GPS-verified attendance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div key={loc.id} className="glass-card rounded-xl overflow-hidden">
              {/* Map preview */}
              <div className="h-32 bg-gradient-to-br from-primary/5 to-violet-500/5 relative flex items-center justify-center border-b">
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: "radial-gradient(circle at 50% 50%, hsl(245 75% 56% / 0.15) 0%, transparent 70%)"
                }} />
                <MapPin className="w-8 h-8 text-primary relative z-10" />
                <Badge
                  variant={loc.is_active ? "default" : "secondary"}
                  className={cn("absolute top-2 right-2", loc.is_active ? "bg-emerald-100 text-emerald-700" : "")}
                >
                  {loc.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-base">{loc.name}</h3>
                {loc.address && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{loc.address}</p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Lat</span>
                    <span className="font-mono">{loc.latitude?.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Lng</span>
                    <span className="font-mono">{loc.longitude?.toFixed(4)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> {loc.radius_meters || 150}m radius
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {empCount(loc.id)} assigned
                  </span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(loc); setDialogOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(loc)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <LocationFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        location={editing}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Employees assigned here will need reassignment.
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