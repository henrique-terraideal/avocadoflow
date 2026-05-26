import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import OperationFilter from "./OperationFilter";

export default function OperationSelector({ selectedId, onSelect }) {
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.list("sort_order"),
    select: (data) => data.filter((op) => op.active),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <OperationFilter
      operations={operations}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}