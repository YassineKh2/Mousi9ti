import React from "react";
import {
  LayoutDashboard,
  Sparkles,
  Grid3X3,
  Dumbbell,
  Compass,
  BarChart3,
  CalendarCheck2,
  Settings,
  Flame,
  Music,
  Search,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export type ActiveTab =
  | "dashboard"
  | "scales"
  | "chords"
  | "builder"
  | "exercises"
  | "routine"
  | "tools"
  | "stats";

export interface GlobalSearchResult {
  id: string;
  label: string;
  subtitle?: string;
  tab: ActiveTab;
  kind: "tab" | "scale" | "chord" | "exercise";
  payload?: Record<string, string>;
}

interface NavigationProps {
  theme: "dark" | "light";
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  streakDays: number;
  graceActive?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResults: GlobalSearchResult[];
  onSelectSearchResult: (result: GlobalSearchResult) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  theme,
  activeTab,
  onSelectTab,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenSettings,
  streakDays,
  graceActive = false,
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectSearchResult,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "dashboard",
      label: "DASHBOARD",
      icon: <LayoutDashboard size={18} />,
    },
    { id: "scales", label: "SCALES", icon: <Sparkles size={18} /> },
    { id: "chords", label: "CHORDS", icon: <Grid3X3 size={18} /> },
    { id: "builder", label: "BUILDER", icon: <Settings size={18} /> },
    { id: "routine", label: "ROUTINE", icon: <CalendarCheck2 size={18} /> },
    //  Hidden until further improvement
    // { id: "exercises", label: "EXERCISES", icon: <Dumbbell size={18} /> },
    { id: "tools", label: "TOOLS", icon: <Compass size={18} /> },
    { id: "stats", label: "STATS", icon: <BarChart3 size={18} /> },
  ];

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full ${isSidebarCollapsed ? "w-20" : "w-72"} bg-surface-container-lowest z-50 flex-col border-r border-outline-variant/30 shadow-2xl transition-[width] duration-200`}
      >
        {/* Brand Logo */}
        <div
          className={`${isSidebarCollapsed ? "px-0 justify-center" : "px-8 gap-3"} py-7 flex items-center border-b border-outline-variant/30`}
        >
          <img
            className={
              isSidebarCollapsed ? "h-16 w-16 object-contain" : "max-w-full"
            }
            src={
              theme === "light"
                ? isSidebarCollapsed
                  ? "Mousi9tiSmall.svg"
                  : "Mousi9ti.svg"
                : isSidebarCollapsed
                  ? "Mousi9tiWhiteSmall.svg"
                  : "Mousi9tiWhite.svg"
            }
            alt="Mousi9ti Logo"
          />
        </div>

        {/* Navigation Links */}
        <nav
          className={`flex-1 ${isSidebarCollapsed ? "px-2" : "px-4"} py-6 space-y-1.5 overflow-y-auto`}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "px-4"} py-3 rounded text-left transition-all duration-200 group border-l-2 ${
                  isActive
                    ? "bg-primary-container text-on-primary-container border-primary font-semibold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border-transparent"
                }`}
              >
                <span
                  className={`${isSidebarCollapsed ? "" : "mr-3.5"} transition-colors ${isActive ? "text-on-primary-container" : "text-on-surface-variant group-hover:text-on-surface"}`}
                >
                  {item.icon}
                </span>
                {!isSidebarCollapsed && (
                  <span className="font-mono text-xs tracking-wider">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Streak & Consistency Footer Widget */}
        <div
          className={`${isSidebarCollapsed ? "p-2" : "p-4"} border-t border-outline-variant/30 space-y-3`}
        >
          <div
            className={`bg-surface-container-low border border-outline-variant/30 rounded-lg ${isSidebarCollapsed ? "p-1 flex justify-center" : "p-3.5 flex flex-col gap-1.5"}`}
          >
            {isSidebarCollapsed ? (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-primary">
                <Flame size={16} className="animate-pulse" />
                <span className="min-w-[3ch] text-center font-mono text-base font-bold tracking-wider">
                  {streakDays}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-[0.18em] text-on-surface-variant uppercase font-semibold">
                    Practice Streak
                  </span>
                  {graceActive && (
                    <span className="text-[9px] font-mono text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/20">
                      GRACE ACTIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                    <Flame size={15} className="animate-pulse" />
                  </div>
                  <span className="font-mono text-base font-bold text-on-surface tracking-wider">
                    {streakDays} DAY{streakDays > 1 && "S"}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="w-full flex items-center gap-2 px-2 py-2.5 text-on-surface-variant">
            <button
              onClick={onOpenSettings}
              title="Studio Settings"
              className={`min-w-0 h-9 flex items-center ${isSidebarCollapsed ? "flex-1 justify-center" : "flex-1 justify-start gap-3"} rounded border border-transparent hover:border-outline-variant/30 hover:bg-surface-container-low hover:text-on-surface transition-colors`}
            >
              <Sliders size={16} />
              {!isSidebarCollapsed && (
                <span className="font-mono text-xs tracking-wider uppercase">
                  Studio Settings
                </span>
              )}
            </button>
            <button
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className={`h-9 flex items-center justify-center rounded border border-transparent hover:border-outline-variant/30 hover:bg-surface-container-low hover:text-on-surface transition-colors ${isSidebarCollapsed ? "flex-1 min-w-0" : "w-9 shrink-0"}`}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={14} />
              ) : (
                <PanelLeftClose size={14} />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Top Global Header (Sticky on desktop & mobile) */}
      <header
        className={`sticky top-0 z-40 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 px-4 lg:px-8 flex items-center justify-between ${isSidebarCollapsed ? "lg:pl-28" : "lg:pl-80"}`}
      >
        {/* Search Theory Input */}
        <div className="flex items-center gap-3 w-full max-w-md mr-2">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              placeholder="Search theory, scales, chords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/30 rounded py-1.5 pl-9 pr-4 text-xs font-mono text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />

            {searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-outline-variant/40 rounded-lg shadow-2xl overflow-hidden z-50">
                {searchResults.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs font-mono text-on-surface-variant">
                    No results found
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => onSelectSearchResult(result)}
                        className="w-full text-left px-3 py-2.5 border-b last:border-b-0 border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-on-surface truncate">
                            {result.label}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wide text-primary shrink-0">
                            {result.kind}
                          </span>
                        </div>
                        {result.subtitle && (
                          <div className="text-[10px] font-mono text-on-surface-variant mt-0.5 truncate">
                            {result.subtitle}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Tools & Profile */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all"
            title="Studio Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-outline-variant/30 z-50 flex items-center justify-start gap-1 overflow-x-auto px-2 no-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex min-w-[3.5rem] shrink-0 flex-col items-center gap-1 py-1 px-2 transition-colors ${
                isActive
                  ? "text-primary font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-mono tracking-tighter">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
