import React from 'react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasCoachNotification?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  hasCoachNotification = false,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto z-40 bg-[#0B0B0C]/95 border-t border-[#1C1C20] backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-3 h-[58px] items-center">
        {/* Tab 1: 今日 */}
        <button
          id="nav-tab-today"
          onClick={() => onTabChange('today')}
          className={`flex flex-col items-center justify-center h-full py-1 gap-1 cursor-pointer group active:scale-95 transition-all ${
            activeTab === 'today' ? 'text-[#A4FF4F]' : 'text-[#8E8E93] hover:text-neutral-200'
          }`}
          type="button"
        >
          <svg className="w-5 h-5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
            <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            {activeTab === 'today' && (
              <>
                <path d="M8 14h.01" />
                <path d="M12 14h.01" />
                <path d="M16 14h.01" />
              </>
            )}
          </svg>
          <span className={`text-[11px] tracking-tight ${activeTab === 'today' ? 'font-bold text-[#A4FF4F]' : 'font-medium'}`}>
            今日
          </span>
        </button>

        {/* Tab 2: 记录 */}
        <button
          id="nav-tab-records"
          onClick={() => onTabChange('records')}
          className={`flex flex-col items-center justify-center h-full py-1 gap-1 cursor-pointer group active:scale-95 transition-all ${
            activeTab === 'records' ? 'text-[#A4FF4F]' : 'text-[#8E8E93] hover:text-neutral-200'
          }`}
          type="button"
        >
          <svg className="w-5 h-5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
            <line x1="18" x2="18" y1="20" y2="10" strokeLinecap="round" />
            <line x1="12" x2="12" y1="20" y2="4" strokeLinecap="round" />
            <line x1="6" x2="6" y1="20" y2="14" strokeLinecap="round" />
          </svg>
          <span className={`text-[11px] tracking-tight ${activeTab === 'records' ? 'font-bold text-[#A4FF4F]' : 'font-medium'}`}>
            记录
          </span>
        </button>

        {/* Tab 3: 教练 */}
        <button
          id="nav-tab-coach"
          onClick={() => onTabChange('coach')}
          className={`flex flex-col items-center justify-center h-full py-1 gap-1 cursor-pointer group active:scale-95 transition-all relative ${
            activeTab === 'coach' ? 'text-[#A4FF4F]' : 'text-[#8E8E93] hover:text-neutral-200'
          }`}
          type="button"
        >
          <div className="relative">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
            {hasCoachNotification && activeTab !== 'coach' && (
              <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[#A4FF4F] ring-2 ring-[#0B0B0C]" />
            )}
          </div>
          <span className={`text-[11px] tracking-tight ${activeTab === 'coach' ? 'font-bold text-[#A4FF4F]' : 'font-medium'}`}>
            教练
          </span>
        </button>
      </div>
    </nav>
  );
};
