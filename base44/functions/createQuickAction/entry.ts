import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validação básica - agente já está autenticado
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const { operator_name, orchard_number, description, photo_url, date } = await req.json();

    // Validações - pomar é opcional para Ação Rápida
    if (!operator_name || !description) {
      return Response.json({ 
        error: 'Dados incompletos. Necessário: operator_name e description',
        missing: {
          operator_name: !operator_name,
          description: !description
        }
      }, { status: 400 });
    }

    // Valida se operador existe
    const operators = await base44.entities.Operator.filter({ active: true });
    const operator = operators.find(op => 
      op.name.toLowerCase().includes(operator_name.toLowerCase()) ||
      operator_name.toLowerCase().includes(op.name.toLowerCase())
    );

    if (!operator) {
      return Response.json({ 
        error: 'Operador não encontrado',
        available_operators: operators.map(op => op.name)
      }, { status: 404 });
    }

    // Valida pomar se foi informado (opcional)
    let orchard = null;
    if (orchard_number) {
      const orchards = await base44.entities.Orchard.filter({ active: true });
      orchard = orchards.find(orc => 
        orc.code.toLowerCase() === orchard_number.toLowerCase() ||
        orchard_number.toLowerCase().includes(orc.code.toLowerCase())
      );

      if (!orchard) {
        return Response.json({ 
          error: 'Pomar não encontrado',
          available_orchards: orchards.map(o => `${o.code} - ${o.name}`)
        }, { status: 404 });
      }
    }

    // Hora atual para start_time e end_time (ação rápida)
    const now = new Date();
    const currentTime = now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });

    // Data: usa a informada ou hoje
    const recordDate = date || now.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-');

    // Monta observações com descrição e foto
    let observations = description;
    if (photo_url) {
      observations += `\n\nFoto: ${photo_url}`;
    }

    // Cria o FieldRecord
    const record = await base44.entities.FieldRecord.create({
      operator_name: operator.name,
      operator_id: operator.id,
      operation: '09 - Manutenções Gerais',
      orchard_number: orchard ? orchard.code : '',
      start_time: currentTime,
      end_time: currentTime,
      date: recordDate,
      planned_date: recordDate,
      observations: observations,
      qr_scanned: false,
      created_by_user_id: user.id
    });

    return Response.json({
      success: true,
      message: 'Ação rápida registrada com sucesso!',
      record: {
        id: record.id,
        operator: operator.name,
        operation: '09 - Manutenções Gerais',
        orchard: orchard ? orchard.code : 'Não informado',
        date: recordDate,
        time: currentTime
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});