"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  Home, 
  HardDrive, 
  Users, 
  Clock, 
  Star, 
  AlertCircle, 
  Trash2, 
  Cloud,
  Search,
  Settings,
  HelpCircle,
  Menu,
  Plus
} from "lucide-react";

export default function DriveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [buckets, setBuckets] = useState<any[]>([]);

  React.useEffect(() => {
    // Fetch buckets for the sidebar
    fetch("/api/buckets")
      .then(res => res.json())
      .then(data => {
        if (data.buckets) setBuckets(data.buckets);
      })
      .catch(err => console.error(err));
  }, []);

  const NavItem = ({ icon: Icon, label, href, active, isSubItem = false }: any) => (
    <Link 
      href={href}
      className={`flex items-center gap-4 py-2 rounded-full mb-1 transition-colors ${
        isSubItem ? 'px-10 text-[13px]' : 'px-4 text-[14px]'
      } ${
        active 
          ? "bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]" 
          : "text-[#444746] hover:bg-[#1E1F20]/5 dark:text-[#E3E3E3] dark:hover:bg-[#E3E3E3]/10"
      }`}
    >
      <Icon size={isSubItem ? 16 : 20} className={active ? "text-[#001D35] dark:text-[#C2E7FF]" : ""} />
      <span className="font-medium">{label}</span>
    </Link>
  );

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#131314] overflow-hidden text-[#1F1F1F] dark:text-[#E3E3E3] font-sans">
      
      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#F8F9FA] dark:bg-[#131314] transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 h-full flex flex-col">
          <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-6 cursor-pointer">
            <Cloud className="text-[#1967D2]" size={36} fill="#1967D2" fillOpacity={0.1} />
            <span className="text-[22px] text-[#444746] dark:text-[#E3E3E3] font-medium">Drive</span>
          </Link>
          
          <div className="px-2 mb-6">
            {/* The Plus button in sidebar could link to Dashboard to add bucket or a general action */}
            <Link href="/dashboard" className="inline-flex items-center gap-4 bg-white dark:bg-[#37393B] shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-none hover:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] hover:bg-[#F8F9FA] dark:hover:bg-[#474A4D] pl-4 pr-6 py-3.5 rounded-[16px] transition-all">
              <Plus size={24} className="text-[#444746] dark:text-[#E3E3E3]" />
              <span className="text-sm font-medium text-[#444746] dark:text-[#E3E3E3]">New</span>
            </Link>
          </div>

          <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto hide-scrollbar pl-2 pr-4">
            {/* Render buckets as main items */}
            {buckets.map(bucket => (
              <NavItem 
                key={bucket.id}
                icon={HardDrive} 
                label={bucket.name} 
                href={`/bucket/${bucket.id}`} 
                active={pathname.startsWith(`/bucket/${bucket.id}`)} 
              />
            ))}

            <div className="my-3 mx-4 border-t border-[#E0E0E0] dark:border-[#444746]"></div>
            
            <NavItem icon={Settings} label="Settings" href="#" />
            <NavItem icon={HelpCircle} label="Help" href="#" />
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] dark:bg-[#131314] overflow-hidden relative">
        
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 py-2 h-16 shrink-0">
          <div className="flex items-center flex-1 gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 md:hidden rounded-full hover:bg-black/5 dark:hover:bg-white/5">
              <Menu size={24} />
            </button>
            
            <div className="hidden sm:flex flex-1 max-w-2xl bg-[#E9EEF6] dark:bg-[#282A2C] rounded-[24px] items-center px-2 h-12 focus-within:bg-white dark:focus-within:bg-[#303134] focus-within:shadow-[0_1px_1px_0_rgba(65,69,73,0.3),0_1px_3px_1px_rgba(65,69,73,0.15)] transition-all ml-2">
              <button className="p-2.5 text-[#444746] dark:text-[#E3E3E3] rounded-full hover:bg-[#1E1F20]/5 dark:hover:bg-[#E3E3E3]/10">
                <Search size={20} />
              </button>
              <input 
                type="text" 
                placeholder="Search in Drive" 
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-2 text-[#1F1F1F] dark:text-[#E3E3E3] placeholder-[#444746] dark:placeholder-[#C4C7C5] text-[16px]"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 ml-4 mr-2">
            <button className="p-2 text-[#444746] dark:text-[#E3E3E3] hover:bg-[#1E1F20]/5 dark:hover:bg-[#E3E3E3]/10 rounded-full hidden sm:block">
              <HelpCircle size={24} />
            </button>
            <button className="p-2 text-[#444746] dark:text-[#E3E3E3] hover:bg-[#1E1F20]/5 dark:hover:bg-[#E3E3E3]/10 rounded-full hidden sm:block">
              <Settings size={24} />
            </button>
            <div className="mx-2 hidden sm:block w-px h-8 bg-[#E0E0E0] dark:bg-[#444746]"></div>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1967D2] text-white flex items-center justify-center font-bold text-sm sm:text-lg hover:shadow-md transition-shadow ml-1 border-[3px] border-[#F8F9FA] dark:border-[#131314]"
              title="Sign out"
            >
              U
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#1E1F20] rounded-[24px] mx-2 sm:mx-4 mb-2 sm:mb-4 shadow-sm border border-[#E0E0E0] dark:border-[#444746]">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

    </div>
  );
}
