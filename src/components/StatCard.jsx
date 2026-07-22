import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, sublabel, accent = "primary" }) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
    violet: "bg-violet-100 text-violet-600",
    sky: "bg-sky-100 text-sky-600",
  };
  return (
    <div className="glass-card rounded-xl p-5 flex items-center gap-4 transition-shadow hover:shadow-md">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", accentMap[accent] || accentMap.primary)}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground truncate">{label}</p>
        <p className="text-2xl font-bold font-heading truncate">{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground truncate mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}