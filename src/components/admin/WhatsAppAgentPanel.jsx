import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, ExternalLink, CheckCircle } from "lucide-react";

export default function WhatsAppAgentPanel() {
  const agentName = "quick_action_agent";
  
  // URL de conexão do WhatsApp
  const whatsappConnectUrl = base44.agents.getWhatsAppConnectURL(agentName);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Agente de Ação Rápida - WhatsApp
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp para permitir que operadores registrem manutenções via mensagem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Como funciona:</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Clique em "Conectar WhatsApp" abaixo</li>
              <li>Siga as instruções para vincular seu número</li>
              <li>Operadores poderão enviar mensagens para o número conectado</li>
              <li>O agente coletará: nome, pomar, descrição e foto automaticamente</li>
              <li>Registros serão criados no campo "Ação Rápida"</li>
            </ol>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">Funcionalidades do Agente:</p>
                <ul className="text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                  <li>Transcrição automática de áudios</li>
                  <li>Validação de operadores e pomares</li>
                  <li>Registro automático no FieldRecord</li>
                  <li>Confirmação antes de salvar</li>
                </ul>
              </div>
            </div>
          </div>

          <Button asChild className="w-full">
            <a href={whatsappConnectUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              Conectar WhatsApp
              <ExternalLink className="w-4 h-4 ml-auto" />
            </a>
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Após conectar, compartilhe o número do WhatsApp com sua equipe de campo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}