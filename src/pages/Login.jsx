import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message.includes('Invalid') ? 'Email ou mot de passe incorrect.' : error.message);
    }
    setLoginLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7fb] p-4">
      <div className="w-full max-w-[400px] bg-white rounded-[28px] border border-slate-100 p-8 shadow-xl">
        <div className="text-center">
          <div className="w-14 h-14 bg-[#0f1a3d] text-white rounded-2xl flex items-center justify-center font-black text-xl mx-auto">GSC</div>
          <h1 className="font-extrabold text-[16px] tracking-tight mt-4 text-slate-900">GENERALE DE SERVICE CONTINENTAL</h1>
          <span className="inline-block mt-2 text-[10px] tracking-[0.2em] bg-[#0f1a3d] text-white px-3 py-1 rounded-full font-bold">EASTCASTLE V4</span>
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="text-[11px] font-bold tracking-widest text-slate-500">EMAIL</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="admin@gsc.cd" 
              className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f1a3d]" 
              required 
            />
          </div>
          <div>
            <label className="text-[11px] font-bold tracking-widest text-slate-500">MOT DE PASSE</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f1a3d]" 
              required 
            />
          </div>
          {loginError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">{loginError}</div>}
          <button type="submit" disabled={loginLoading} className="w-full bg-[#0f1a3d] hover:bg-black text-white rounded-xl py-4 font-bold text-sm shadow-md transition">
            {loginLoading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>
      </div>
    </div>
  );
}