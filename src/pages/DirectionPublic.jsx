import { useEffect, useState } from "react";
import { fetchOperations } from "../services/operations";

export function DirectionPublic({ onOpenLogin }) {
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const o = await fetchOperations();
      setOps(o);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 bg-[#f6f7fb]">Chargement de la situation de caisse...</div>;
  }

  // Date du jour (format YYYY-MM-DD) ou dernière date active
  const today = new Date().toISOString().slice(0, 10);
  
  // Filtrage et calculs demandés
  const todayOps = ops.filter(o => o.date === today);
  
  // Transactions du jour Grande Caisse vs Petite Caisse (selon le libellé ou type)
  const todayGC = todayOps.filter(o => o.libelle?.includes('GC') || o.type === 'APPRO_PC');
  const todayPC = todayOps.filter(o => !o.libelle?.includes('GC'));

  // Solde actuel de la Petite Caisse
  const appPC = ops.filter(o => o.type === 'APPRO_PC').reduce((acc, o) => acc + Number(o.montant || 0), 0);
  const depPC = ops.filter(o => o.type === 'DEPENSE_PC').reduce((acc, o) => acc + Number(o.montant || 0), 0);
  const soldePC = appPC - depPC;

  // Totaux Entrées / Sorties
  const totalEntreesPC = appPC;
  const totalSortiesGlobal = depPC; // Ajustable selon la ventilation GC/PC

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-12 flex flex-col justify-between">
      <div className="max-w-[1000px] w-full mx-auto space-y-8">
        
        {/* En-tête épuré */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0f1a3d] text-white flex items-center justify-center font-black text-lg">GSC</div>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900">GÉNÉRALE DE SERVICE CONTINENTAL</h1>
              <p className="text-xs text-slate-400 font-bold tracking-widest mt-0.5">SYNTHÈSE DE TRÉSORERIE — EASTCASTLE V4</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Solde Petite Caisse</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{soldePC.toLocaleString()} $</div>
          </div>
        </div>

        {/* Indicateurs clés (Totaux) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="text-[11px] font-bold tracking-widest text-slate-400">TOTAL ENTRÉES PETITE CAISSE</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-2">+{totalEntreesPC.toLocaleString()} $</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="text-[11px] font-bold tracking-widest text-slate-400">TOTAL SORTIES (GLOBAL)</div>
            <div className="text-2xl font-extrabold text-red-600 mt-2">-{totalSortiesGlobal.toLocaleString()} $</div>
          </div>
        </div>

        {/* Transactions du jour */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Grande Caisse */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <h3 className="font-extrabold text-sm text-slate-900 mb-4">Transactions du jour — Grande Caisse</h3>
            <div className="flex-1 overflow-auto max-h-[220px] space-y-2">
              {todayGC.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune transaction enregistrée aujourd'hui.</p>
              ) : (
                todayGC.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <span className="text-slate-600">{o.libelle}</span>
                    <span className="font-extrabold text-slate-900">{Number(o.montant).toLocaleString()} $</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Petite Caisse */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <h3 className="font-extrabold text-sm text-slate-900 mb-4">Transactions du jour — Petite Caisse</h3>
            <div className="flex-1 overflow-auto max-h-[220px] space-y-2">
              {todayPC.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune transaction enregistrée aujourd'hui.</p>
              ) : (
                todayPC.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <span className="text-slate-600">{o.libelle}</span>
                    <span className={`font-extrabold ${o.type === 'APPRO_PC' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {o.type === 'APPRO_PC' ? '+' : '-'}{Number(o.montant).toLocaleString()} $
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Pied de page avec liens de connexion par rôle */}
      <footer className="max-w-[1000px] w-full mx-auto mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <span className="text-slate-400 font-bold">GSC Eastcastle — Espace Direction</span>
        <div className="flex items-center gap-3">
          <button onClick={() => onOpenLogin('admin')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
            Connexion Admin
          </button>
          <button onClick={() => onOpenLogin('gc')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
            Connexion Grande Caisse
          </button>
          <button onClick={() => onOpenLogin('pc')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
            Connexion Petite Caisse
          </button>
        </div>
      </footer>
    </div>
  );
}