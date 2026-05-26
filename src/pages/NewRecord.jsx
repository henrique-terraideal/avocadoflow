import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, QrCode, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

import StepIndicator from "../components/field/StepIndicator";
import OperatorSelector from "../components/field/OperatorSelector";
import OperationSelector from "../components/field/OperationSelector";
import OrchardSelector from "../components/field/OrchardSelector";
import TimeEntry from "../components/field/TimeEntry";
import ReviewCard from "../components/field/ReviewCard";
import QRScanner from "../components/field/QRScanner";
import BottomNav from "../components/field/BottomNav";

export default function NewRecord() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [selectedOrchard, setSelectedOrchard] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
  });

  const handleQRScan = (rawValue) => {
    setShowScanner(false);
    try {
      const data = JSON.parse(rawValue);
      if (data.operator) {
        const found = operators.find(o => o.name.toLowerCase() === data.operator.toLowerCase());
        if (found) setSelectedOperator(found);
      }
      if (data.operation) {
        // QR operation field maps to operation code; will be resolved by OperationSelector
        setSelectedOperation({ id: data.operation, name: data.operation_name || data.operation });
      }
      if (data.orchard) {
        setSelectedOrchard(data.orchard);
      }
      // Jump to time step if all pre-filled
      if (data.operator && data.operation && data.orchard) {
        setStep(3);
      }
      toast({ title: "QR Code lido!", description: "Dados preenchidos automaticamente." });
    } catch {
      toast({ title: "QR Code inválido", description: "Formato não reconhecido.", variant: "destructive" });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedOperator;
      case 1: return !!selectedOperation;
      case 2: return !!selectedOrchard;
      case 3: return !!startTime && !!endTime;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.FieldRecord.create({
      operator_name: selectedOperator.name,
      operator_id: selectedOperator.id,
      operation: `${selectedOperation.id}. ${selectedOperation.name}`,
      orchard_number: selectedOrchard,
      start_time: startTime,
      end_time: endTime,
      date: today,
      qr_scanned: false,
    });
    queryClient.invalidateQueries({ queryKey: ["field-records"] });
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setStep(0);
    setSelectedOperator(null);
    setSelectedOperation(null);
    setSelectedOrchard(null);
    setStartTime("");
    setEndTime("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-6"
        >
          <Check className="w-12 h-12 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Registrado!</h2>
        <p className="text-muted-foreground text-center mb-8">
          Operação registrada com sucesso.
        </p>
        <Button onClick={handleReset} size="lg" className="rounded-xl px-8 h-14 text-lg">
          Novo Registro
        </Button>
      </div>
    );
  }

  const recordData = {
    operator_name: selectedOperator?.name || "",
    operation: selectedOperation ? `${selectedOperation.id}. ${selectedOperation.name}` : "",
    orchard_number: selectedOrchard || "",
    start_time: startTime,
    end_time: endTime,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 pb-8 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">HP Avocado</h1>
            <p className="text-primary-foreground/70 text-sm">Boletim Diário de Serviços</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowScanner(true)}
            className="rounded-xl gap-2"
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </Button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="max-w-lg mx-auto px-4 -mt-3">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-2">
          <StepIndicator currentStep={step} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Quem está operando?</h2>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : operators.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum operador cadastrado.</p>
                  <p className="text-sm mt-1">Cadastre operadores na aba Admin.</p>
                </div>
              ) : (
                <OperatorSelector operators={operators} selectedId={selectedOperator?.id} onSelect={(op) => setSelectedOperator(op)} />
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Qual operação?</h2>
              <OperationSelector selectedId={selectedOperation?.id} onSelect={(op) => setSelectedOperation({ id: op.id, name: op.name })} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Qual pomar?</h2>
              <OrchardSelector selected={selectedOrchard} onSelect={setSelectedOrchard} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Horários</h2>
              <TimeEntry
                startTime={startTime}
                endTime={endTime}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
              <div className="mt-6">
                <ReviewCard data={recordData} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep(step - 1)}
              className="rounded-xl h-14 px-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
          )}
          <Button
            size="lg"
            disabled={!canProceed() || submitting}
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else handleSubmit();
            }}
            className="flex-1 rounded-xl h-14 text-lg"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : step < 3 ? (
              <>
                Próximo
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Registrar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* QR Scanner */}
      <AnimatePresence>
        {showScanner && (
          <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}