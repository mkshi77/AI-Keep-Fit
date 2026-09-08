import React from 'react';

interface StatusBarProps {
  time?: string;
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ time = '9:41', className = '' }) => {
  return (
    <section className={`w-full pt-3.5 px-7 pb-1 flex justify-between items-center text-xs tracking-tight shrink-0 select-none z-20 ${className}`}>
      <span className="font-semibold text-[15px] tabular-nums text-white">{time}</span>
      <div className="flex items-center space-x-1.5 text-white">
        {/* Cellular Signal */}
        <svg className="w-4 h-3 fill-current" viewBox="0 0 17 11">
          <rect height="3" rx="0.75" width="3" x="0" y="8" />
          <rect height="5.5" rx="0.75" width="3" x="4.6" y="5.5" />
          <rect height="8.2" rx="0.75" width="3" x="9.3" y="2.8" />
          <rect height="11" rx="0.75" width="3" x="14" y="0" />
        </svg>
        {/* Wifi Icon */}
        <svg className="w-3.5 h-3 fill-current" viewBox="0 0 16 12">
          <path d="M8 2.8C10.5 2.8 12.8 3.8 14.5 5.4L16 3.8C13.9 1.8 11.1 0.6 8 0.6C4.9 0.6 2.1 1.8 0 3.8L1.5 5.4C3.2 3.8 5.5 2.8 8 2.8ZM8 6.4C9.6 6.4 11.1 7.1 12.2 8.2L13.7 6.6C12.2 5.1 10.2 4.2 8 4.2C5.8 4.2 3.8 5.1 2.3 6.6L3.8 8.2C4.9 7.1 6.4 6.4 8 6.4ZM8 10C8.8 10 9.5 10.7 9.5 11.5C9.5 12.3 8.8 13 8 13C7.2 13 6.5 12.3 6.5 11.5C6.5 10.7 7.2 10 8 10Z" />
        </svg>
        {/* Battery Icon */}
        <div className="w-6 h-3 rounded-full border border-white/80 p-[1.5px] flex items-center relative">
          <div className="h-full w-full bg-white rounded-sm" />
          <div className="w-0.5 h-1.5 bg-white/80 absolute -right-1 rounded-r-xs top-[2.5px]" />
        </div>
      </div>
    </section>
  );
};
