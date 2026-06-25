import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, Check, X, GripVertical, Pencil, Tag, AlertTriangle, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "photo", label: "📷 Foto" },
  { value: "audio", label: "🎤 Áudio (transcrição automática)" },
  { value: "video", label: "🎬 Vídeo (resumo automático)" },
  { value: "select_list", label: "📋 Lista de seleção (1 opção)" },
  { value: "multiple_choice", label: "☑️ Múltipla escolha" },
  { value: "hour_meter", label: "⏱️ Horímetro (inicial/final)" },
  { value: "machine_selector", label: "🚜 Seleção de Trator" },
  { value: "implement_selector", label: "🔧 Seleção de Implemento" },
  { value: "ra_selector", label: "🌿 Recomendação Agronômica (RA)" },
];

const TYPES_WITH_OPTIONS = ["select_list", "multiple_choice"];

const INPUT_STAGES = [
  { value: "planning", label: "Planejamento", icon: "📋" },
  { value: "registration", label: "Registro em campo", icon: "⚙️" },
  { value: "both", label: "Ambos", icon: "🔄" },
];

function CustomFieldRow({ field, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(field.field_label);
  const [type, setType] = useState(field.field_type);
  const [required, setRequired] = useState(field.is_required || false);
  const [showOnLabel, setShowOnLabel] = useState(field.show_on_label || false);
  const [inputStage, setInputStage] = useState(field.input_stage || "both");
  const [options, setOptions] = useState(() => {
    try { return field.options ? JSON.parse(field.options).join("\n") : ""; } catch { return ""; }
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const optionsArray = TYPES_WITH_OPTIONS.includes(type)
      ? options.split("\n").map(o => o.trim()).filter(Boolean)
      : [];
    await onUpdate(field.id, {
      field_label: label,
      field_type: type,
      is_required: required,
      show_on_label: showOnLabel,
      input_stage: inputStage,
      options: optionsArray.length > 0 ? JSON.stringify(optionsArray) : "",
    });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-muted/40 rounded-xl px-3 py-3 space-y-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm rounded-lg" placeholder="Nome do campo" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none"
        >
          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {TYPES_WITH_OPTIONS.includes(type) && (
          <textarea
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder={"Uma opção por linha:\nOpção 1\nOpção 2"}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        )}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Preencher em</p>
          <div className="flex gap-1">
            {INPUT_STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => setInputStage(s.value)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border-2 transition-all
                  ${inputStage === s.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground"}`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="w-4 h-4 accent-primary" />
            Obrigatório
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={showOnLabel} onChange={(e) => setShowOnLabel(e.target.checked)} className="w-4 h-4 accent-primary" />
            <Tag className="w-3 h-3 text-primary" />
            Mostrar na etiqueta
          </label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-8 rounded-lg flex-1 text-xs" onClick={handleSave} disabled={!label.trim() || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </Button>
          <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={() => setEditing(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  const stageInfo = INPUT_STAGES.find(s => s.value === (field.input_stage || "both")) || INPUT_STAGES[2];

  return (
    <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{field.field_label}</p>
          {field.show_on_label && <Tag className="w-3 h-3 text-primary shrink-0" title="Aparece na etiqueta" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {FIELD_TYPES.find(t => t.value === field.field_type)?.label || "Texto curto"}
          {field.is_required && " · Obrigatório"}
          <span className="ml-1">· {stageInfo.icon} {stageInfo.label}</span>
        </p>
      </div>
      <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground p-1">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => onDelete(field.id)} className="text-destructive hover:text-destructive/80 p-1">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function TemplateEditor({ template, operation, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldShowOnLabel, setNewFieldShowOnLabel] = useState(false);
  const [newFieldInputStage, setNewFieldInputStage] = useState("both");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [skipOrchard, setSkipOrchard] = useState(template.skip_orchard || false);
  const [defaultOrchard, setDefaultOrchard] = useState(template.default_orchard || "");

  const { data: orchards = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });

  const { data: fields = [], isLoading: loadingFields } = useQuery({
    queryKey: ["custom-fields", template.id],
    queryFn: () => base44.entities.CustomField.filter({ template_id: template.id }, "sort_order", 100),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationTemplate.update(template.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-templates"] });
      toast({ title: "Template atualizado!" });
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: () => {
      const optionsArray = TYPES_WITH_OPTIONS.includes(newFieldType)
        ? newFieldOptions.split("\n").map(o => o.trim()).filter(Boolean)
        : [];
      return base44.entities.CustomField.create({
        template_id: template.id,
        field_label: newFieldLabel.trim(),
        field_type: newFieldType,
        is_required: newFieldRequired,
        show_on_label: newFieldShowOnLabel,
        input_stage: newFieldInputStage,
        options: optionsArray.length > 0 ? JSON.stringify(optionsArray) : "",
        sort_order: fields.length + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", template.id] });
      setNewFieldLabel("");
      setNewFieldType("text");
      setNewFieldRequired(false);
      setNewFieldShowOnLabel(false);
      setNewFieldInputStage("both");
      setNewFieldOptions("");
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomField.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-fields", template.id] }),
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomField.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-fields", template.id] }),
  });

  const handleSaveConfig = () => {
    updateTemplateMutation.mutate({
      skip_orchard: skipOrchard,
      default_orchard: skipOrchard ? defaultOrchard : "",
    });
  };

  return (
    <div className="mt-3 space-y-4 border-t border-border pt-4">
      {/* Configuração de pomar */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configuração de Pomar</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipOrchard}
            onChange={(e) => setSkipOrchard(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm">Não exigir seleção de pomar</span>
        </label>
        {skipOrchard && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Pomar padrão (opcional)</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setDefaultOrchard("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                  ${!defaultOrchard ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/30"}`}
              >
                Nenhum
              </button>
              {orchards.map((o) => (
                <button
                  key={o.code}
                  onClick={() => setDefaultOrchard(o.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${defaultOrchard === o.code ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/30"}`}
                >
                  {o.code}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={handleSaveConfig} disabled={updateTemplateMutation.isPending}>
          {updateTemplateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar configuração
        </Button>
      </div>

      {/* Campos customizados */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campos Extras no Planejamento</p>
        {loadingFields ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : fields.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum campo extra. Adicione abaixo.</p>
        ) : (
          <div className="space-y-1.5">
            {fields.map((f) => (
              <CustomFieldRow
                key={f.id}
                field={f}
                onDelete={(id) => deleteFieldMutation.mutate(id)}
                onUpdate={(id, data) => updateFieldMutation.mutateAsync({ id, data })}
              />
            ))}
          </div>
        )}

        {/* Adicionar novo campo */}
        <div className="space-y-2 pt-1">
          <Input
            placeholder="Nome do campo (ex: Peça trocada)"
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.target.value)}
            className="h-9 rounded-xl text-sm"
          />
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value)}
            className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {TYPES_WITH_OPTIONS.includes(newFieldType) && (
            <textarea
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              placeholder={"Uma opção por linha:\nOpção 1\nOpção 2"}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          )}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Preencher em</p>
            <div className="flex gap-1">
              {INPUT_STAGES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setNewFieldInputStage(s.value)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border-2 transition-all
                    ${newFieldInputStage === s.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground"}`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={newFieldRequired}
                onChange={(e) => setNewFieldRequired(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Obrigatório
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={newFieldShowOnLabel}
                onChange={(e) => setNewFieldShowOnLabel(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <Tag className="w-3 h-3 text-primary" />
              Na etiqueta
            </label>
          </div>
          <Button
            size="sm"
            className="w-full rounded-xl h-9"
            disabled={!newFieldLabel.trim() || addFieldMutation.isPending}
            onClick={() => addFieldMutation.mutate()}
          >
            {addFieldMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Adicionar Campo
          </Button>
        </div>
      </div>

      <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs text-muted-foreground" onClick={onClose}>
        Fechar configurações
      </Button>
    </div>
  );
}

function QuickActionConfig({ operations }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config = [] } = useQuery({
    queryKey: ["app-config-quick-action"],
    queryFn: () => base44.entities.AppConfig.filter({ key: "quick_action_operation_id" }),
  });

  const currentOpId = config[0]?.value || "";
  const [selectedOpId, setSelectedOpId] = useState(null);
  const effectiveId = selectedOpId !== null ? selectedOpId : currentOpId;

  const saveMutation = useMutation({
    mutationFn: async (opId) => {
      if (config[0]?.id) {
        return base44.entities.AppConfig.update(config[0].id, { value: opId });
      } else {
        return base44.entities.AppConfig.create({ key: "quick_action_operation_id", value: opId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-config-quick-action"] });
      toast({ title: "Botão de ação rápida configurado!" });
      setSelectedOpId(null);
    },
  });

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <p className="font-semibold text-sm text-orange-800">Botão de Ação Rápida</p>
      </div>
      <p className="text-xs text-orange-700">
        Selecione a operação que será aberta ao clicar no botão laranja <AlertTriangle className="w-3 h-3 inline" /> disponível em todas as telas.
      </p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        <button
          onClick={() => setSelectedOpId("")}
          className={`w-full text-left px-3 py-2 rounded-xl text-sm border-2 transition-all
            ${effectiveId === "" ? "border-orange-500 bg-orange-100 font-semibold text-orange-800" : "border-border bg-card"}`}
        >
          Nenhum (desativado)
        </button>
        {operations.map((op) => (
          <button
            key={op.id}
            onClick={() => setSelectedOpId(op.id)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm border-2 transition-all flex items-center gap-2
              ${effectiveId === op.id ? "border-orange-500 bg-orange-100 font-semibold text-orange-800" : "border-border bg-card"}`}
          >
            <span className={`w-6 h-6 rounded-md ${op.color || "bg-primary"} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>{op.code}</span>
            {op.name}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        className="w-full rounded-xl h-9 bg-orange-500 hover:bg-orange-600 text-white"
        disabled={saveMutation.isPending || (selectedOpId === null)}
        onClick={() => saveMutation.mutate(effectiveId)}
      >
        {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
        Salvar configuração
      </Button>
    </div>
  );
}

export default function OperationTemplatePanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data: operations = [], isLoading: loadingOps } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.list("sort_order"),
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["operation-templates"],
    queryFn: () => base44.entities.OperationTemplate.list(),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (op) => base44.entities.OperationTemplate.create({
      operation_id: op.id,
      operation_code: op.code,
      skip_orchard: false,
    }),
    onSuccess: (_, op) => {
      queryClient.invalidateQueries({ queryKey: ["operation-templates"] });
      toast({ title: `Template criado para ${op.name}!` });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.OperationTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-templates"] });
      toast({ title: "Template removido" });
    },
  });

  const templateByOpId = Object.fromEntries(templates.map((t) => [t.operation_id, t]));

  // Operações que ainda não têm template
  const opsWithoutTemplate = operations.filter((op) => !templateByOpId[op.id]);
  // Operações que já têm template
  const opsWithTemplate = operations.filter((op) => !!templateByOpId[op.id]);

  if (loadingOps || loadingTemplates) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <QuickActionConfig operations={operations} />

      <div className="bg-muted/30 rounded-2xl border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Operações <strong>sem template</strong> usam o comportamento padrão: seleção de pomar obrigatória, sem campos extras. Crie um template apenas para operações que precisam de configuração especial.
        </p>
      </div>

      {/* Operações com template */}
      {opsWithTemplate.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Com Template Customizado</p>
          {opsWithTemplate.map((op) => {
            const tmpl = templateByOpId[op.id];
            const isOpen = expandedId === tmpl.id;
            return (
              <div key={op.id} className="bg-card rounded-xl border border-primary/30 p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${op.color || "bg-primary"} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-xs font-bold">{op.code}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{op.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tmpl.skip_orchard ? (tmpl.default_orchard ? `Pomar fixo: ${tmpl.default_orchard}` : "Sem pomar") : "Pomar obrigatório"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setExpandedId(isOpen ? null : tmpl.id)}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteTemplateMutation.mutate(tmpl.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {isOpen && (
                  <TemplateEditor
                    template={tmpl}
                    operation={op}
                    onClose={() => setExpandedId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Operações sem template */}
      {opsWithoutTemplate.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operações sem Template (padrão)</p>
          {opsWithoutTemplate.map((op) => (
            <div key={op.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${op.color || "bg-primary"} flex items-center justify-center shrink-0`}>
                <span className="text-white text-xs font-bold">{op.code}</span>
              </div>
              <p className="flex-1 text-sm font-medium truncate">{op.name}</p>
              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs shrink-0"
                disabled={createTemplateMutation.isPending}
                onClick={() => createTemplateMutation.mutate(op)}>
                <Plus className="w-3.5 h-3.5" />
                Criar Template
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}