import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "../components/field/BottomNav";
import DashboardFilterBar from "../components/reports/DashboardFilterBar";
import SummaryCards from "../components/reports/SummaryCards";
import DelayedTasksList from "../components/reports/DelayedTasksList";
import ChartsSection from "../components/reports/ChartsSection";

const calcHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
};

const todayStr = () => new Date().toISOString().split("T")[0];

export default function Reports() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [selectedOrchards, setSelectedOrchards] = useState([]);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    base44.auth.me().then((u) => { setCurrentUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
  }, []);

  const isAdmin = currentUser?.role === "admin";

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["field-records", currentUser?.id, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.FieldRecord.list("-created_date", 500)
      : base44.entities.FieldRecord.filter({ created_by_user_id: currentUser?.id }, "-created_date", 500),
    enabled: userLoaded,
  });

  const { data: labels = [], isLoading: loadingLabels } = useQuery({
    queryKey: ["planning-labels-reports", currentUser?.id, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.PlanningLabel.list("-created_date", 500)
      : base44.entities.PlanningLabel.filter({ operator_name: currentUser?.full_name || "" }, "-created_date", 500),
    enabled: userLoaded,
  });

  const { data: operatorList = [] } = useQuery({
    queryKey: ["operators-reports"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
    enabled: userLoaded && isAdmin,
  });

  const { data: orchardList = [] } = useQuery({
    queryKey: ["orchards-reports"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
    enabled: userLoaded,
  });

  const operatorNames = useMemo(() => {
    const fromList = operatorList.map((o) => o.name);
    const fromRecords = records.map((r) => r.operator_name).filter(Boolean);
    const fromLabels = labels.map((l) => l.operator_name).filter(Boolean);
    return [...new Set([...fromList, ...fromRecords, ...fromLabels])].sort();
  }, [operatorList, records, labels]);

  const orchardCodes = useMemo(() => {
    const fromList = orchardList.map((o) => o.code);
    const fromRecords = records.map((r) => r.orchard_number).filter(Boolean);
    const fromLabels = labels.map((l) => l.orchard_number).filter(Boolean);
    return [...new Set([...fromList, ...fromRecords, ...fromLabels])].sort();
  }, [orchardList, records, labels]);

  const toggleOperator = (op) => {
    setSelectedOperators((prev) => prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]);
  };

  const toggleOrchard = (o) => {
    setSelectedOrchards((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]);
  };

  const clearFilters = () => {
    setStartDate(""); setEndDate("");
    setSelectedOperators([]); setSelectedOrchards([]);
    setStatus("all");
  };

  // Core processing with cascading filters: Data → Colaborador → Pomar → Status
  const processed = useMemo(() => {
    const today = todayStr();

    // 1. Filter FieldRecords by date range
    let filteredRecords = records.filter((r) => {
      if (!r.date) return false;
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });

    // 2. Filter by operator
    if (selectedOperators.length > 0) {
      filteredRecords = filteredRecords.filter((r) => selectedOperators.includes(r.operator_name));
    }

    // 3. Filter by orchard
    if (selectedOrchards.length > 0) {
      filteredRecords = filteredRecords.filter((r) => selectedOrchards.includes(r.orchard_number));
    }

    // 1. Filter PlanningLabels by date range
    let filteredLabels = labels.filter((l) => {
      if (!l.date) return false;
      if (startDate && l.date < startDate) return false;
      if (endDate && l.date > endDate) return false;
      return true;
    });

    // 2. Filter labels by operator
    if (selectedOperators.length > 0) {
      filteredLabels = filteredLabels.filter((l) => selectedOperators.includes(l.operator_name));
    }

    // 3. Filter labels by orchard
    if (selectedOrchards.length > 0) {
      filteredLabels = filteredLabels.filter((l) => selectedOrchards.includes(l.orchard_number));
    }

    // Classify labels: completed / delayed / pending
    const isLabelCompleted = (label) => {
      return filteredRecords.some((r) =>
        r.operator_name === label.operator_name &&
        r.orchard_number === label.orchard_number &&
        (r.planned_date === label.date || r.date === label.date)
      );
    };

    // Delayed = labels that were auto-rescheduled (rolled over from a previous date)
    const delayedLabels = filteredLabels.filter((l) => l.auto_rescheduled === true);
    const pendingLabels = filteredLabels.filter((l) => l.date >= today && !isLabelCompleted(l) && !l.auto_rescheduled);
    const completedLabels = filteredLabels.filter((l) => isLabelCompleted(l));

    // Apply status filter
    let statusRecords = filteredRecords;
    let statusDelayed = delayedLabels;
    let statusPending = pendingLabels;

    if (status === "completed") {
      statusDelayed = [];
      statusPending = [];
    } else if (status === "delayed") {
      statusRecords = [];
      statusPending = [];
    } else if (status === "pending") {
      statusRecords = [];
      statusDelayed = [];
    }

    // Summary
    const totalActivities = filteredLabels.length;
    const totalCompleted = completedLabels.length;
    const totalDelayed = delayedLabels.length;
    const totalHours = statusRecords.reduce((acc, r) => acc + calcHours(r.start_time, r.end_time), 0);

    // Aggregation by orchard
    const hoursByOrchardMap = {};
    statusRecords.forEach((r) => {
      const h = calcHours(r.start_time, r.end_time);
      const key = r.orchard_number || "N/A";
      hoursByOrchardMap[key] = (hoursByOrchardMap[key] || 0) + h;
    });
    const hoursByOrchard = Object.entries(hoursByOrchardMap)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours);

    // Aggregation by activity — code for X-axis, full name for tooltip
    const hoursByActivityMap = {};
    statusRecords.forEach((r) => {
      const h = calcHours(r.start_time, r.end_time);
      const code = r.operation?.split(".")[0]?.trim() || "N/A";
      const fullName = r.operation || code;
      if (!hoursByActivityMap[code]) {
        hoursByActivityMap[code] = { name: code, fullName, hours: 0 };
      }
      hoursByActivityMap[code].hours += h;
    });
    const hoursByActivity = Object.values(hoursByActivityMap)
      .map(({ name, fullName, hours }) => ({ name, fullName, hours: parseFloat(hours.toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours);

    return {
      totalActivities,
      totalCompleted,
      totalDelayed,
      totalHours,
      delayedTasks: statusDelayed,
      hoursByOrchard,
      hoursByActivity,
    };
  }, [records, labels, startDate, endDate, selectedOperators, selectedOrchards, status]);

  const isLoading = loadingRecords || loadingLabels;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Relatórios
            </h1>
            <p className="text-primary-foreground/70 text-sm">Dashboard operacional</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <DashboardFilterBar
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              operators={operatorNames}
              selectedOperators={selectedOperators}
              toggleOperator={toggleOperator}
              orchards={orchardCodes}
              selectedOrchards={selectedOrchards}
              toggleOrchard={toggleOrchard}
              status={status} setStatus={setStatus}
              onClear={clearFilters}
            />

            {/* Painel 1 — Resumo */}
            <section>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">Resumo Geral</h2>
              <SummaryCards
                total={processed.totalActivities}
                completed={processed.totalCompleted}
                delayed={processed.totalDelayed}
                totalHours={processed.totalHours}
              />
            </section>

            {/* Painel 2 — Tarefas Atrasadas */}
            <section>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Tarefas Atrasadas
              </h2>
              <DelayedTasksList tasks={processed.delayedTasks} />
            </section>

            {/* Painel 3 e 4 — Gráficos */}
            <section>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">Horas Registradas</h2>
              <ChartsSection
                hoursByOrchard={processed.hoursByOrchard}
                hoursByActivity={processed.hoursByActivity}
              />
            </section>

          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}