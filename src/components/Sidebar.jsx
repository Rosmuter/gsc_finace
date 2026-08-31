export default function Sidebar({ currentTab, setCurrentTab, role }) {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', roles: ['admin', 'direction', 'gc', 'pc'] },
    { id: 'operations', label: 'Journal des Opérations', roles: ['admin', 'direction', 'gc', 'pc'] },
    { id: 'sites', label: 'Gestion des Sites', roles: ['admin'] },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between hidden lg:flex">
      <div className="space-y-6">
        <div className="text-[11px] font-bold tracking-widest text-slate-400">NAVIGATION</div>
        <nav className="space-y-1">
          {menuItems
            .filter(item => item.roles.includes(role))
            .map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition ${
                  currentTab === item.id 
                    ? 'bg-[#0f1a3d] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
        </nav>
      </div>
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11px] text-slate-500">
        <b>GSC Eastcastle</b><br />Système de Gestion Financière
      </div>
    </aside>
  );
}