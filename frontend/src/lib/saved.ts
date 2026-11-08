"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

/**
 * One shared copy of the patient's saved hospital ids, so every heart on the page agrees
 * and the list is fetched once.
 */
let ids: Set<string> = new Set();
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const EMPTY: Set<string> = new Set();

export function useSavedHospitals() {
  const { user } = useAuth();
  const isPatient = user?.role === "USER";
  const snapshot = useSyncExternalStore(subscribe, () => ids, () => EMPTY);

  useEffect(() => {
    if (!isPatient || !user || loadedFor === user.id) return;
    loadedFor = user.id;
    api<{ hospitals: { id: string }[] }>("/saved")
      .then((r) => {
        ids = new Set(r.hospitals.map((h) => h.id));
        emit();
      })
      .catch(() => {
        loadedFor = null;
      });
  }, [isPatient, user]);

  useEffect(() => {
    if (!user) {
      ids = new Set();
      loadedFor = null;
      emit();
    }
  }, [user]);

  const toggle = useCallback(async (hospitalId: string) => {
    const was = ids.has(hospitalId);
    ids = new Set(ids);
    if (was) ids.delete(hospitalId);
    else ids.add(hospitalId);
    emit();
    try {
      await api(`/saved/${hospitalId}`, { method: was ? "DELETE" : "PUT" });
    } catch {
      ids = new Set(ids);
      if (was) ids.add(hospitalId);
      else ids.delete(hospitalId);
      emit();
    }
  }, []);

  return { canSave: isPatient, saved: isPatient ? snapshot : EMPTY, toggle };
}
