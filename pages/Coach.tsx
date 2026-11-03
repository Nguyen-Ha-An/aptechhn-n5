import React, { useState, useEffect, useRef } from 'react';
import { chatWithCoach } from '../services/geminiService';
import { Send, User, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const Coach: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
      { role: 'bot', text: "Hi! I'm your study coach. How can I help you focus today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const reply = await chatWithCoach(userMsg);
    setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    setLoading(false);
  };

  const quickPrompts = ["Help me make a study plan", "I'm feeling distracted", "Explain the Feynman technique"];

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4">
       <div className="flex-1 overflow-y-auto space-y-4 p-4">
           {messages.map((m, i) => (
               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`flex items-start max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                       <div className={`p-2 rounded-full ${m.role === 'user' ? 'bg-indigo-100' : 'bg-gray-100'} mx-2`}>
                           {m.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                       </div>
                       <div className={`p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                           {m.text}
                       </div>
                   </div>
               </div>
           ))}
           {loading && <div className="text-xs text-gray-400 ml-12">Thinking...</div>}
           <div ref={bottomRef} />
       </div>

       <div className="p-4 border-t border-gray-100 bg-white rounded-t-xl">
           <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
               {quickPrompts.map(p => (
                   <button key={p} onClick={() => setInput(p)} className="whitespace-nowrap px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs hover:bg-indigo-50 hover:text-indigo-600 transition">
                       {p}
                   </button>
               ))}
           </div>
           <div className="flex gap-2">
               <input 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                 placeholder="Ask your coach..."
                 className="flex-1 border border-gray-200 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
               />
               <button onClick={handleSend} disabled={loading} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50">
                   <Send size={20} />
               </button>
           </div>
       </div>
    </div>
  );
};

export default Coach;