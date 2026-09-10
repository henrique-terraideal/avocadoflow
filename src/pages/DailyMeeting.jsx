import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight, Loader2, Monitor, Users } from "lucide-react";
import { startOfWeek, addDays, subWeeks, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MeetingCard, { STATUS_STYLES } from "@/components/daily-meeting/MeetingCard";
import MeetingCardModal from "@/components/daily-meeting/MeetingCardModal";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function DailyMeeting() {
  const queryClient = useQueryClient();
  const [weekStartStr, setWeekStartStr] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [editingLabel, setEditingLabel] = useState(null);

  const weekStart = new Date(weekStartStr + "T12:00:00");
  const days = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const dayStrs = days.map((d) => format(d, "yyyy-MM-dd"));
  const today = todayStr();

  const { data: operators = [], isLoading: loadingOperators } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
  });
  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.filter({ active: true }),
  });
  const { data: allLabels = [], isLoading: loadingLabels } = useQuery({
    queryKey: ["meeting-labels"],
    queryFn: () => base44.entities.PlanningLabel.list("-created_date", 1000),
  });

  const weekLabelSet = useMemo(() => new Set(dayStrs), [dayStrs]);
  const weekLabels = useMemo(
    () => allLabels.filter((l) => weekLabelSet.has(l.date)),
    [allLabels, weekLabelSet]
  );

  const cardsFor = (opName, dayStr) =>
    weekLabels.filter((l) => l.operator_name === opName && l.date === dayStr);

  const statusOf = (l) => (l.concluded ? "executada" : l.date < today ? "pendente" : "planejada");

  const cardsForUnassigned = (dayStr) =>
    weekLabels.filter((l) => !operators.some((o) => o.name === l.operator_name) && l.date === dayStr);

  const duplicateLabel = async (label) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = label;
    await base44.entities.PlanningLabel.create({ ...rest, concluded: false, draft_data: null });
    queryClient.invalidateQueries({ queryKey: ["meeting-labels"] });
    queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
    queryClient.invalidateQueries({ queryKey: ["home-pending-labels"] });
  };

  const updateLabel = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanningLabel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-labels"] });
      queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
      queryClient.invalidateQueries({ queryKey: ["home-pending-labels"] });
      queryClient.invalidateQueries({ queryKey: ["pending-labels"] });
      queryClient.invalidateQueries({ queryKey: ["field-records"] });
      queryClient.invalidateQueries({ queryKey: ["field-records-date"] });
    },
  });

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const [dstOpId, dstDate] = destination.droppableId.split("|");
    const [srcOpId, srcDate] = source.droppableId.split("|");
    if (srcOpId === dstOpId && srcDate === dstDate) return;
    const label = allLabels.find((l) => l.id === draggableId);
    if (!label) return;
    if (dstOpId === "__unassigned__") {
      let qr = label.qr_data;
      try {
        const url = new URL(label.qr_data);
        url.searchParams.set("op_id", "");
        url.searchParams.set("op_name", "");
        qr = url.toString();
      } catch {}
      updateLabel.mutate({
        id: label.id,
        data: { operator_name: "", operator_photo: "", date: dstDate, qr_data: qr },
      });
      return;
    }
    const op = operators.find((o) => o.id === dstOpId);
    if (!op) return;
    let qr = label.qr_data;
    try {
      const url = new URL(label.qr_data);
      url.searchParams.set("op_id", op.id);
      url.searchParams.set("op_name", op.name);
      qr = url.toString();
    } catch {}
    updateLabel.mutate({
      id: label.id,
      data: { operator_name: op.name, operator_photo: op.photo_url || "", date: dstDate, qr_data: qr },
    });
  };

  const goPrev = () => setWeekStartStr(format(subWeeks(weekStart, 1), "yyyy-MM-dd"));
  const goNext = () => setWeekStartStr(format(addWeeks(weekStart, 1), "yyyy-MM-dd"));
  const goToday = () => setWeekStartStr(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));

  const weekLabel = `Semana de ${format(weekStart, "dd/MM")} a ${format(addDays(weekStart, 4), "dd/MM")}`;

  const isLoading = loadingOperators || loadingLabels;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-4 rounded-b-3xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Reunião Diária</h1>
              <p className="text-primary-foreground/70 text-sm">Visão da semana · operações planejadas, executadas e pendentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-[180px]">
              <p className="text-sm font-semibold">{weekLabel}</p>
              <button onClick={goToday} className="text-xs text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-2">
                Ir para hoje
              </button>
            </div>
            <button onClick={goNext} className="p-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center gap-4 text-xs">
        {Object.entries(STATUS_STYLES).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`${s.bar} w-3 h-3 rounded-full`} />
            <span className="text-muted-foreground font-medium">{s.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground/60 ml-auto hidden md:inline">Arraste os cards para trocar dia ou operador · clique para editar</span>
      </div>

      {/* Matriz */}
      <div className="max-w-7xl mx-auto px-6 py-4 overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div
              className="grid gap-1.5 min-w-max"
              style={{ gridTemplateColumns: "170px repeat(5, minmax(230px, 1fr))" }}
            >
              {/* Header row */}
              <div />
              {days.map((d) => {
                const ds = format(d, "yyyy-MM-dd");
                const isToday = ds === today;
                return (
                  <div
                    key={ds}
                    className={`text-center py-2.5 rounded-xl font-semibold ${isToday ? "bg-primary text-primary-foreground shadow" : "bg-muted text-foreground"}`}
                  >
                    <div className="text-sm capitalize">{format(d, "EEEE", { locale: ptBR })}</div>
                    <div className="text-xs opacity-80">{format(d, "dd/MM")}</div>
                  </div>
                );
              })}

              {/* Operator rows */}
              {operators.map((op) => (
                <React.Fragment key={op.id}>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border sticky left-0 z-10 shadow-sm">
                    {op.photo_url ? (
                      <img src={op.photo_url} alt={op.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {op.name[0]}
                      </div>
                    )}
                    <span className="font-semibold text-sm leading-tight line-clamp-2">{op.name}</span>
                  </div>
                  {dayStrs.map((ds) => (
                    <Droppable key={op.id + "|" + ds} droppableId={op.id + "|" + ds}>
                      {(provided, snapshot) => {
                        const cards = cardsFor(op.name, ds);
                        return (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[120px] rounded-xl border p-1.5 space-y-1.5 transition-colors
                              ${snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
                          >
                            {cards.map((label, idx) => (
                              <Draggable key={label.id} draggableId={label.id} index={idx}>
                                {(p) => (
                                  <div
                                    ref={p.innerRef}
                                    {...p.draggableProps}
                                    {...p.dragHandleProps}
                                    onClick={() => setEditingLabel(label)}
                                    className="focus:outline-none"
                                  >
                                    <MeetingCard label={label} status={statusOf(label)} onDuplicate={duplicateLabel} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        );
                      }}
                    </Droppable>
                  ))}
                </React.Fragment>
              ))}
              {/* Linha "Sem dono" */}
              <React.Fragment key="__unassigned__">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border-2 border-dashed border-border sticky left-0 z-10">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-muted-foreground">Sem dono</span>
                </div>
                {dayStrs.map((ds) => (
                  <Droppable key={"__unassigned__|" + ds} droppableId={"__unassigned__|" + ds}>
                    {(provided, snapshot) => {
                      const cards = cardsForUnassigned(ds);
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[120px] rounded-xl border-2 border-dashed p-1.5 space-y-1.5 transition-colors
                            ${snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-border bg-muted/10"}`}
                        >
                          {cards.map((label, idx) => (
                            <Draggable key={label.id} draggableId={label.id} index={idx}>
                              {(p) => (
                                <div
                                  ref={p.innerRef}
                                  {...p.draggableProps}
                                  {...p.dragHandleProps}
                                  onClick={() => setEditingLabel(label)}
                                  className="focus:outline-none"
                                >
                                  <MeetingCard label={label} status={statusOf(label)} onDuplicate={duplicateLabel} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      );
                    }}
                  </Droppable>
                ))}
              </React.Fragment>
            </div>
          </DragDropContext>
        )}
      </div>

      {editingLabel && (
        <MeetingCardModal
          label={editingLabel}
          operators={operators}
          operations={operations}
          onClose={() => setEditingLabel(null)}
          onSaved={(payload) => {
            updateLabel.mutate(payload);
            setEditingLabel(null);
          }}
          onDelete={(label) => {
            base44.entities.PlanningLabel.delete(label.id).then(() => {
              queryClient.invalidateQueries({ queryKey: ["meeting-labels"] });
              queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
              queryClient.invalidateQueries({ queryKey: ["home-pending-labels"] });
            });
            setEditingLabel(null);
          }}
        />
      )}
    </div>
  );
}