import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { fetchSites, fetchOperations, createOperation, deleteOperation } from "./services/operations";
import Login from "./pages/Login";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sites, setSites] = useState([]);
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false); // État pour afficher/masquer le panneau de filtres discret

  // Form states pour opération
  const [selSite, setSelSite] = useState('MALELA');
  const [typeOp, setTypeOp] = useState('DEPENSE_PC');
  const [montant, setMontant] = useState('');
  const [libelle, setLibelle] = useState('');
  const [dateOp, setDateOp] = useState(new Date().toISOString().slice(0, 10));
  const [isDirect, setIsDirect] = useState(false);

  // États pour les filtres et le tri global
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, montant_desc, montant_asc

  // État pour l'édition d'une opération (< 48h)
  const [editingOpId, setEditingOpId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(user) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      setProfile(data);
    } catch {
      const em = user.email || '';
      let role = 'pc';
      if (em.includes('admin')) role = 'admin';
      else if (em.includes('direction')) role = 'direction';
      else if (em.includes('gcaisse') || em === 'gc@gsc.cd') role = 'gc';
      setProfile({ role, email: em, site_affecte: 'MALELA' });
    }

    const loadedSites = await fetchSites();
    setSites(loadedSites);
    if (loadedSites.length > 0) setSelSite(loadedSites[0].code);

    const loadedOps = await fetchOperations();
    setOps(loadedOps);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setShowLoginModal(false);
  }

  async function handleSaveOp() {
    if (!selSite || !libelle.trim() || !montant) return alert('Veuillez remplir tous les champs obligatoires.');
    setLoading(true);
    const val = Number(montant);
    const base = { site: selSite, date: dateOp, libelle: libelle.trim(), created_by: session.user.id };

    try {
      const role = profile?.role;

      if (editingOpId) {
        const { error } = await supabase.from('operations').update({
          site: selSite,
          date: dateOp,
          libelle: libelle.trim(),
          montant: val
        }).eq('id', editingOpId);

        if (error) throw error;
        setEditingOpId(null);
      } else {
        if (role === 'gc') {
          if (isDirect) {
            await createOperation({ ...base, libelle: `[Dépense Directe GC] ${libelle.trim()}`, type: 'DEPENSE_GC', caisse_type: 'GC', montant: val });
            await createOperation({ ...base, libelle: `[Auto-Approv. GC] ${libelle.trim()}`, type: 'APPRO_PC', caisse_type: 'PC', montant: val });
            await createOperation({ ...base, libelle: `[Auto-Dépense GC] ${libelle.trim()}`, type: 'DEPENSE_PC', caisse_type: 'PC', montant: val });
          } else {
            await createOperation({ ...base, type: 'APPRO_PC', caisse_type: 'PC', montant: val });
          }
        } else {
          await createOperation({ ...base, type: typeOp, caisse_type: 'PC', montant: val });
        }
      }

      setLibelle('');
      setMontant('');
      setIsDirect(false);
      const updatedOps = await fetchOperations();
      setOps(updatedOps);
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
    setLoading(false);
  }

  function handleStartEdit(op) {
    setEditingOpId(op.id);
    setSelSite(op.site);
    setDateOp(op.date);
    setLibelle(op.libelle);
    setMontant(op.montant);
    setCurrentTab('dashboard');
  }

  async function handleDeleteOp(id) {
    if (!confirm('Voulez-vous supprimer cette opération ?')) return;
    try {
      await deleteOperation(id);
      const updatedOps = await fetchOperations();
      setOps(updatedOps);
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message);
    }
  }

  // --- LOGIQUE DE FILTRAGE ET DE TRI UNIFIÉE ---
  const getFilteredAndSortedOps = () => {
    let result = [...ops];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => (o.libelle + ' ' + o.site).toLowerCase().includes(q));
    }

    if (filterSite !== 'ALL') {
      result = result.filter(o => o.site === filterSite);
    }

    if (filterType !== 'ALL') {
      result = result.filter(o => o.type === filterType);
    }

    if (dateDebut) {
      result = result.filter(o => o.date >= dateDebut);
    }
    if (dateFin) {
      result = result.filter(o => o.date <= dateFin);
    }

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'montant_desc') return Number(b.montant) - Number(a.montant);
      if (sortBy === 'montant_asc') return Number(a.montant) - Number(b.montant);
      return 0;
    });

    return result;
  };

  const filteredOps = getFilteredAndSortedOps();
  const totalRecu = filteredOps.filter(o => o.type === 'APPRO_PC').reduce((acc, o) => acc + Number(o.montant || 0), 0);
  const totalDepense = filteredOps.filter(o => o.type === 'DEPENSE_PC').reduce((acc, o) => acc + Number(o.montant || 0), 0);
  const soldePC = totalRecu - totalDepense;

  const hasActiveFilters = filterSite !== 'ALL' || filterType !== 'ALL' || dateDebut || dateFin || searchQuery || sortBy !== 'date_desc';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Chargement de GSC Eastcastle...</div>;
  }

  // --- COMPOSANT DU BOUTON ET PANNEAU DISCRET ---
  const renderDiscreetFilters = () => (
    <div className="relative mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFiltersModal(!showFiltersModal)} 
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${hasActiveFilters ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <span>⚙️ Filtres & Tri</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-600"></span>}
          </button>
          
          {hasActiveFilters && (
            <button 
              onClick={() => { setFilterSite('ALL'); setFilterType('ALL'); setDateDebut(''); setDateFin(''); setSearchQuery(''); setSortBy('date_desc'); }}
              className="text-xs font-bold text-red-600 hover:underline px-2"
            >
              Effacer filtres
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500">
          {filteredOps.length} opération(s) affichée(s)
        </div>
      </div>

      {/* Panneau déroulant discret */}
      {showFiltersModal && (
        <div className="absolute top-14 left-0 right-0 z-20 bg-white p-5 rounded-2xl border border-slate-200 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Options de Filtrage et Tri</h4>
            <button onClick={() => setShowFiltersModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-xs">✕ Fermer</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-slate-400 block mb-1">RECHERCHE</label>
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Mot-clé..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-slate-400 block mb-1">SITE</label>
              <select 
                value={filterSite} 
                onChange={e => setFilterSite(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="ALL">Tous les sites</option>
                {sites.map(s => <option key={s.code} value={s.code}>{s.nom}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-slate-400 block mb-1">TYPE</label>
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="ALL">Tous les types</option>
                <option value="APPRO_PC">Entrée (APPRO_PC)</option>
                <option value="DEPENSE_PC">Sortie (DEPENSE_PC)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-slate-400 block mb-1">DU (DÉBUT)</label>
              <input 
                type="date" 
                value={dateDebut} 
                onChange={e => setDateDebut(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-slate-400 block mb-1">AU (FIN)</label>
              <input 
                type="date" 
                value={dateFin} 
                onChange={e => setDateFin(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-slate-400 block mb-1">TRIER PAR</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="date_desc">Date (Plus récent)</option>
                <option value="date_asc">Date (Plus ancien)</option>
                <option value="montant_desc">Montant (Décroissant)</option>
                <option value="montant_asc">Montant (Croissant)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- VUE DIRECTION PUBLIQUE (OU NON CONNECTÉ) ---
  if (!session && !showLoginModal) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex flex-col p-6 max-w-[1400px] mx-auto">
        <header className="flex justify-between items-center mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">GSC Eastcastle - Tableau de Bord Direction</h1>
            <p className="text-xs text-slate-500">Vue synthétique globale</p>
          </div>
          <button onClick={() => setShowLoginModal(true)} className="bg-[#0f1a3d] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-black transition">
            Connexion / Espace Interne
          </button>
        </header>

        {renderDiscreetFilters()}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold tracking-widest text-slate-400">SOLDE FILTRÉ</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">{soldePC.toLocaleString()} $</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold tracking-widest text-emerald-500">TOTAL REÇUS FILTRÉS</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-2">+{totalRecu.toLocaleString()} $</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold tracking-widest text-red-500">TOTAL DÉPENSES FILTRÉES</span>
            <div className="text-2xl font-extrabold text-red-600 mt-2">-{totalDepense.toLocaleString()} $</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm flex-1">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900">Historique des Transactions</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Site</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Libellé</th>
                  <th className="p-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {filteredOps.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-400 font-medium">Aucune transaction trouvée.</td>
                  </tr>
                ) : (
                  filteredOps.map(o => (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 text-slate-600">{o.date}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{o.site}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${o.type === 'APPRO_PC' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {o.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{o.libelle}</td>
                      <td className={`p-3 text-right font-extrabold ${o.type === 'APPRO_PC' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {o.type === 'APPRO_PC' ? '+' : '-'}{Number(o.montant).toLocaleString()} $
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!session && showLoginModal) {
    return (
      <div className="relative">
        <button onClick={() => setShowLoginModal(false)} className="absolute top-4 left-4 z-50 text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50">
          ← Retour à la vue Direction
        </button>
        <Login />
      </div>
    );
  }

  const role = profile?.role || 'pc';
  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const isLessThan48h = (dateStr) => new Date(dateStr) >= fortyEightHoursAgo;

  const groupedByMonth = filteredOps.reduce((acc, o) => {
    if (!o.date) return acc;
    const monthKey = o.date.slice(0, 7);
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(o);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

  return (
    <div className="min-h-screen bg-[#f6f7fb] flex flex-col">
      <Header profile={profile} onLogout={handleLogout} />

      <div className="flex-1 flex">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} role={role} />

        <main className="flex-1 p-6 max-w-[1600px] mx-auto flex flex-col gap-6">
          
          {renderDiscreetFilters()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {currentTab === 'dashboard' && role !== 'direction' && (
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-fit space-y-6">
                <div>
                  <h2 className="font-extrabold text-base text-slate-900 mb-4">
                    {editingOpId ? 'Modifier l\'opération' : 'Nouvelle Opération'}
                  </h2>
                  
                  {role === 'gc' && (
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4 cursor-pointer">
                      <input type="checkbox" checked={isDirect} onChange={e => setIsDirect(e.target.checked)} className="w-4 h-4" />
                      <span className="text-xs font-bold text-amber-900">Dépense directe GC (Alimente et déduit auto)</span>
                    </label>
                  )}

                  {role === 'pc' && !editingOpId && (
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                      <button onClick={() => setTypeOp('APPRO_PC')} className={`py-2 rounded-lg text-xs font-bold transition ${typeOp === 'APPRO_PC' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}>↑ Entrée (APPRO)</button>
                      <button onClick={() => setTypeOp('DEPENSE_PC')} className={`py-2 rounded-lg text-xs font-bold transition ${typeOp === 'DEPENSE_PC' ? 'bg-white shadow text-red-700' : 'text-slate-500'}`}>↓ Sortie (DÉPENSE)</button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold tracking-widest text-slate-400">SITE / CHANTIER</label>
                      <select value={selSite} onChange={e => setSelSite(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold">
                        {sites.map(s => <option key={s.code} value={s.code}>{s.nom}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold tracking-widest text-slate-400">DATE</label>
                        <input type="date" value={dateOp} onChange={e => setDateOp(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold tracking-widest text-slate-400">MONTANT ($)</label>
                        <input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0.00" className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold tracking-widest text-slate-400">LIBELLÉ</label>
                      <textarea value={libelle} onChange={e => setLibelle(e.target.value)} rows="3" placeholder="Description de l'opération..." className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs"></textarea>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={handleSaveOp} className="flex-1 bg-[#0f1a3d] hover:bg-black text-white rounded-xl py-3.5 font-bold text-xs shadow transition">
                        {editingOpId ? 'Mettre à jour' : "Enregistrer l'opération"}
                      </button>
                      {editingOpId && (
                        <button onClick={() => { setEditingOpId(null); setLibelle(''); setMontant(''); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 rounded-xl font-bold text-xs transition">
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'historique_mois' ? (
              <div className="lg:col-span-12 space-y-6">
                <h2 className="font-extrabold text-base text-slate-900">Historique Global Mois par Mois</h2>
                {sortedMonths.length === 0 ? (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs font-medium">Aucune donnée correspondante.</div>
                ) : (
                  sortedMonths.map(month => {
                    const monthOps = groupedByMonth[month];
                    const mApp = monthOps.filter(o => o.type === 'APPRO_PC').reduce((acc, o) => acc + Number(o.montant || 0), 0);
                    const mDep = monthOps.filter(o => o.type === 'DEPENSE_PC').reduce((acc, o) => acc + Number(o.montant || 0), 0);
                    const mSolde = mApp - mDep;

                    return (
                      <div key={month} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap justify-between items-center font-bold text-xs gap-2">
                          <span className="text-slate-900 uppercase">Mois : {month}</span>
                          <div className="flex gap-4">
                            <span className="text-emerald-600">Entrées: +{mApp.toLocaleString()} $</span>
                            <span className="text-red-600">Sorties: -{mDep.toLocaleString()} $</span>
                            <span className="text-slate-900 font-extrabold">Solde: {mSolde.toLocaleString()} $</span>
                          </div>
                        </div>
                        <table className="w-full text-xs">
                          <thead className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                            <tr>
                              <th className="p-3 text-left">Date</th>
                              <th className="p-3 text-left">Site</th>
                              <th className="p-3 text-left">Type</th>
                              <th className="p-3 text-left">Libellé</th>
                              <th className="p-3 text-right">Montant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthOps.map(o => (
                              <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-3 text-slate-600">{o.date}</td>
                                <td className="p-3 font-mono font-bold text-slate-900">{o.site}</td>
                                <td className="p-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${o.type === 'APPRO_PC' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {o.type}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-700">{o.libelle}</td>
                                <td className={`p-3 text-right font-extrabold ${o.type === 'APPRO_PC' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {o.type === 'APPRO_PC' ? '+' : '-'}{Number(o.montant).toLocaleString()} $
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className={`${role === 'direction' || currentTab === 'operations' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm h-fit`}>
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">Journal des Opérations</h3>
                </div>
                <div className="flex-1 overflow-auto max-h-[600px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Site</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-left">Libellé</th>
                        <th className="p-3 text-right">Montant</th>
                        {role !== 'direction' && <th className="p-3 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOps.length === 0 ? (
                        <tr>
                          <td colSpan={role !== 'direction' ? 6 : 5} className="p-6 text-center text-slate-400 font-medium">Aucune opération ne correspond aux filtres sélectionnés.</td>
                        </tr>
                      ) : (
                        filteredOps.map(o => {
                          const canModify = role !== 'direction' && isLessThan48h(o.date);
                          return (
                            <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-3 text-slate-600">{o.date}</td>
                              <td className="p-3 font-mono font-bold text-slate-900">{o.site}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${o.type === 'APPRO_PC' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {o.type}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700">{o.libelle}</td>
                              <td className={`p-3 text-right font-extrabold ${o.type === 'APPRO_PC' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {o.type === 'APPRO_PC' ? '+' : '-'}{Number(o.montant).toLocaleString()} $
                              </td>
                              {role !== 'direction' && (
                                <td className="p-3 text-center">
                                  {canModify && (
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => handleStartEdit(o)} title="Modifier" className="text-blue-500 hover:text-blue-700 font-bold text-xs">✏️</button>
                                      <button onClick={() => handleDeleteOp(o.id)} title="Supprimer" className="text-slate-400 hover:text-red-600 font-bold">✕</button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#0f1a3d] text-white p-4 flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                  <span>SOLDE FILTRÉ : {soldePC.toLocaleString()} $</span>
                  <div className="flex gap-4">
                    <span className="text-emerald-400">Entrées: +{totalRecu.toLocaleString()} $</span>
                    <span className="text-red-400">Sorties: -{totalDepense.toLocaleString()} $</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}