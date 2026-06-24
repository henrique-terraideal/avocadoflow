import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    const media_type = formData.get('media_type') || 'audio';

    if (!file) return Response.json({ error: 'Arquivo não recebido' }, { status: 400 });

    // Upload público — retorna URL acessível
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const audio_url = uploadResult.file_url;

    if (!audio_url) return Response.json({ error: 'Falha no upload do arquivo' }, { status: 500 });

    // Transcreve com Whisper (rápido)
    let transcript = '';
    try {
      transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });
    } catch (transcribeErr) {
      return Response.json({ description: `(Erro na transcrição: ${transcribeErr.message})` });
    }

    if (!transcript || !transcript.trim()) {
      return Response.json({ description: '(Nenhuma fala detectada)' });
    }

    // Retorna a transcrição direta — mais rápido que usar LLM para resumir
    return Response.json({ description: transcript.trim() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});