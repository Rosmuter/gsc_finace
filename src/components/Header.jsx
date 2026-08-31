export default function Header({ profile, onLogout }) {
  const role = profile?.role || 'pc';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0f1a3d] text-white flex items-center justify-center font-black">GSC</div>
        <div>
          <div className="font-extrabold text-sm text-slate-900">EASTCASTLE B2S — V4</div>
          <div className="text-xs text-slate-500">{profile?.email} • <span className="font-bold uppercase text-[#0f1a3d]">{role}</span></div>
        </div>
      </div>
      <button onClick={onLogout} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
        Déconnexion
      </button>
    </header>
  );
}