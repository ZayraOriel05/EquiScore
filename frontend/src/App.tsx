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
  ArrowUpRight
} from 'lucide-react';
import { fetchLoanDetails, getCreditScore, chatWithAssistant, UserData } from './api';

// --- Sub-Component: Dashboard View ---
const DashboardView = ({ data }: { data: UserData | null }) => {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-textDark">Welcome Back, {data?.user || 'Borrower'}!</h1>
          <p className="text-gray-500">Here's your account overview</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-full shadow-sm border border-brandLightGreen">
          <div className="w-10 h-10 bg-brandGreen rounded-full flex items-center justify-center text-white">
            <User size={20} />
          </div>
          <span className="pr-4 font-medium">{data?.user || 'User'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Credit Score Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-brandLightGreen flex flex-col items-center justify-center text-center space-y-4">
          <h3 className="text-gray-500 font-medium">Credit Score</h3>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64" cy="64" r="58"
                stroke="currentColor" strokeWidth="12"
                fill="transparent" className="text-brandLightGreen"
              />
              <circle
                cx="64" cy="64" r="58"
                stroke="currentColor" strokeWidth="12"
                fill="transparent" strokeDasharray={364}
                strokeDashoffset={364 - (364 * 640) / 850} 
                strokeLinecap="round" className="text-brandGreen"
              />
            </svg>
            <span className="absolute text-3xl font-bold text-textDark">640</span>
          </div>
          <p className="text-sm text-gray-400">Good standing - Keep it up!</p>
        </div>

        {/* Loan Balance Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-brandLightGreen space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 font-medium">Loan Balance</h3>
            <Wallet className="text-brandGreen" size={20} />
          </div>
          <div className="text-4xl font-bold text-textDark">${data?.loan_balance || '1,967.00'}</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Paid: 10%</span>
              <span className="text-gray-400">${(data?.loan_balance || 1967) * 0.1}</span>
            </div>
            <div className="w-full bg-brandLightGreen h-3 rounded-full overflow-hidden">
              <div className="bg-brandGreen h-full w-[10%]" />
            </div>
          </div>
        </div>

        {/* Income/Savings Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-brandLightGreen space-y-4">
          <h3 className="text-gray-500 font-medium mb-4">Financial Health</h3>
          <div className="flex justify-between items-center p-3 bg-brandLightGreen rounded-2xl">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-brandGreen" size={18} />
              <span className="text-sm font-medium">Monthly Income</span>
            </div>
            <span className="font-bold">${data?.income || '10,000'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-brandLightGreen rounded-2xl">
            <div className="flex items-center gap-3">
              <Wallet className="text-brandGreen" size={18} />
              <span className="text-sm font-medium">Total Savings</span>
            </div>
            <span className="font-bold">${data?.savings || '500'}</span>
          </div>
        </div>
      </div>

      {/* Upcoming Payments Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-brandLightGreen">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-textDark flex items-center gap-2">
            <Calendar className="text-brandGreen" size={22} />
            Upcoming Loan Payments
          </h3>
          <button className="text-brandGreen text-sm font-bold flex items-center gap-1 hover:underline">
            View All <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-brandLightGreen">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brandLightGreen">
              <tr className="text-sm">
                <td className="py-4 font-medium">Oct 17, 2026</td>
                <td className="py-4 font-bold">$100.00</td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>
                </td>
                <td className="py-4 text-right">
                  <button className="px-4 py-1 bg-brandGreen text-white rounded-lg text-xs font-bold hover:bg-opacity-90 transition">Pay Now</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: AI Helper View ---
const HelperView = () => {
  return (
    <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-textDark">What Are We Learning Today?</h2>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ask me anything..." 
              className="w-full p-4 pl-5 pr-12 rounded-2xl border border-brandLightGreen focus:ring-2 focus:ring-brandGreen outline-none transition"
            />
            <button className="absolute right-3 top-3 p-2 bg-brandGreen text-white rounded-xl">
              <Send size={18} />
            </button>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-brandLightGreen">
            <p className="text-gray-500 italic">"How can I improve my credit score using my mobile money history?"</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-brandGreen text-white p-6 rounded-3xl shadow-lg space-y-3">
            <h4 className="font-bold flex items-center gap-2">
              <TrendingUp size={18} /> Debt Repayment
            </h4>
            <p className="text-sm opacity-90">You have been consistently meeting your deadlines. See how you can adjust your goals to meet your target.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-brandLightGreen shadow-sm space-y-3">
            <h4 className="font-bold text-brandGreen flex items-center gap-2">
              <Wallet size={18} /> Savings Balance
            </h4>
            <p className="text-sm text-gray-500">You are not on track to meet your saving goal. See how you can adjust your spending.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-brandLightGreen shadow-sm space-y-3">
            <h4 className="font-bold text-brandGreen flex items-center gap-2">
              <TrendingUp size={18} /> Financial Advice
            </h4>
            <p className="text-sm text-gray-500">You seem to be generating more income. See how this could potentially help your credit score increase.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: Assistant View ---
const AssistantView = ({ userId }: { userId: number }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your EquiScore Assistant. How can I help you manage your finances today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAssistant(userId, input);
      setMessages(prev => [...prev, { role: 'ai', text: response.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I had a glitch. Try again!' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-12rem)] flex gap-6 animate-in fade-in duration-500">
      <div className="flex-1 bg-white rounded-3xl border border-brandLightGreen shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-brandLightGreen bg-brandGrey flex items-center gap-3">
          <Bot className="text-brandGreen" />
          <span className="font-bold">AI Financial Coach</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${m.role === 'user' ? 'bg-brandGreen text-white rounded-tr-none' : 'bg-brandLightGreen text-textDark rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-gray-400 italic">Coach is thinking...</div>}
        </div>
        <div className="p-4 border-t border-brandLightGreen flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            type="text" 
            placeholder="Ask about your budget..." 
            className="flex-1 p-3 rounded-xl border border-brandLightGreen outline-none focus:ring-2 focus:ring-brandGreen"
          />
          <button onClick={handleSend} className="p-3 bg-brandGreen text-white rounded-xl hover:bg-opacity-90 transition">
            <Send size={20} />
          </button>
        </div>
      </div>
      
      <div className="w-80 space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-brandLightGreen shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-brandGreen">Your Action Plan</h3>
          <div className="space-y-3">
            {[
              'Make all payments on time',
              'Keep credit utilization below 30%',
              'Avoid opening new credit accounts'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-brandLightGreen transition cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-brandGreen text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{i+1}</div>
                <span className="text-sm text-gray-600">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-brandLightGreen rounded-2xl border border-brandGreen/20 text-center">
            <p className="text-xs text-gray-500 uppercase font-bold">Potential Score Increase</p>
            <p className="text-2xl font-black text-brandGreen">+40 to 60 points</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'helper' | 'assistant'>('dashboard');
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetchLoanDetails(1) // Assuming User ID 1 for demo
      .then(setUserData)
      .catch(err => console.error('Error loading data:', err));
  }, []);

  return (
    <div className="min-h-screen bg-brandLightGreen flex">
      {/* Sidebar Navigation */}
      <nav className="w-24 bg-white border-r border-brandLightGreen flex flex-col items-center py-8 space-y-8 shadow-sm">
        <div className="w-12 h-12 bg-brandGreen rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
          <span className="font-black text-xl">E</span>
        </div>
        
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`p-3 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-brandGreen text-white shadow-md scale-110' : 'text-gray-400 hover:bg-brandLightGreen'}`}
        >
          <LayoutDashboard size={24} />
        </button>
        
        <button 
          onClick={() => setActiveTab('helper')}
          className={`p-3 rounded-2xl transition-all ${activeTab === 'helper' ? 'bg-brandGreen text-white shadow-md scale-110' : 'text-gray-400 hover:bg-brandLightGreen'}`}
        >
          <MessageSquare size={24} />
        </button>
        
        <button 
          onClick={() => setActiveTab('assistant')}
          className={`p-3 rounded-2xl transition-all ${activeTab === 'assistant' ? 'bg-brandGreen text-white shadow-md scale-110' : 'text-gray-400 hover:bg-brandLightGreen'}`}
        >
          <Bot size={24} />
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <DashboardView data={userData} />}
        {activeTab === 'helper' && <HelperView />}
        {activeTab === 'assistant' && <AssistantView userId={1} />}
      </main>
    </div>
  );
}
