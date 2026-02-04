import { NavLink } from 'react-router-dom';
import { Disc3, Youtube, FolderOpen, Film, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSidebarStore } from '../../store/sidebarStore';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 76;

const navItems = [
  {
    to: '/random',
    icon: Disc3,
    label: 'Random Generator',
    description: 'AI-generated lofi beats',
  },
  {
    to: '/youtube',
    icon: Youtube,
    label: 'YouTube Converter',
    description: 'Convert videos to lofi',
  },
  {
    to: '/output',
    icon: FolderOpen,
    label: 'Output Manager',
    description: 'Manage your tracks',
  },
  {
    to: '/finalize',
    icon: Film,
    label: 'Finalize Video',
    description: 'Create visualizer videos',
  },
];

export default function Sidebar() {
  const { isCollapsed, toggle } = useSidebarStore();

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col z-40 transition-all duration-300 ease-in-out"
      style={{ width: sidebarWidth }}
    >
      {/* Logo */}
      <div className={cn(
        'border-b border-border',
        isCollapsed ? 'px-3 py-5' : 'px-6 py-6'
      )}>
        <div className={cn(
          'flex items-center',
          isCollapsed ? 'justify-center' : 'gap-4'
        )}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
            <Sparkles size={24} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-foreground whitespace-nowrap">Lofi Generator</h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">Create your vibe</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden',
        isCollapsed ? 'px-3 py-4' : 'px-4 py-5'
      )}>
        {!isCollapsed && (
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-4">
            Menu
          </p>
        )}
        <ul className={cn('flex flex-col', isCollapsed ? 'gap-2' : 'gap-1.5')}>
          {navItems.map(({ to, icon: Icon, label, description }) => (
            <li key={to}>
              <NavLink
                to={to}
                title={isCollapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-xl transition-all duration-200',
                    isCollapsed ? 'justify-center p-2.5' : 'gap-4 px-3 py-3',
                    'group',
                    isActive
                      ? 'bg-primary/10 border border-primary/20 shadow-sm'
                      : 'border border-transparent hover:bg-secondary/50 hover:border-border'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={cn(
                        'flex items-center justify-center flex-shrink-0 transition-all duration-200 rounded-lg',
                        isCollapsed ? 'w-11 h-11' : 'w-11 h-11',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                          : 'bg-secondary text-muted-foreground group-hover:text-foreground group-hover:bg-secondary'
                      )}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <span
                          className={cn(
                            'font-medium block truncate text-sm',
                            isActive ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-1">
                          {description}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Toggle Button */}
      <div className={cn(
        'border-t border-border',
        isCollapsed ? 'p-3' : 'px-4 py-4'
      )}>
        <button
          onClick={toggle}
          className={cn(
            'w-full flex items-center justify-center rounded-xl transition-all duration-200',
            isCollapsed ? 'p-3' : 'gap-3 py-3 px-4',
            'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight size={20} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Footer - only show when expanded */}
      {!isCollapsed && (
        <div className="px-6 pb-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="opacity-60">v1.0.0</span>
            <span className="opacity-60">Tone.js</span>
          </div>
        </div>
      )}
    </aside>
  );
}
