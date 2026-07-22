import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Loader2, Navigation } from "lucide-react";

export default function LocationFormDialog({ open, onClose, onSaved, location }) {
  const [form, setForm] = useState({
    name: "", address: "", latitude: "", longitude: "", radius_meters: 150, is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name || "",
        address: location.address || "",
        latitude: location.latitude ?? "",
        longitude: location.longitude ?? "",
        radius_meters: location.radius_meters ?? 150,
        is_active: location.is_active ?? true,
      });
    } else {
      setForm({ name: "", address: "", latitude: "", longitude: "", radius_meters: 150, is_active: true });
    }
    setError("");
  }, [location, open]);

  const detectLocation = () => {
    setDetecting(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      setDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setDetecting(false);
      },
      (err) => {
        setError(err.message || "Could not detect location.");
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.latitude === "" || form.longitude === "") {
      setError("Name, latitude, and longitude are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: parseInt(form.radius_meters) || 150,
      };
      if (location) {
        await base44.entities.WorkLocation.update(location.id, payload);
      } else {
        await base44.entities.WorkLocation.create(payload);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to save location.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Add Work Location"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Location Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Headquarters" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, Country" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Latitude *</Label>
              <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="40.7128" />
            </div>
            <div className="space-y-1.5">
              <Label>Longitude *</Label>
              <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-74.006" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Allowed Radius (meters)</Label>
            <Input type="number" min={10} value={form.radius_meters} onChange={(e) => setForm({ ...form, radius_meters: e.target.value })} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={detecting} className="w-full">
            {detecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
            Use My Current Location
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {location ? "Save Changes" : "Add Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}