import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VoteRecord, LocationData, ChatMessage } from './types';
import { SAMPLE_CSV_DATA } from './constants';
import { parseCSV, aggregateByLocation } from './utils/csvParser';
import VoteMap from './components/VoteMap';
import { initializeChat, sendMessageToChat } from './services/geminiService';
import { Map, Database, Bot, Upload, Send, MapPin, Navigation, TrendingUp, Megaphone } from 'lucide-react';

function App() {
  const [rawData, setRawData] = useState<VoteRecord[]>([]);
  const [aggregatedData, setAggregatedData] = useState<LocationData[]>([]);
  const [customCsv, setCustomCsv] = useState<string>("");
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate Total Votes
  const grandTotalVotes = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => acc + curr.totalVotes, 0);
  }, [aggregatedData]);

  useEffect(() => {
    // 1. Load Data
    const parsed = parseCSV(SAMPLE_CSV_DATA);
    setRawData(parsed);
    const agg = aggregateByLocation(parsed);
    setAggregatedData(agg);

    // 2. Get User Location for Maps Grounding
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation denied or error:", error);
        }
      );
    }
  }, []);

  // Initialize Chat when data or location is ready
  useEffect(() => {
    if (aggregatedData.length > 0) {
      initializeChat({ 
        data: aggregatedData, 
        userLocation 
      });
      
      // Add welcome message if empty
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'model',
          text: '¡Hola! Soy tu estratega electoral con IA. Puedo analizar zonas calientes y sugerir dónde enfocar la publicidad basándome en la densidad de votos actual.'
        }]);
      }
    }
  }, [aggregatedData, userLocation]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCustomCsv(text);
        const parsed = parseCSV(text);
        setRawData(parsed);
        const agg = aggregateByLocation(parsed);
        setAggregatedData(agg);
        // Re-init chat with new data
        initializeChat({ data: agg, userLocation });
      };
      reader.readAsText(file);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    const response = await sendMessageToChat(text);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      groundingChunks: response.groundingChunks
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const handleQuickAction = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
               <Map className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              VotoVisión <span className="font-normal text-slate-500">Antioquia</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
             <label className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full cursor-pointer transition-colors text-sm font-medium border border-slate-200">
                <Upload className="w-4 h-4 mr-2" />
                <span>Cargar CSV</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
             </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Registros</p>
              <h3 className="text-lg font-bold text-slate-900">{rawData.length.toLocaleString()}</h3>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Puestos</p>
              <h3 className="text-lg font-bold text-slate-900">{aggregatedData.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3 border-l-4 border-l-orange-500">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Votos Totales</p>
              <h3 className="text-lg font-bold text-slate-900">{grandTotalVotes.toLocaleString()}</h3>
            </div>
          </div>

          {/* Quick Actions for Agent */}
          <button 
            onClick={() => handleQuickAction("Identifica las 3 zonas con mayor concentración de votos y sugiere una estrategia de publicidad enfocada (vallas, volantes) en esos puntos exactos.")}
            className="md:col-span-1 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 p-4 rounded-xl shadow-sm border border-purple-100 flex items-center space-x-3 transition-all text-left group"
          >
             <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Megaphone className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Estrategia</p>
              <h3 className="text-sm font-bold text-purple-900">Sugerir Publicidad</h3>
            </div>
          </button>

          <button 
             onClick={() => handleQuickAction("¿Cómo llego al puesto de votación con más votos registrados?")}
             className="md:col-span-1 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 p-4 rounded-xl shadow-sm border border-amber-100 flex items-center space-x-3 transition-all text-left group"
          >
             <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
              <Navigation className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Ruta Top</p>
              <h3 className="text-sm font-bold text-amber-900">Ir al Líder</h3>
            </div>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[650px] min-h-[500px]">
          
          {/* Main Map */}
          <div className="lg:w-2/3 h-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-200 relative">
            <VoteMap data={aggregatedData} />
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-600 max-w-xs z-[400]">
               Datos visualizados sobre centroides aproximados de puestos de votación.
            </div>
          </div>

          {/* Agent Chat Interface */}
          <div className="lg:w-1/3 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-800">Estratega IA</h2>
                  <p className="text-[10px] text-slate-500 font-medium flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1"></span>
                    Análisis de Mercado & Mapas
                  </p>
                </div>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                    }`}
                  >
                    {/* Message Text */}
                    <div className="whitespace-pre-wrap leading-relaxed">
                       {msg.role === 'model' 
                         ? <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                         : msg.text
                       }
                    </div>

                    {/* Grounding Chips (Maps/Web) */}
                    {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {msg.groundingChunks.map((chunk, idx) => {
                          if (chunk.maps) {
                            return (
                              <a 
                                key={idx} 
                                href={chunk.maps.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg p-2 transition-colors group"
                              >
                                <div className="flex items-start space-x-2">
                                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-slate-800 text-xs group-hover:text-blue-700">
                                      {chunk.maps.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center">
                                      Abrir en Google Maps <Navigation className="w-3 h-3 ml-1" />
                                    </div>
                                  </div>
                                </div>
                              </a>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
               <form 
                 onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
                 className="relative flex items-center"
               >
                 <input
                   type="text"
                   value={inputValue}
                   onChange={(e) => setInputValue(e.target.value)}
                   placeholder="Consulta estrategia o ubicación..."
                   className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-slate-700 placeholder:text-slate-400"
                 />
                 <button 
                   type="submit"
                   disabled={!inputValue.trim() || isTyping}
                   className="absolute right-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   <Send className="w-4 h-4" />
                 </button>
               </form>
               <p className="text-[10px] text-center text-slate-400 mt-2">
                 La IA puede sugerir estrategias basadas en los datos visibles.
               </p>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

export default App;