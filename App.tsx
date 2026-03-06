
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Plus, X, ChevronRight, ChevronLeft, HelpCircle, CheckCircle, Clock, Trophy } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { io, Socket } from 'socket.io-client';

import { Report, HazardLevel, ReportStatus, Comment, AppUser, UserRole, AppNotification, FlaggedReport } from './types';
import { calculateDistance, getRelativeTime } from './utils/geo';
import { InstructionBox } from './components/InstructionBox';
import { ReportForm } from './components/ReportForm';
import { SearchField } from './components/SearchField';
import { ReportSidebar } from './components/ReportSidebar';
import { MapController } from './components/MapController';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileMenu } from './components/ProfileMenu';
import { LeaderboardModal } from './components/LeaderboardModal';

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createMarkerIcon = (color: string) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const icons = {
  reported: createMarkerIcon('grey'),
  reviewed: createMarkerIcon('blue'),
  in_progress: createMarkerIcon('orange'),
  resolved: createMarkerIcon('green'),
  temp: createMarkerIcon('red')
};

const fetchAddressAI = async (lat: number, lng: number): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Apa alamat lengkap dan nama tempat/jalan yang paling mendekati koordinat ini? Berikan jawaban singkat (maksimal 10 kata) yang langsung menunjukkan nama jalan atau lokasi.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });
    return response.text?.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("AI Address Fetch Error:", error);
    return `Lokasi: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

const MapEvents = ({ 
  isAddingMode, 
  onMapClick,
  onMoveStart,
  onMoveEnd
}: { 
  isAddingMode: boolean; 
  onMapClick: (lat: number, lng: number) => void;
  onMoveStart: () => void;
  onMoveEnd: () => void;
}) => {
  useMapEvents({
    click(e) {
      if (isAddingMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    movestart() {
      onMoveStart();
    },
    moveend() {
      onMoveEnd();
    }
  });
  return null;
};

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [flyToPosition, setFlyToPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // SYSTEM STATES
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastFlagTime, setLastFlagTime] = useState<number>(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [highlightedReportId, setHighlightedReportId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // RADIUS FILTER STATE
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<{ enabled: boolean; distance: number }>({
    enabled: false,
    distance: 5 // Default 5km
  });
  
  // USER STATE
  const [currentUser, setCurrentUser] = useState<AppUser>({
    id: 'developer_id',
    name: 'Developer Mode',
    role: 'developer'
  });

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // Fetch initial data
    fetch('/api/initial-data')
      .then(res => res.json())
      .then(data => {
        setReports(data.reports);
        setNotifications(data.notifications);
      });

    // Listen for events
    newSocket.on('report:created', (report) => {
      setReports(prev => {
        if (prev.find(r => r.id === report.id)) return prev;
        return [report, ...prev];
      });
    });

    newSocket.on('report:updated', (report) => {
      setReports(prev => prev.map(r => r.id === report.id ? report : r));
    });

    newSocket.on('report:deleted', (id) => {
      setReports(prev => prev.filter(r => r.id !== id));
    });

    newSocket.on('notification:created', (notif) => {
      setNotifications(prev => {
        if (prev.find(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    });

    newSocket.on('notification:updated', (id) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    });

    newSocket.on('notification:cleared', (userId) => {
      setNotifications(prev => prev.filter(n => n.userId !== userId));
    });

    const hasSeen = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeen) setShowOnboarding(true);

    // Get user location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }

    return () => {
      newSocket.close();
    };
  }, []);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Date.now().toString() + Math.random(),
      timestamp: Date.now(),
      read: false
    };
    if (socket) {
      socket.emit('notification:create', newNotif);
    } else {
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleMarkNotifRead = (id: string) => {
    if (socket) {
      socket.emit('notification:mark-read', id);
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const handleClearNotifications = () => {
    if (socket) {
      socket.emit('notification:clear-all', currentUser.id);
    } else {
      setNotifications(prev => prev.filter(n => n.userId !== currentUser.id));
    }
  };

  const handleSwitchRole = (role: UserRole) => {
    const names = {
      user: 'Warga Bandung',
      government: 'Petugas Dinas PU',
      developer: 'Developer Master'
    };
    setCurrentUser({
      id: role + '_id',
      name: names[role],
      role: role
    });
    if (role === 'government') {
      setIsAddingMode(false);
    }
  };

  const bandungCenter: L.LatLngExpression = [-6.9175, 107.6191];
  const bounds = L.latLngBounds(L.latLng(6.0, 95.0), L.latLng(-11.0, 141.0));

  const handleStartAdding = () => {
    if (currentUser.role === 'government') return;
    setIsAddingMode(true);
    setFlyToPosition(null); 
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!isAddingMode || currentUser.role === 'government') return;
    setTempLocation({ lat, lng });
    setIsFormOpen(true);
    setIsAddingMode(false);
  };

  const handleSubmitReport = async (data: {
    mainCategory: string;
    subCategory: string;
    categoryLabel: string;
    description: string;
    photoUrl: string | null;
    hazardLevel: HazardLevel;
  }) => {
    if (!tempLocation) return;

    const tempId = Date.now().toString();
    const newReport: Report = {
      id: tempId,
      lat: tempLocation.lat,
      lng: tempLocation.lng,
      address: 'Menganalisis lokasi...',
      ...data,
      timestamp: Date.now(),
      status: 'reported',
      upvotes: 0,
      comments: [],
      reporterId: currentUser.id
    };

    if (socket) {
      socket.emit('report:create', newReport);
    } else {
      setReports((prev) => [newReport, ...prev]);
    }
    setIsFormOpen(false);
    setTempLocation(null);
    setFlyToPosition({ lat: newReport.lat, lng: newReport.lng });

    // Notify government of new report
    addNotification({
      userId: 'government_id',
      title: 'Laporan Baru Masuk',
      message: `${newReport.categoryLabel} dilaporkan di ${newReport.address || 'lokasi baru'}.`,
      type: 'new_report',
      relatedReportId: tempId
    });

    const address = await fetchAddressAI(newReport.lat, newReport.lng);
    const finalReport = { ...newReport, address };
    if (socket) {
      socket.emit('report:update', finalReport);
    } else {
      setReports((prev) => prev.map(r => 
        r.id === tempId ? finalReport : r
      ));
    }
  };

  const handleStatusChange = (id: string) => {
    if (currentUser.role === 'user') return;

    const statusCycle: ReportStatus[] = ['reported', 'reviewed', 'in_progress', 'resolved'];
    const report = reports.find(r => r.id === id);
    if (!report) return;

    const currentIndex = statusCycle.indexOf(report.status);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const newStatus = statusCycle[nextIndex];
    const updates: Partial<Report> = { status: newStatus };
    
    if (newStatus === 'resolved') {
      updates.impactMetric = `Selesai diperbaiki oleh tim ${currentUser.name}`;
      // Notify Reporter
      if (report.reporterId) {
        addNotification({
          userId: report.reporterId,
          title: 'Laporan Anda Selesai!',
          message: `Fasilitas '${report.categoryLabel}' telah selesai diperbaiki. Terima kasih atas laporannya!`,
          type: 'status_change',
          relatedReportId: report.id
        });
      }
    }

    const updatedReport = { ...report, ...updates };
    if (socket) {
      socket.emit('report:update', updatedReport);
    } else {
      setReports((prev) => prev.map(r => r.id === id ? updatedReport : r));
    }
  };

  const handleFlagReport = (reportId: string, reason: string) => {
    const now = Date.now();
    const COOLDOWN_MS = 60000; // 1 Menit

    if (now - lastFlagTime < COOLDOWN_MS) {
      const remainingSecs = Math.ceil((COOLDOWN_MS - (now - lastFlagTime)) / 1000);
      alert(`Mohon tunggu ${remainingSecs} detik sebelum melaporkan konten lagi.`);
      return;
    }

    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Notify Developer
    addNotification({
      userId: 'developer_id',
      title: 'Laporan Ditandai (Flagged)',
      message: `Laporan #${reportId} ditandai sebagai: "${reason}" oleh ${currentUser.name}.`,
      type: 'flagged',
      relatedReportId: reportId
    });

    // Set Cooldown
    setLastFlagTime(now);

    // Show Thank You Bar
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 3000);
  };

  const handleVerifyReport = (id: string) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    const isVerified = report.isVerifiedByCurrentUser;
    const updatedReport = {
      ...report,
      upvotes: isVerified ? report.upvotes - 1 : report.upvotes + 1,
      isVerifiedByCurrentUser: !isVerified
    };

    if (socket) {
      socket.emit('report:update', updatedReport);
    } else {
      setReports((prev) => prev.map(r => r.id === id ? updatedReport : r));
    }
  };

  const handleAddComment = (reportId: string, text: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      text,
      author: currentUser.name,
      timestamp: Date.now()
    };

    const updatedReport = {
      ...report,
      comments: [...(report.comments || []), newComment]
    };

    if (socket) {
      socket.emit('report:update', updatedReport);
    } else {
      setReports((prev) => prev.map(r => r.id === reportId ? updatedReport : r));
    }
  };

  const handleShareReport = (report: Report) => {
    const dummyLink = `https://lapor-fasilitas.id/report/${report.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Laporan: ${report.categoryLabel}`,
        text: `Bantu verifikasi laporan ini: ${report.description}`,
        url: dummyLink,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(dummyLink);
      alert(`Link disalin: ${dummyLink}`);
    }
  };

  const handleDeleteReport = (id: string) => {
    if (socket) {
      socket.emit('report:delete', id);
    } else {
      setReports((prev) => prev.filter(r => r.id !== id));
    }
    addNotification({
      userId: currentUser.id,
      title: 'Laporan Dihapus',
      message: 'Laporan berhasil dihapus dari sistem.',
      type: 'flagged' // Reusing flagged type for alert icon
    });
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (notif.relatedReportId) {
      const report = reports.find(r => r.id === notif.relatedReportId);
      if (report) {
        setFlyToPosition({ lat: report.lat, lng: report.lng });
        setIsSidebarCollapsed(false);
        setHighlightedReportId(report.id);
        // Reset highlight after 3 seconds
        setTimeout(() => setHighlightedReportId(null), 3000);
      }
    }
  };

  const handleSidebarReportClick = (report: Report) => {
    setFlyToPosition({ lat: report.lat, lng: report.lng });
  };

  const sidebarWidth = '320px';
  const canAddReport = currentUser.role === 'user' || currentUser.role === 'developer';
  
  // Filter reports based on radius if enabled
  const displayedReports = reports.filter(report => {
    if (!radiusFilter.enabled || !userLocation) return true;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      report.lat,
      report.lng
    );
    return distance <= radiusFilter.distance;
  });

  // Filter notifications for current user
  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-gray-100 font-sans text-gray-800 relative">
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
      {isLeaderboardOpen && (
        <LeaderboardModal 
          isOpen={isLeaderboardOpen} 
          onClose={() => setIsLeaderboardOpen(false)} 
          reports={reports} 
        />
      )}
      
      {/* Thank You Popup Bar */}
      {showThankYou && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[3000] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in-up border border-emerald-400/30 backdrop-blur-md">
           <CheckCircle size={20} className="text-emerald-200" />
           <p className="font-bold text-sm tracking-tight">Terima Kasih atas laporannya!</p>
        </div>
      )}

      {/* Profile & Role Switcher */}
      <div className={`absolute top-4 right-4 z-[1010] flex items-center gap-3 transition-all duration-500 ${
        (isFormOpen || isAddingMode) ? 'opacity-0 pointer-events-none translate-y-[-20px]' : 
        isMapMoving ? 'opacity-40' : 'opacity-100'
      }`}>
        <button 
          onClick={() => setIsLeaderboardOpen(true)}
          className="bg-white hover:bg-gray-50 text-indigo-600 p-3 rounded-2xl shadow-xl border border-gray-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
          title="Buka Leaderboard"
        >
          <Trophy size={20} className="text-yellow-500 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold hidden md:block">Leaderboard</span>
        </button>
        <ProfileMenu 
          currentUser={currentUser} 
          notifications={userNotifications}
          onSwitchRole={handleSwitchRole}
          onMarkAsRead={handleMarkNotifRead}
          onClearAllNotifications={handleClearNotifications}
          onNotificationClick={handleNotificationClick}
        />
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={`absolute top-1/2 -translate-y-1/2 z-[1005] bg-white hover:bg-gray-50 text-blue-600 p-0 rounded-r-xl shadow-xl border border-gray-200 transition-all duration-300 ease-in-out w-8 h-12 flex items-center justify-center group ${
          isMapMoving ? 'opacity-40' : 'opacity-100'
        }`}
        style={{ left: isSidebarCollapsed ? '0px' : sidebarWidth }}
      >
        {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar */}
      <div 
        className={`h-full flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-[1001] relative`}
        style={{ width: isSidebarCollapsed ? '0px' : sidebarWidth, opacity: isSidebarCollapsed ? 0 : 1, transform: isSidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)' }}
      >
         <ReportSidebar 
          reports={displayedReports} 
          currentUser={currentUser}
          onReportClick={handleSidebarReportClick} 
          onVerify={handleVerifyReport}
          onShare={handleShareReport}
          onStatusChange={handleStatusChange}
          onAddComment={handleAddComment}
          onFlagReport={handleFlagReport}
          onDeleteReport={handleDeleteReport}
          highlightedReportId={highlightedReportId}
          userLocation={userLocation}
          radiusFilter={radiusFilter}
          onRadiusFilterChange={setRadiusFilter}
        />
      </div>

      {/* Map Area */}
      <div className={`flex-1 relative h-full min-w-0 ${(isFormOpen || isAddingMode) ? 'hide-search-control' : ''}`}>
        <MapContainer 
          center={bandungCenter} 
          zoom={13} 
          minZoom={4}
          maxBounds={bounds}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          className={`h-full w-full z-0 transition-cursor duration-200 ${isAddingMode ? 'cursor-crosshair' : ''}`}
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />
          
          <SearchField />
          <MapController targetLocation={flyToPosition} />
          <MapEvents 
            isAddingMode={isAddingMode} 
            onMapClick={handleMapClick}
            onMoveStart={() => setIsMapMoving(true)}
            onMoveEnd={() => setIsMapMoving(false)}
          />

          {displayedReports.map((report) => (
            <Marker key={report.id} position={[report.lat, report.lng]} icon={icons[report.status] || icons.reported}>
              <Popup className="custom-popup" autoPan={true}>
                <div className="min-w-[180px] max-w-[220px]">
                  <div className="mb-1 flex justify-between items-center">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 uppercase tracking-wide">
                      {report.categoryLabel}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 leading-tight">{report.address}</h3>
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">{report.description}</p>
                  {report.photoUrl && (
                    <img src={report.photoUrl} alt="Laporan" className="w-full h-24 object-cover rounded-md border border-gray-100 mb-2" />
                  )}
                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-100">
                     <div className="flex items-center gap-1 text-[9px] text-gray-400">
                       <Clock size={10} />
                       <span>{getRelativeTime(report.timestamp)}</span>
                     </div>
                     <span className="text-[10px] font-bold text-blue-600">
                       {report.upvotes} Vote
                     </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} icon={icons.temp} />}
        </MapContainer>

        <InstructionBox visible={true} mode={isAddingMode ? 'add' : 'view'} />

        {!isAddingMode && (
          <div 
            className={`fixed bottom-8 left-6 z-[1000] transition-all duration-500 ${
              (isFormOpen || isAddingMode) ? 'opacity-0 pointer-events-none translate-y-[20px]' : 
              isMapMoving ? 'opacity-40' : 'opacity-100'
            }`} 
            style={{ left: isSidebarCollapsed ? '24px' : `calc(${sidebarWidth} + 24px)`, transition: 'left 0.3s ease, opacity 0.5s ease, transform 0.5s ease' }}
          >
            <button
              onClick={() => setShowOnboarding(true)}
              className="bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
            >
              <HelpCircle size={20} className="text-gray-400 group-hover:text-blue-600" />
              <span className="font-medium text-sm">Bantuan</span>
            </button>
          </div>
        )}

        <div className={`absolute bottom-6 right-6 z-[1000] flex flex-col items-end space-y-3 transition-all duration-300 ${isMapMoving ? 'opacity-40' : 'opacity-100'}`}>
          {isAddingMode ? (
             <button
              onClick={() => setIsAddingMode(false)}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full shadow-lg font-semibold flex items-center transition-all animate-fade-in-up"
            >
              <X size={20} className="mr-2" />
              Batal
            </button>
          ) : (
            canAddReport && (
              <button
                onClick={handleStartAdding}
                className="group bg-gradient-to-tr from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white w-14 h-14 md:w-16 md:h-16 rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              >
                <Plus size={32} />
              </button>
            )
          )}
        </div>

        {isFormOpen && tempLocation && (
          <ReportForm 
            lat={tempLocation.lat} 
            lng={tempLocation.lng} 
            onClose={() => { setIsFormOpen(false); setTempLocation(null); }}
            onSubmit={handleSubmitReport}
          />
        )}
      </div>
    </div>
  );
};

export default App;
