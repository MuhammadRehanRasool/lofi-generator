import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalPlayer from './GlobalPlayer';
import { useSidebarStore } from '../../store/sidebarStore';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 76;

export default function Layout() {
  const { isCollapsed } = useSidebarStore();

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className="min-h-screen pb-28 transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="px-8 py-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Global Player */}
      <GlobalPlayer />
    </div>
  );
}
