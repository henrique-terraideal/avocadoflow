import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPERATIONS } from "./OperationSelector";
import { motion } from "framer-motion";

const ORCHARDS = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);

export default function QRGenerator({ operatorName }) {
  const [operation, setOperation] = useState("");
  const [orchard, setOrchard] = useState("");

  const qrData = JSON.stringify({
    operator: operatorName,
    operation: operation,
    orchard: orchard,
  });

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-5 space-y-4"
    >
      <h3 className="font-bold text-lg">Gerar QR Code para {operatorName}</h3>

      <Select value={operation} onValueChange={setOperation}>
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue placeholder="Selecione a operação" />
        </SelectTrigger>
        <SelectContent>
          {OPERATIONS.map((op) => (
            <SelectItem key={op.id} value={op.id}>
              {op.id}. {op.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={orchard} onValueChange={setOrchard}>
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue placeholder="Selecione o pomar" />
        </SelectTrigger>
        <SelectContent>
          {ORCHARDS.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {operation && orchard && (
        <div className="flex flex-col items-center gap-3 pt-2">
          <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-xl border" />
          <p className="text-xs text-muted-foreground text-center break-all max-w-xs">{qrData}</p>
          <p className="text-sm text-muted-foreground">
            Imprima ou salve este QR Code
          </p>
        </div>
      )}
    </motion.div>
  );
}