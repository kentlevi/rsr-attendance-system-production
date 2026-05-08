import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Loader2, Bot, User } from 'lucide-react';
import { cn } from "../../../lib/utils";
import { useToast } from "../../../context/ToastContext";
import { leaveService } from '../../../services/LeaveService';

interface Message {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content?: string;
  name?: string;
  response?: any;
  functionCall?: any;
}

export function HrAssistantChatbot({ employee, settings }: { employee: any, settings: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi ${employee.name.split(' ')[0]}! I'm your RSR HR Assistant. How can I help you today?`
      }]);
    }
  };

  const getSystemContext = () => {
    const today = new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "full" });
    return `
Today is ${today}.
Employee Name: ${employee.name}
Employee ID: ${employee.id}
Department: ${employee.department}
Position: ${employee.position}
Leave Balances:
- Vacation Leave (VL): ${employee.vlBalance ?? 5}
- Sick Leave (SL): ${employee.slBalance ?? 5}

Company Settings:
- Standard Work Hours: ${settings.shiftStartTime} to ${settings.shiftEndTime}
- Standard Grace Period: ${settings.gracePeriodMins} minutes
- Standard Allowances: Daily ₱${settings.dailyAllowance}, OT ₱${settings.otAllowance}/hr, Away-Site ₱${settings.awaySiteAllowance}
    `.trim();
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;
    
    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let currentMessages = [...messages, userMessage];
      let done = false;
      
      while(!done) {
          const response = await fetch('/api/hr-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: currentMessages,
              context: getSystemContext()
            })
          });
    
          const data = await response.json();
          
          if (data.functionCall) {
              const { name, args } = data.functionCall;
              currentMessages.push({ role: 'assistant', functionCall: data.functionCall });
              
              if (name === 'fileLeave') {
                  const { type, startDate, endDate, reason } = args;
                  try {
                      await leaveService.addRequest({
                          employeeId: employee.id,
                          type: type,
                          startDate: startDate,
                          endDate: endDate,
                          reason: reason,
                          status: 'Pending'
                      });
                      
                      const toolResult: Message = {
                          role: 'tool',
                          name: 'fileLeave',
                          response: { success: true, message: "Leave filed successfully." }
                      };
                      currentMessages.push(toolResult);
                      setMessages(currentMessages);
                  } catch(e: any) {
                      const toolResult: Message = {
                          role: 'tool',
                          name: 'fileLeave',
                          response: { success: false, error: e.message }
                      };
                      currentMessages.push(toolResult);
                      setMessages(currentMessages);
                  }
              }
          } else if (data.text) {
              const assistantMessage: Message = { role: 'assistant', content: data.text };
              currentMessages.push(assistantMessage);
              setMessages(currentMessages);
              done = true;
          } else {
              done = true;
          }
      }
      
    } catch (error) {
      showToast("Failed to connect to HR Assistant.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-transform hover:scale-105 z-50",
          isOpen ? "bg-[#DC2626] text-white" : "bg-[#0B7A4B] text-white"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-border flex flex-col z-50 overflow-hidden" style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}>
          <div className="bg-[#0B7A4B] text-white p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-[15px]">AI HR Assistant</h3>
              <p className="text-white/80 text-[12px]">Online</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#F8FAFC]">
            {messages.filter(m => m.role === 'user' || (m.role === 'assistant' && m.content)).map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2 max-w-[85%]",
                  msg.role === 'user' ? "self-end flex-row-reverse" : "self-start"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                  msg.role === 'user' ? "bg-[#CBD5E1] text-[#475569]" : "bg-[#0B7A4B]/10 text-[#0B7A4B]"
                )}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={cn(
                  "p-3 rounded-2xl text-[14px] leading-relaxed relative",
                  msg.role === 'user' 
                    ? "bg-[#0B7A4B] text-white rounded-tr-none" 
                    : "bg-white border border-border shadow-sm text-[#1a1a1a] rounded-tl-none"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="self-start flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0B7A4B]/10 text-[#0B7A4B] flex items-center justify-center">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-border shadow-sm rounded-2xl rounded-tl-none p-4 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-border">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder="Ask me anything..."
                className="w-full bg-[#F1F5F9] rounded-full pl-4 pr-12 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0B7A4B]/20 transition-all border border-transparent focus:border-[#0B7A4B]/30"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[#096A41]"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
