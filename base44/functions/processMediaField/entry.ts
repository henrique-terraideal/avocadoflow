import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, media_type } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    // Transcribe audio track (works for audio and video files)
    let transcript = "";
    try {
      transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: file_url });
    } catch (transcribeErr) {
      return Response.json({ description: "(Não foi possível transcrever o conteúdo — verifique o formato do arquivo)" });
    }

    if (!transcript || !transcript.trim()) {
      return Response.json({ description: "(Transcrição vazia — nenhuma fala detectada no arquivo)" });
    }

    const description = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `O seguinte texto é a transcrição de um ${media_type === "video" ? "vídeo" : "áudio"} de um operador de campo em uma fazenda de abacate descrevendo uma atividade. Crie um resumo claro e objetivo em 1-3 frases do que foi descrito, em português:\n\n"${transcript}"`,
    });

    return Response.json({ description, transcript });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});