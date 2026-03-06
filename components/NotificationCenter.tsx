
import React, { useState } from 'react';
import { Bell, Check, Trash2, X, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  onNotificationClick: (notification: AppNotification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  onMarkAsRead, 
  onClearAll,
  onClose,
  onNotificationClick
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_change': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'flagged': return <AlertCircle size={16} className="text-red-500" />;
      case 'new_report': return <MessageSquare size={16} className="text-blue-500" />;
      default: return <Bell size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="absolute top-16 right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-down z-[1002]">
      <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Notifikasi</h3>
          <p className="text-[10px] text-gray-500 font-medium">{unreadCount} belum dibaca</p>
        </div>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <button 
              onClick={onClearAll}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Hapus Semua"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-gray-300">
            <Bell size={40} className="mb-2 opacity-20" />
            <p className="text-xs font-medium">Tidak ada notifikasi</p>
          </div>
        ) : (
          notifications.sort((a,b) => b.timestamp - a.timestamp).map((notif) => (
            <div 
              key={notif.id}
              onClick={() => {
                onMarkAsRead(notif.id);
                onNotificationClick(notif);
              }}
              className={`px-5 py-4 border-b border-gray-50 transition-colors cursor-pointer hover:bg-gray-50 flex gap-4 ${!notif.read ? 'bg-blue-50/30' : ''}`}
            >
              <div className="mt-1 flex-shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <p className={`text-xs font-bold ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</p>
                  <span className="text-[8px] text-gray-400 whitespace-nowrap ml-2">
                    {new Date(notif.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{notif.message}</p>
              </div>
              {!notif.read && (
                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></div>
              )}
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (unreadCount > 0) && (
        <div className="p-3 bg-gray-50 text-center">
          <button 
            onClick={() => notifications.forEach(n => !n.read && onMarkAsRead(n.id))}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
          >
            Tandai semua dibaca
          </button>
        </div>
      )}
    </div>
  );
};
