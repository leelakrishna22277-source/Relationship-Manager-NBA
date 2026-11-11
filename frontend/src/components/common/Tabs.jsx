export const Tabs = ({ tabs, activeTab, onChange, className = "" }) => {
  return <div className={`border-b border-color-5 flex items-center gap-space-2 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
    const isActive = tab.id === activeTab;
    const Icon = tab.icon;
    return <button
      key={tab.id}
      type="button"
      onClick={() => onChange(tab.id)}
      className={`flex items-center gap-space-2 py-space-3 px-space-3.5 border-b-2 text-text-xs font-semibold whitespace-nowrap transition-all ${isActive ? "border-color-2 text-color-2 font-bold" : "border-transparent text-color-1/60 hover:text-color-1 hover:border-color-5"}`}
    >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.count !== void 0 && <span
      className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-color-4 text-color-2" : "bg-color-6 text-color-1/60"}`}
    >
                {tab.count}
              </span>}
          </button>;
  })}
    </div>;
};
