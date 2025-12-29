import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { LocationData } from '../types';

let chatSession: Chat | null = null;

interface InitParams {
  data: LocationData[];
  userLocation?: { lat: number; lng: number };
}

export const initializeChat = ({ data, userLocation }: InitParams) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Calculate Grand Total
  const grandTotal = data.reduce((sum, item) => sum + item.totalVotes, 0);

  // Group by Parent Location (Commune) for summary
  const summaryByZone: Record<string, { total: number }> = {};
  
  data.forEach(d => {
    if (!summaryByZone[d.parentLocation]) {
      summaryByZone[d.parentLocation] = { total: 0 };
    }
    summaryByZone[d.parentLocation].total += d.totalVotes;
  });

  const zoneSummaryText = Object.entries(summaryByZone)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)
    .map(([zone, stats]) => `- ${zone}: ${stats.total} votos totales.`)
    .join('\n');

  // Top Polling Places for specific targeting
  const topPollingPlaces = data
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 10)
    .map(d => {
       return `- Puesto "${d.name}" en ${d.parentLocation} con ${d.totalVotes} votos.`;
    })
    .join('\n');

  const systemInstruction = `
    Eres "EstrategaBot", el experto en marketing político y geografía electoral de VotoVisión Antioquia.
    
    ESTADÍSTICAS ACTUALES:
    - Total General de Votos en Mapa: ${grandTotal}
    
    DESGLOSE POR ZONAS (Mayor a menor densidad):
    ${zoneSummaryText}
    
    TOP 10 PUESTOS DE VOTACIÓN (Puntos Calientes):
    ${topPollingPlaces}
    
    TU MISIÓN:
    1. ANALISTA DE CAMPAÑA: Identifica dónde están los votos. Si el usuario pregunta por "Estrategia" o "Publicidad", debes sugerir enfocar recursos (vallas, volanteo, eventos) en los puestos y zonas con MAYOR densidad de votos listados arriba.
    2. CONSULTOR GEOGRÁFICO: Usa 'googleMaps' para ubicar estos puestos clave.
    
    REGLAS DE RESPUESTA:
    - Si preguntan "Sugerir publicidad", responde con un plan de acción concreto: "Basado en la alta densidad, recomiendo instalar vallas cerca de [Puesto Top 1] y [Puesto Top 2] en la comuna [Zona], ya que concentran X votos."
    - Sé persuasivo y estratégico.
    - Respuestas concisas en español.
  `;

  const config: any = {
    systemInstruction,
    tools: [{ googleMaps: {} }],
  };

  if (userLocation) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: userLocation.lat,
          longitude: userLocation.lng
        }
      }
    };
  }

  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config
  });

  return chatSession;
};

export const sendMessageToChat = async (message: string) => {
  if (!chatSession) {
    throw new Error("Chat session not initialized");
  }

  try {
    const response: GenerateContentResponse = await chatSession.sendMessage({ message });
    
    return {
      text: response.text || "Lo siento, no pude generar una estrategia en este momento.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return {
      text: "Error analizando la estrategia. Intente nuevamente.",
      groundingChunks: []
    };
  }
};