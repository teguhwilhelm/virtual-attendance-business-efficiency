import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useCurrentUser() {
  const [state, setState] = useState({ user: null, employee: null, loading: true });

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        let emp = null;
        try {
          const byUserId = await base44.entities.Employee.filter({ user_id: u.id });
          if (byUserId && byUserId.length > 0) {
            emp = byUserId[0];
          } else {
            const byEmail = await base44.entities.Employee.filter({ email: u.email });
            if (byEmail && byEmail.length > 0) {
              emp = byEmail[0];
            } else if (u.role === "admin") {
              // Admin tanpa Employee record: buat otomatis agar bisa absen
              emp = await base44.entities.Employee.create({
                full_name: u.full_name || u.email.split("@")[0],
                email: u.email,
                user_id: u.id,
                position: "Administrator",
                status: "active",
              });
            }
          }
        } catch (e) {
          // Employee record may not exist yet
        }
        setState({ user: u, employee: emp, loading: false });
      } catch (e) {
        setState({ user: null, employee: null, loading: false });
      }
    };
    load();
  }, []);

  const isAdmin = state.user?.role === "admin";
  return { ...state, isAdmin };
}