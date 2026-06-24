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

    // Faz upload privado e gera URL assinada (temporária, acessível pelo Whisper)
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const file_uri = uploadResult.file_uri;

    if (!file_uri) return Response.json({ error: 'Falha no upload do arquivo' }, { status: 500 });

    const signedResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 300,
    });
    const audio_url = signedResult.signed_url;

    // Transcreve com Whisper
    let transcript = '';
    try {
      transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });
    } catch (transcribeErr) {
      return Response.json({ description: `(Não foi possível transcrever: ${transcribeErr.message})` });
    }

    if (!transcript || !transcript.trim()) {
      return Response.json({ description: '(Transcrição vazia — nenhuma fala detectada no arquivo)' });
    }

    const description = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `O seguinte texto é a transcrição de um ${media_type === 'video' ? 'vídeo' : 'áudio'} de um operador de campo em uma fazenda de abacate descrevendo uma atividade. Crie um resumo claro e objetivo em 1-3 frases do que foi descrito, em português:\n\n"${transcript}"`,
    });

    return Response.json({ description, transcript });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});