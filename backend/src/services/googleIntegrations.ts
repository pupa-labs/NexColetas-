import { GoogleGenAI } from '@google/genai';
import firebaseConfig from '../../../firebase-applet-config.json';

export interface IntegrationsStatus {
  googleMaps: {
    configured: boolean;
    services: string[];
    envVarRequired: string;
    regionDefault: string;
  };
  geminiAi: {
    configured: boolean;
    capabilities: string[];
    envVarRequired: string;
  };
  firebase: {
    configured: boolean;
    projectId: string;
    authEnabled: boolean;
    pushPwaReady: boolean;
  };
}

export function getGoogleIntegrationsStatus(): IntegrationsStatus {
  const mapsKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    '';
  const geminiKey = process.env.GEMINI_API_KEY || '';

  return {
    googleMaps: {
      configured: Boolean(mapsKey && mapsKey !== 'MY_MAPS_KEY'),
      services: [
        'Maps JavaScript API',
        'Places API',
        'Geocoding API',
        'Routes API',
        'Address Validation API',
      ],
      envVarRequired: 'VITE_GOOGLE_MAPS_API_KEY / GOOGLE_MAPS_SERVER_API_KEY',
      regionDefault: 'Manhuaçu - MG (-20.2572, -42.0336)',
    },
    geminiAi: {
      configured: Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY'),
      capabilities: [
        'Assistente Operacional NexColetas',
        'Triagem de Atendimento Automatizado',
        'Análise de Eficiência de Rotas Regionais',
        'Classificação de Ocorrências',
      ],
      envVarRequired: 'GEMINI_API_KEY',
    },
    firebase: {
      configured: Boolean(
        firebaseConfig?.projectId &&
          firebaseConfig.projectId !== 'remixed-project-id'
      ),
      projectId: firebaseConfig?.projectId || 'não-configurado',
      authEnabled: true,
      pushPwaReady: Boolean(process.env.VITE_FIREBASE_VAPID_KEY),
    },
  };
}

/**
 * Classificação inteligente de chamado de suporte ou solicitação operacional via Gemini (se GEMINI_API_KEY estiver configurada)
 */
export async function classifySupportTicketWithGemini(message: string): Promise<{
  category: string;
  priority: 'ALTA' | 'MÉDIA' | 'NORMAL';
  suggestedReply: string;
  usedLiveGemini: boolean;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      category: 'Triagem Operacional Manhuaçu',
      priority: 'NORMAL',
      suggestedReply:
        'Recebemos sua solicitação na central NexColetas Manhuaçu - MG. Um operador regional analisará seu protocolo em instantes.',
      usedLiveGemini: false,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Você é o módulo de classificação operacional do SaaS de logística NexColetas em Manhuaçu - MG.
Analise a mensagem do cliente/operador abaixo e responda em português brasileiro de forma objetiva (máximo 2 frases) com a orientação operacional recomendada:
Mensagem: "${message}"`,
    });

    return {
      category: 'Atendimento Inteligente NexColetas',
      priority: message.toLowerCase().includes('atraso') || message.toLowerCase().includes('urgente') ? 'ALTA' : 'NORMAL',
      suggestedReply:
        response.text ||
        'Solicitação registrada e encaminhada para a equipe de despacho de Manhuaçu - MG.',
      usedLiveGemini: true,
    };
  } catch (error) {
    console.error('Aviso na integração Gemini:', error);
    return {
      category: 'Triagem Padrão (Contingência)',
      priority: 'NORMAL',
      suggestedReply:
        'Protocolo registrado na central NexColetas Manhuaçu - MG. Acompanhe o status pelo painel.',
      usedLiveGemini: false,
    };
  }
}
