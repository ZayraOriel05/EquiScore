import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Bot, 
  User, 
  TrendingUp, 
  Wallet, 
  Calendar,
  Send,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { fetchLoanDetails, getCreditScore, chatWithAssistant, UserData } from './api';

// --- Components ---

const StatCard = ({ label, value, icon: Icon, color = "text-brandGreen" }: any) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-brandLightGreen space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-gray-500 text-sm font-medium">{label}</span>
      <Icon size={18} className={color} />
    </div>
    <div className="text-2xl font-bold text-textDark">{value}</div>
  </div>
);

const DashboardView = ({ data }: { data: UserData | null }) => {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-textDark tracking-tight">Welcome Back, {data?.user || 'Borrower'}!</h1>
          <p className="text-gray-500 mt-1 text-lg">Here is your current financial overview</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-brandLightGreen">
          <div className="w-12 h-12 bg-brandGreen rounded-full flex items-center justify-center text-white">
            <User size={24} />
          </div>
          <span className="font-bold text-textDark">{data?.user || 'Demo User'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Credit Score Ring */}
        <div className="bg-white p-8 rounded-4xl shadow-sm border border-brandLightGreen flex flex-col items-center justify-center text-center space-y-6">
          <h3 className="text-gray-500 font-bold uppercase tracking-widest text-xs">Current Credit Score</h3>
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-brandLightGreen" />
              <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * 640) / 850} strokeLinecap="round" className="text-brandGreen" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-black text-textDark">640</span>
              <span className="text-xs font-bold text-brandGreen uppercase">Good</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 max-w-[200px]">Your score is based on alternative financial indicators.</p>
        </div>

        {/* Debt Progress Card */}
        <div className="bg-white p-8 rounded-4xl shadow-sm border border-brandLightGreen space-y-6">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loan Repayment</h3>
            <Wallet className="text-brandGreen" size={20} />
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-textDark">${data?.loan_balance || '1,967.00'}</div>
            <p className="text-sm text-gray-400">Outstanding Balance</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-500">Paid: 10%</span>
              <span className="text-brandGreen">${(data?.loan_balance || 1967) * 0.1}</span>
            </div>
            <div className="w-full bg-brandLightGreen h-4 rounded-full overflow-hidden border border-brandGreen/10">
              <div className="bg-brandGreen h-full w-[10%] transition-all duration-1000" />
            </div>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 gap-4">
          <StatCard label="Monthly Income" value={`$${data?.income || '10,000'}`} icon={TrendingUp} />
          <StatCard label="Total Savings" value={`$${data?.savings || '500'}`} icon={Wallet} />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white p-8 rounded-4xl shadow-sm border border-brandLightGreen">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-textDark flex items-center gap-3">
            <Calendar className="text-brandGreen" size={28} />
            Upcoming Loan Payments
          </h3>
          <button className="text-brandGreen text-sm font-bold flex items-center gap-1 hover:underline">
            Manage All <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brandLightGreen">
              <tr className="text-gray-500 text-sm">
                <th className="p-4 font-bold rounded-l-2xl">Date</th>
                <th className="p-4 font-bold">Amount</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right rounded-r-2xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brandLightGreen">
              <tr className="hover:bg-brandLightGreen/50 transition">
                <td className="p-4 font-medium">Oct 17, 2026</td>
                <td className="p-4 font-bold text-brandGreen">$100.00</td>
                <td className="p-4">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Pending</span>
                </td>
                <td className="p-4 text-right">
                  <button className="px-6 py-2 bg-brandGreen text-white rounded-xl text-xs font-bold hover:shadow-lg transition active:scale-95">Pay Now</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AssistantView = ({ userId }: { userId: number }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Welcome to your AI Financial Coach. I have analyzed your dashboard. How can I help you grow your business today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (text: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    if (text) setInput('');
    setLoading(true);

    try {
      const response = await chatWithAssistant(userId, msg);
      setMessages(prev => [...prev, { role: 'ai', text: response.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'I am having trouble connecting to my brain. Please check the server!' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full flex gap-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Chat Window */}
      <div className="flex-1 bg-white rounded-4xl border border-brandLightGreen shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-brandLightGreen bg-brandGrey flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brandGreen rounded-full flex items-center justify-center text-white">
              <Bot size={20} />
            </div>
            <span className="font-black text-lg text-textDark">AI Financial Coach</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-brandGreen bg-brandLightGreen px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-brandGreen rounded-full animate-pulse" />
            Live Analysis Active
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-4 rounded-3xl ${m.role === 'user' ? 'bg-brandGreen text-white rounded-tr-none shadow-md' : 'bg-brandLightGreen text-textDark rounded-tl-none border border-brandGreen/10'}`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-gray-400 italic ml-2">Coach is analyzing your data...</div>}
        </div>
        
        <div className="p-6 border-t border-brandLightGreen flex gap-4 bg-white">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
            type="text" 
            placeholder="Ask about your debt, savings or a business plan..." 
            className="flex-1 p-4 rounded-2xl border border-brandLightGreen outline-none focus:ring-2 focus:ring-brandGreen transition bg-brandGrey"
          />
          <button onClick={() => handleSend(input)} className="p-4 bg-brandGreen text-white rounded-2xl hover:shadow-lg transition active:scale-95">
            <Send size={24} />
          </button>
        </div>
      </div>
      
      {/* Quick Questions Panel */}
      <div className="w-96 space-y-6">
        <div className="bg-white p-8 rounded-4xl border border-brandLightGreen shadow-sm space-y-6">
          <h3 className="font-black text-xl text-textDark flex items-center gap-2">
            <MessageSquare className="text-brandGreen" size={24} />
            Quick Questions
          </h3>
          <div className="space-y-3">
            {[
              { q: "Recommend a plan to get rid of my debt", icon: <TrendingUp size={16}/> },
              { q: "How can I increase my credit score?", icon: <TrendingUp size={16}/> },
              { q: "Create a budgeting plan for my business", icon: <Wallet size={16}/> },
              { q: "What are the best savings goals for me?", icon: <CheckCircle2 size={16}/> },
            ].map((item, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(item.q)}
                className="w-full text-left p-4 rounded-2xl bg-brandGrey border border-transparent hover:border-brandGreen hover:bg-brandLightGreen transition-all group flex items-center gap-3"
              >
                <div className="p-2 bg-white rounded-lg text-brandGreen group-hover:bg-brandGreen group-hover:text-white transition">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-textDark">{item.q}</span>
              </button>
            ))}
          </div>
          <div className="mt-8 p-6 bg-brandGreen text-white rounded-3xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase opacity-70 mb-1">AI Insight</p>
              <p className="text-lg font-bold leading-tight">Your ability to save $500 suggests a high potential for credit growth!</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12">
              <Bot size={80} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'helper' | 'assistant'>('dashboard');
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetchLoanDetails(1)
      .then(setUserData)
      .catch(err => console.error('Error loading data:', err));
  }, []);

  return (
    <div className="min-h-screen bg-brandLightGreen flex font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-24 bg-white border-r border-brandLightGreen flex flex-col items-center py-10 space-y-10 shadow-sm">
        <div className="w-14 h-14 bg-brandGreen rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl rotate-3">
          <span className="font-black text-2xl">ES</span>
        </div>
        
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`p-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-brandGreen text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-brandLightGreen'}`}
          title="Dashboard"
        >
          <LayoutDashboard size={28} />
        </button>
        
        <button 
          onClick={() => setActiveTab('helper')}
          className={`p-4 rounded-2xl transition-all ${activeTab === 'helper' ? 'bg-brandGreen text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-brandLightGreen'}`}
          title="AI Helper"
        >
          <MessageSquare size={28} />
        </button>
        
        <button 
          onClick={() => setActiveTab('assistant')}
          className={`p-4 rounded-2xl transition-all ${activeTab === 'assistant' ? 'bg-brandGreen text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-brandLightGreen'}`}
          title="Assistant"
        >
          <Bot size={28} />
        </button>
      </nav>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && <DashboardView data={userData} />}
        {activeTab === 'helper' && <div className="p-8 text-center text-gray-500 mt-20 font-bold">AI Helper content is integrated into the Assistant View for a better experience. Please click the Bot icon!</div>}
        {activeTab === 'assistant' && <AssistantView userId={1} />}
      </main>
    </div>
  );
}
