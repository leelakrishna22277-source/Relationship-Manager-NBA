import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
export const AppShell = () => {
  return <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-slate-900">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-space-6 bg-[#F4F6F9]">
          <Outlet />
        </main>
      </div>
    </div>;
};
