import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Retorna o template e os campos customizados para uma operação.
 * Se a operação não tiver template, retorna null/[].
 */
export function useOperationTemplate(operationId) {
  const { data: templates = [] } = useQuery({
    queryKey: ["operation-templates"],
    queryFn: () => base44.entities.OperationTemplate.list(),
    enabled: !!operationId,
  });

  const template = templates.find((t) => t.operation_id === operationId) || null;

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields", template?.id],
    queryFn: () => base44.entities.CustomField.filter({ template_id: template.id }, "sort_order", 100),
    enabled: !!template?.id,
  });

  return { template, customFields };
}