import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Camera, Mic, Video, Loader2, CheckCircle, RotateCcw, Square } from "lucide-react";

/**
 * Renderiza os campos customizados de um template.
 * values: { [field_label]: string }
 * onChange: (newValues) => void
 */
export default function CustomFieldsInput({ fields, values, onChange }) {
  if (!fields || fields.length === 0) return null;

  const handleChange = (label, value) => {
    onChange({ ...values, [label]: value });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Detalhes da Atividade</p>
      {fields.map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          value={values[field.field_label] || ""}
          onChange={(val) => handleChange(field.field_label, val)}
        />
      ))}
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const label = (
    <label className="text-xs font-medium text-muted-foreground mb-1 block">
      {field.field_label}
      {field.is_required && <span className="text-destructive ml-1">*</span>}
    </label>
  );

  if (field.field_type === "textarea") {
    return (
      <div>
        {label}
        <TextareaWithAudio value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.field_type === "photo") {
    return (
      <div>
        {label}
        <PhotoField value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.field_type === "audio") {
    return (
      <div>
        {label}
        <AudioRecorderField value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.field_type === "video") {
    return (
      <div>
        {label}
        <MediaField type="video" value={value} onChange={onChange} accept="video/*" />
      </div>
    );
  }

  return (
    <div>
      {label}
      <Input
        type={field.field_type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.field_label}
        className="h-11 rounded-xl"
      />
    </div>
  );
}

function TextareaWithAudio({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });

        try {
          setTranscribing(true);
          const response = await base44.functions.invoke("processMediaField", {
            file,
            media_type: "audio",
          });
          if (response.data?.error) throw new Error(response.data.error);
          const transcript = response.data?.description || "";
          onChange(value ? `${value}\n${transcript}` : transcript);
        } catch (err) {
          alert(`Erro ao transcrever: ${err.message}`);
        } finally {
          setTranscribing(false);
          // Limpar stream
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite ou use o microfone para gravar..."
        rows={4}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={transcribing}
        type="button"
        className="absolute right-2 bottom-2 p-2 rounded-lg transition-colors disabled:opacity-50"
        title={recording ? "Parar gravação" : "Gravar áudio"}
      >
        {transcribing ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : recording ? (
          <Square className="w-4 h-4 text-red-500 fill-red-500" />
        ) : (
          <Mic className="w-4 h-4 text-muted-foreground hover:text-primary" />
        )}
      </button>
      {recording && (
        <div className="absolute left-2 bottom-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-500 font-medium">Gravando...</span>
        </div>
      )}
    </div>
  );
}

function AudioRecorderField({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });

        try {
          setTranscribing(true);
          const response = await base44.functions.invoke("processMediaField", {
            file,
            media_type: "audio",
          });
          if (response.data?.error) throw new Error(response.data.error);
          onChange(response.data?.description || "(Sem descrição gerada)");
        } catch (err) {
          onChange(`(Erro: ${err.message})`);
        } finally {
          setTranscribing(false);
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleReset = () => {
    onChange("");
  };

  if (transcribing) {
    return (
      <div className="w-full h-24 rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-medium">Transcrevendo...</span>
      </div>
    );
  }

  if (value) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">{value}</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Gravar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
      {recording ? (
        <>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-500">Gravando...</span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Square className="w-4 h-4 fill-white" />
            <span className="text-xs font-medium">Parar</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={startRecording}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Mic className="w-6 h-6" />
          </button>
          <span className="text-xs font-medium text-muted-foreground">Toque para gravar áudio</span>
        </>
      )}
    </div>
  );
}

function PhotoField({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  if (value) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border">
        <img src={value} alt="Foto" className="w-full max-h-48 object-cover" />
        <button
          onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}
          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
        <span className="text-xs font-medium">{uploading ? "Enviando..." : "Tirar foto ou escolher arquivo"}</span>
      </button>
    </>
  );
}

function MediaField({ type, value, onChange, accept }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const isAudio = type === "audio";
  const Icon = isAudio ? Mic : Video;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await base44.functions.invoke("processMediaField", {
        file,
        media_type: type,
      });
      if (response.data?.error) throw new Error(response.data.error);
      onChange(response.data?.description || "(Sem descrição gerada)");
    } catch (err) {
      onChange(`(Erro ao processar: ${err.message || "tente novamente"})`);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (uploading) {
    return (
      <div className="w-full h-24 rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-medium">{isAudio ? "Transcrevendo..." : "Analisando vídeo..."}</span>
      </div>
    );
  }

  if (value) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">{value}</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Gravar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} capture={isAudio ? "user" : "environment"} className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
        <span className="text-xs font-medium">
          {uploading ? "Enviando..." : isAudio ? "Gravar áudio" : "Gravar vídeo"}
        </span>
      </button>
    </>
  );
}