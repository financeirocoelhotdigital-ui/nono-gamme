import React from "react";
import { User } from "firebase/auth";
import { UserProfile } from "../types";
import Sidebar from "./Sidebar";
import { DesktopSummaryPanel } from "./DesktopSummaryPanel";
import { cn } from "../lib/utils";

interface DesktopLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export function DesktopLayout({ 
  children, 
  activeTab, 
  setActiveTab, 
  user, 
  userProfile, 
  onLogout 
}: DesktopLayoutProps) {
  return (
    <div className="hidden lg:flex h-screen bg-[#F4F7F6] overflow-hidden">
      {/* Fixed Sidebar (Left) */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 bg-white">
        <Sidebar 
          isOpen={true} 
          onClose={() => {}} 
          user={userProfile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={onLogout}
        />
      </div>

      {/* Main Content Area (Center) */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F4F7F6]">
        <div className="max-w-5xl mx-auto p-8">
          {children}
        </div>
      </main>

      {/* Summary Panel (Right) */}
      <aside className="w-96 flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto custom-scrollbar">
        <DesktopSummaryPanel userProfile={userProfile} />
      </aside>
    </div>
  );
}
