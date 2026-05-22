import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCreatePorte } from "@/hooks/api/use-create-porte";
import { useUpdatePorte } from "@/hooks/api/use-update-porte";
import type { Porte, StatutPorte } from "@/types/api";

export type SessionPhase =
  | "IDLE"
  | "NAMING"
  | "CREATING"
  | "READY"
  | "STARTING"
  | "ACTIVE"
  | "SAVING";

export type SessionState =
  | { phase: "IDLE" }
  | { phase: "NAMING"; etage: number; numero: string; nomPersonnalise: string }
  | { phase: "CREATING"; etage: number; numero: string; nomPersonnalise: string }
  | { phase: "READY"; porte: Porte; createdNow: boolean }
  | { phase: "STARTING"; porte: Porte; createdNow: boolean }
  | { phase: "ACTIVE"; porte: Porte; startedAt: number; createdNow: boolean }
  | {
      phase: "SAVING";
      porte: Porte;
      startedAt: number;
      statut: StatutPorte | string;
      createdNow: boolean;
    };

export type SaveStatusInput = {
  statut: StatutPorte | string;
  commentaire?: string;
  nomPersonnalise?: string;
  rdvDate?: string;
  rdvTime?: string;
  nbContrats?: number;
};

type RecordingBindings = {
  markDoorStart: (porte: { id: number; numero: string; etage: number }) => void;
  markDoorEnd: (porteId: number, statut?: string) => void;
  isRecording: boolean;
};

type UseProspectionSessionOptions = {
  immeubleId: number;
  recording: RecordingBindings;
  onPorteSaved?: (porte: Porte, durationMs: number) => void;
  onPorteCreated?: (porte: Porte) => void;
};

export function useProspectionSession({
  immeubleId,
  recording,
  onPorteSaved,
  onPorteCreated,
}: UseProspectionSessionOptions) {
  const [state, setState] = useState<SessionState>({ phase: "IDLE" });
  const { create: createPorte } = useCreatePorte();
  const { update: updatePorte } = useUpdatePorte();

  const stateRef = useRef(state);
  stateRef.current = state;

  const open = useCallback((defaultEtage = 1) => {
    setState({
      phase: "NAMING",
      etage: defaultEtage,
      numero: "",
      nomPersonnalise: "",
    });
  }, []);

  const updateNaming = useCallback(
    (patch: Partial<{ etage: number; numero: string; nomPersonnalise: string }>) => {
      setState((prev) => {
        if (prev.phase !== "NAMING") return prev;
        return { ...prev, ...patch };
      });
    },
    [],
  );

  const cancel = useCallback(() => {
    const current = stateRef.current;
    if (
      current.phase === "ACTIVE" ||
      current.phase === "SAVING" ||
      current.phase === "STARTING"
    ) {
      recording.markDoorEnd(current.porte.id);
    }
    setState({ phase: "IDLE" });
  }, [recording]);

  const submitPorte = useCallback(
    async (params: { etage: number; numero: string; nomPersonnalise?: string }) => {
      const numero = params.numero.trim();
      const etage = Number(params.etage);
      if (!numero || !etage || Number.isNaN(etage) || etage < 1) {
        return { ok: false as const, reason: "invalid" };
      }

      setState({
        phase: "CREATING",
        etage,
        numero,
        nomPersonnalise: (params.nomPersonnalise ?? "").trim(),
      });

      const porte = await createPorte({
        immeubleId,
        etage,
        numero,
        statut: "NON_VISITE",
        nomPersonnalise: params.nomPersonnalise?.trim() || undefined,
      });

      if (!porte) {
        setState({
          phase: "NAMING",
          etage,
          numero,
          nomPersonnalise: (params.nomPersonnalise ?? "").trim(),
        });
        return { ok: false as const, reason: "create_failed" };
      }

      onPorteCreated?.(porte);
      setState({ phase: "READY", porte, createdNow: true });
      return { ok: true as const, porte };
    },
    [createPorte, immeubleId, onPorteCreated],
  );

  const beginFromExisting = useCallback((porte: Porte) => {
    setState({ phase: "READY", porte, createdNow: false });
  }, []);

  const startActive = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== "READY") return;
    recording.markDoorStart({
      id: current.porte.id,
      numero: current.porte.numero,
      etage: current.porte.etage,
    });
    setState({
      phase: "STARTING",
      porte: current.porte,
      createdNow: current.createdNow,
    });
  }, [recording]);

  const abortActive = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== "ACTIVE" && current.phase !== "STARTING") return;
    recording.markDoorEnd(current.porte.id);
    setState({ phase: "IDLE" });
  }, [recording]);

  const saveStatus = useCallback(
    async (input: SaveStatusInput) => {
      const current = stateRef.current;
      if (current.phase !== "ACTIVE") return { ok: false as const };

      recording.markDoorEnd(current.porte.id, input.statut);

      setState({
        phase: "SAVING",
        porte: current.porte,
        startedAt: current.startedAt,
        statut: input.statut,
        createdNow: current.createdNow,
      });

      const updated = await updatePorte({
        id: current.porte.id,
        statut: input.statut,
        commentaire: input.commentaire?.trim() || null,
        nomPersonnalise: input.nomPersonnalise?.trim() || null,
        derniereVisite: new Date().toISOString(),
        rdvDate: input.rdvDate || undefined,
        rdvTime: input.rdvTime || undefined,
        nbContrats:
          input.nbContrats !== undefined ? Math.max(1, input.nbContrats) : undefined,
      });

      if (!updated) {
        setState({
          phase: "ACTIVE",
          porte: current.porte,
          startedAt: current.startedAt,
          createdNow: current.createdNow,
        });
        return { ok: false as const };
      }

      const durationMs = Math.max(0, Date.now() - current.startedAt);
      onPorteSaved?.(updated, durationMs);
      setState({ phase: "IDLE" });
      return { ok: true as const, porte: updated, durationMs };
    },
    [recording, updatePorte, onPorteSaved],
  );

  useEffect(() => {
    if (state.phase !== "STARTING") return;
    if (!recording.isRecording) return;
    setState({
      phase: "ACTIVE",
      porte: state.porte,
      startedAt: Date.now(),
      createdNow: state.createdNow,
    });
  }, [recording.isRecording, state]);

  const isLocked =
    state.phase === "ACTIVE" ||
    state.phase === "SAVING" ||
    state.phase === "STARTING";
  const isVisible = state.phase !== "IDLE";

  return useMemo(
    () => ({
      state,
      isVisible,
      isLocked,
      open,
      cancel,
      updateNaming,
      submitPorte,
      beginFromExisting,
      startActive,
      abortActive,
      saveStatus,
    }),
    [
      state,
      isVisible,
      isLocked,
      open,
      cancel,
      updateNaming,
      submitPorte,
      beginFromExisting,
      startActive,
      abortActive,
      saveStatus,
    ],
  );
}

export type ProspectionSessionApi = ReturnType<typeof useProspectionSession>;
