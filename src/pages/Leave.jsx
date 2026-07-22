import React, { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import LeaveFormDialog from "@/components/LeaveFormDialog";
import { formatDate, getStatusBadgeClass } from "@/lib/attendanceUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Check, X, CalendarClock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  sick: "Sick", vacation: "Vacation", personal: "Personal", unpaid: "Unpaid", other: "Other",
};

export default function Leave() {
  const { user, employee, isAdmin, loading: userLoading } = useCurrentUser();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!employee && !isAdmin) {
      setLoading(false);
      return;
    }
    try {
      let data;
      if (isAdmin) {
        data = await base44.entities.LeaveRequest.list("-created_date");
      } else if (employee) {
        data = await base44.entities.LeaveRequest.filter({ employee_id: employee.id });
        data = (data || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }
      setRequests(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [employee, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (req, status) => {
    try {
      await base44.entities.LeaveRequest.update(req.id, {
        status,
        reviewed_by: user?.full_name || user?.email,
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (req) => {
    if (!window.confirm(`Delete leave request from ${req.employee_name}?`)) return;
    try {
      await base44.entities.LeaveRequest.delete(req.id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee && !isAdmin) {
    return (
      <div>
        <PageHeader title="Leave" />
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Your profile is not linked to an employee record. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle={isAdmin ? "Review and manage leave requests" : "Request and track your leave"}
      >
        {!isAdmin && employee && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Request Leave
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => (
                  <TableRow key={req.id}>
                    {isAdmin && <TableCell className="font-medium text-sm">{req.employee_name || "—"}</TableCell>}
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{TYPE_LABELS[req.leave_type] || req.leave_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(req.start_date)} → {formatDate(req.end_date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                      {req.reason || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", getStatusBadgeClass(req.status))}>{req.status}</Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          {req.status === "pending" ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => handleReview(req, "approved")}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => handleReview(req, "rejected")}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground mr-1">Reviewed</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => handleDelete(req)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {employee && (
        <LeaveFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={load}
          employee={employee}
        />
      )}
    </div>
  );
}