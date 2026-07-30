import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Clock, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import PendingRecordModal from "./PendingRecordModal";
import DateInput from "@/components/ui/DateInput";
import { useNavigate } from "react-router-dom";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function PendingRecords({ operatorId, isAdmin, operators, operations, currentUser }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [openLabel, setOpenLabel] = useState(null);
  const [editingDateLabel, setEditingDateLabel] = useState(null);
  const [editingDateValue, setEditingDateValue] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSaveLabelDate = async (label) => {
    if (!editingDateValue) return;
    await base44.entities.PlanningLabel.update(label.id, { date: editingDateValue });
    queryClient.invalidateQueries({ queryKey: ["pending-labels"] });
    setEditingDateLabel(null);
    setEditingDateValue("");
  };

  const { data: pendingLabels = [] } = useQuery({
    queryKey: ["pending-labels", operatorId, isAdmin, selectedDate],
    queryFn: () => base44.entities.PlanningLabel.filter({ date: selectedDate }, "-created_date", 200),
    enabled: isAdmin ? true : !!operatorId,
  });

  const { data: existingRecords = [] } = useQuery({
    queryKey: ["field-records-date", operatorId, isAdmin, selectedDate],
    queryFn: () => {
      if (isAdmin) return base44.entities.FieldRecord.filter({ date: selectedDate }, "-created_date", 500);
      return base44.entities.FieldRecord.filter({ date: selectedDate, operator_id: operatorId }, "-created_date", 100);
    },
    enabled: isAdmin ? true : !!operatorId,
  });

  // Also fetch records whose planned_date matches — covers activities registered on a different date
  const { data: plannedDateRecords = [] } = useQuery({
    queryKey: ["field-records-planned-date", operatorId, isAdmin, selectedDate],
    queryFn: () => {
      if (isAdmin) return base44.entities.FieldRecord.filter({ planned_date: selectedDate }, "-created_date", 500);
      return base44.entities.FieldRecord.filter({ planned_date: selectedDate, operator_id: operatorId }, "-created_date", 100);
    },
    enabled: isAdmin ? true : !!operatorId,
  });

  const allExistingRecords = [...existingRecords, ...plannedDateRecords];

  // IDs dos labels que foram parcialmente registrados (continuar depois)
  const [keepPendingIds, setKeepPendingIds] = useState([]);

  const createMutation = useMutation({
    mutationFn: async ({ data, keepPending }) => {
      await base44.entities.FieldRecord.create(data);
      return { keepPending };
    },
    onSuccess: ({ keepPending }) => {
      queryClient.invalidateQueries({ queryKey: ["field-records"] });
      if (!keepPending) {
        queryClient.invalidateQueries({ queryKey: ["field-records-date"] });
      }
    },
  });

  const pending = pendingLabels.filter((label) => {
    if (!label.qr_data) return false;
    try {
      const url = new URL(label.qr_data);
      const labelOpId = url.searchParams.get("op_id");
      if (!isAdmin && labelOpId !== operatorId) return false;
      const actCode = url.searchParams.get("act_code");
      const alreadyDone = allExistingRecords.some(
        (r) =>
          r.operator_id === labelOpId &&
          r.orchard_number === label.orchard_number &&
          r.start_time && r.end_time &&
          actCode && r.operation?.includes(actCode)
      );
      return !alreadyDone;
    } catch { return false; }
  });

  const handleSave = async (data, options = {}) => {
    const keepPending = !!options.keepPending;
    const { customValues, ...recordData } = data;

    // Start with PlanningLabel's existing additional_details (from planning stage)
    let mergedDetails = {};
    try { mergedDetails = openLabel?.additional_details ? JSON.parse(openLabel.additional_details) : {}; }
    catch { mergedDetails = {}; }
    // Merge registration-stage values on top (overwrite if same key)
    if (customValues && typeof customValues === "object") {
      Object.assign(mergedDetails, customValues);
    }

    // Always update PlanningLabel with merged details
    if (openLabel?.id) {
      await base44.entities.PlanningLabel.update(openLabel.id, { additional_details: JSON.stringify(mergedDetails) });
      queryClient.invalidateQueries({ queryKey: ["pending-labels"] });
      queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
    }

    createMutation.mutate({
      data: {
        ...recordData,
        date: recordData.date || selectedDate,
        qr_scanned: false,
        created_by_user_id: currentUser?.id,
        additional_details: Object.keys(mergedDetails).length > 0 ? JSON.stringify(mergedDetails) : null,
      },
      keepPending,
    });

    // Update RA status to "executada" if linked via additional_details
    if (mergedDetails.ra_id) {
      try {
        await base44.entities.AgronomicRecommendation.update(mergedDetails.ra_id, { status: 'executada' });
        queryClient.invalidateQueries({ queryKey: ["recommendations"] });
        queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
      } catch (e) {
        console.error('Failed to update RA status:', e);
      }
    }

    setOpenLabel(null);
    if (keepPending) {
      navigate("/");
    }
  };

  const isToday = selectedDate === todayStr();
  const formattedDate = format(new Date(selectedDate + "T12:00:00"), "EEE, d 'de' MMM", { locale: ptBR });

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Registros pendentes</span>
          {pending.length > 0 && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </div>
      </div>

      {/* Seletor de data */}
      <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-3 py-2 shadow-sm mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => setSelectedDate(subDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{formattedDate}</p>
          {isToday && <p className="text-xs text-primary font-medium">Hoje</p>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => setSelectedDate(addDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">Nenhum registro pendente para este dia.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((label) => {
            let actCode, actName, orchard, opName;
            try {
              const url = new URL(label.qr_data);
              actCode = url.searchParams.get("act_code");
              actName = url.searchParams.get("act_name");
              orchard = url.searchParams.get("orchard");
              opName = url.searchParams.get("op_name");
            } catch { return null; }

            const isEditingDate = editingDateLabel?.id === label.id;

            return (
              <div key={label.id} className="bg-card border-2 border-accent/40 rounded-2xl shadow-sm overflow-hidden">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setOpenLabel(label)}
                  className="w-full text-left px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {isAdmin && opName && (
                        <p className="text-xs text-muted-foreground font-semibold mb-0.5">{opName}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{actCode}. {actName}</p>
                        {label.auto_rescheduled && (
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                            {label.original_date && (
                              <span className="text-xs text-red-500 font-medium">
                                {format(new Date(label.original_date + "T12:00:00"), "dd/MM", { locale: ptBR })}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">🌳 Pomar {orchard}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        📅 Planejado para {format(new Date(label.date + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-accent shrink-0 ml-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">Preencher</span>
                    </div>
                  </div>
                </motion.button>

                {/* Editar data */}
                <div className="border-t border-border px-4 py-2 flex items-center gap-2">
                  {!isEditingDate ? (
                    <button
                      onClick={() => { setEditingDateLabel(label); setEditingDateValue(label.date); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      Editar data
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <DateInput
                        value={editingDateValue}
                        onChange={(e) => setEditingDateValue(e.target.value)}
                        wrapperClassName="flex-1"
                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveLabelDate(label)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setEditingDateLabel(null); setEditingDateValue(""); }}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openLabel && (
        <PendingRecordModal
          key={openLabel._reopen ?? openLabel.id}
          label={openLabel}
          operators={operators}
          operations={operations}
          onSave={handleSave}
          onClose={() => setOpenLabel(null)}
        />
      )}
    </div>
  );
}