
import React, { useState } from 'react';
import { User, Shield, Code, ChevronDown, LogOut, Bell } from 'lucide-react';
import { AppUser, UserRole, AppNotification } from '../types';
import { NotificationCenter } from './NotificationCenter';

interface ProfileMenuProps {
  currentUser: AppUser;
  notifications: AppNotification[];
  onSwitchRole: (role: UserRole) => void;
  onMarkAsRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onNotificationClick: (notification: AppNotification) => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ 
  currentUser, 
  notifications,
  onSwitchRole, 
  onMarkAsRead,
  onClearAllNotifications,
  onNotificationClick
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const roles: { role: UserRole; label: string; icon: any; color: string }[] = [
    { role: 'user', label: 'Warga', icon: User, color: 'text-gray-600' },
    { role: 'government', label: 'Pemerintah', icon: Shield, color: 'text-blue-600' },
    { role: 'developer', label: 'Developer', icon: Code, color: 'text-purple-600' },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex items-center gap-3">
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
          className={`p-3 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg hover:shadow-xl transition-all active:scale-95 group ${isNotifOpen ? 'ring-2 ring-blue-500' : ''}`}
        >
          <Bell size={20} className={unreadCount > 0 ? 'text-blue-600 animate-swing' : 'text-gray-500'} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] text-white items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
        {isNotifOpen && (
          <NotificationCenter 
            notifications={notifications} 
            onMarkAsRead={onMarkAsRead}
            onClearAll={onClearAllNotifications}
            onClose={() => setIsNotifOpen(false)}
            onNotificationClick={(n) => {
              onNotificationClick(n);
              setIsNotifOpen(false);
            }}
          />
        )}
      </div>

      {/* Profile Toggle */}
      <div className="relative flex flex-col items-end">
        <button
          onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
          className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-gray-200 p-1.5 pr-4 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 group"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            currentUser.role === 'developer' ? 'bg-purple-100 text-purple-600' : 
            currentUser.role === 'government' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {currentUser.role === 'developer' ? <Code size={20} /> : 
             currentUser.role === 'government' ? <Shield size={20} /> : <User size={20} />}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-900 leading-none mb-0.5">{currentUser.name}</p>
            <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider leading-none">
              {currentUser.role}
            </p>
          </div>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
        </button>

        {isProfileOpen && (
          <div className="absolute top-16 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-down py-2">
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ganti Peran (Testing)</p>
            </div>
            
            {roles.map((item) => (
              <button
                key={item.role}
                onClick={() => {
                  onSwitchRole(item.role);
                  setIsProfileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  currentUser.role === item.role ? 'bg-blue-50/50' : ''
                }`}
              >
                <item.icon size={18} className={item.color} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${currentUser.role === item.role ? 'text-blue-700' : 'text-gray-700'}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-gray-400">Masuk sebagai {item.label.toLowerCase()}</p>
                </div>
                {currentUser.role === item.role && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-blue-600"></div>
                )}
              </button>
            ))}

            <div className="border-t border-gray-50 mt-1 pt-1">
               <button className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={18} />
                  <span className="text-sm font-semibold">Keluar</span>
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
