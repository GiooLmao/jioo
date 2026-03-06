
import React, { useState, useEffect, useRef } from 'react';
import { Report, HazardLevel, ReportStatus, Comment, AppUser } from '../types';
import { getRelativeTime } from '../utils/geo';
import { Search, MapPin, Share2, ThumbsUp, Clock, Activity, CheckCircle2, Info, MessageCircle, Send, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, Navigation, Trash2 } from 'lucide-react';

interface ReportSidebarProps {
  reports: Report[];
  currentUser: AppUser;
  onReportClick: (report: Report) => void;
  onVerify: (id: string) => void;
  onShare: (report: Report) => void;
  onStatusChange?: (id: string) => void;
  onAddComment?: (reportId: string, text: string) => void;
  onFlagReport?: (reportId: string, reason: string) => void;
  onDeleteReport?: (reportId: string) => void;
  highlightedReportId?: string | null;
  userLocation: { lat: number; lng: number } | null;
  radiusFilter: { enabled: boolean; distance: number };
  onRadiusFilterChange: (filter: { enabled: boolean; distance: number }) => void;
}

const getStatusConfig = (status: ReportStatus) => {
  switch (status) {
    case 'reported':
      return { label: 'Dilaporkan', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', icon: Clock };
    case 'reviewed':
      return { label: 'Ditinjau', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: Activity };
    case 'in_progress':
      return { label: 'Dikerjakan', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', icon: Activity };
    case 'resolved':
      return { label: 'Selesai', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', icon: CheckCircle2 };
  }
};

const getHazardInfo = (level: HazardLevel) => {
  switch (level) {
    case 'high': return { bg: 'bg-red-500', text: 'text-white', label: 'Darurat' };
    case 'medium': return { bg: 'bg-yellow-400', text: 'text-yellow-900', label: 'Sedang' };
    case 'low': return { bg: 'bg-green-500', text: 'text-white', label: 'Rendah' };
  }
};

export const ReportSidebar: React.FC<ReportSidebarProps> = ({ 
  reports, 
  currentUser, 
  onReportClick, 
  onVerify, 
  onShare, 
  onStatusChange, 
  onAddComment,
  onFlagReport,
  onDeleteReport,
  highlightedReportId,
  userLocation,
  radiusFilter,
  onRadiusFilterChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hazardFilter, setHazardFilter] = useState<HazardLevel | 'all'>('all');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const reportRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightedReportId && reportRefs.current[highlightedReportId]) {
      reportRefs.current[highlightedReportId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedReportId]);

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.address || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesHazard = hazardFilter === 'all' || report.hazardLevel === hazardFilter;

    return matchesSearch && matchesHazard;
  });

  const toggleComments = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCommentSubmit = (reportId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[reportId];
    if (text?.trim() && onAddComment) {
      onAddComment(reportId, text);
      setCommentInputs(prev => ({ ...prev, [reportId]: '' }));
    }
  };

  const handleFlagSubmit = (id: string, reason: string) => {
    if (onFlagReport) {
      onFlagReport(id, reason);
    }
    setFlaggingId(null);
  };

  const hasAccessToStatus = currentUser.role === 'government' || currentUser.role === 'developer';

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden relative">
      {/* Flag Reason Modal (Mini) */}
      {flaggingId && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[20] flex items-center justify-center p-6">
          <div className="bg-white w-full rounded-2xl shadow-2xl border border-gray-100 p-5 animate-scale-in">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Laporkan Konten?</h4>
            <div className="space-y-2">
              {['Trolling / Spam', 'Kata Kasar', 'Foto Tidak Pantas', 'Lokasi Palsu'].map(reason => (
                <button 
                  key={reason}
                  onClick={() => handleFlagSubmit(flaggingId, reason)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 text-xs font-medium transition-all"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setFlaggingId(null)}
              className="w-full mt-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Header Sidebar */}
      <div className="px-5 pb-5 pt-6 bg-gradient-to-r from-blue-600 to-indigo-600 z-10 shadow-md flex-shrink-0">
        <h1 className="text-xl font-bold mb-1 tracking-tight text-white">Laporan Warga</h1>
        <p className="text-blue-100 text-[10px] mb-3 opacity-90 uppercase tracking-wider">Pantau fasilitas publik</p>
        
        <div className="relative group mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder="Cari jalan atau masalah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-blue-900/30 border border-blue-400/30 text-white placeholder-blue-200/70 rounded-lg focus:outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-300 transition-all text-xs backdrop-blur-sm"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {['all', 'high', 'medium', 'low'].map((filter) => (
            <button 
              key={filter}
              onClick={() => setHazardFilter(filter as any)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${
                hazardFilter === filter 
                  ? 'bg-white text-blue-700 border-white shadow-md' 
                  : 'bg-blue-800/40 text-blue-100 border-transparent hover:bg-blue-700/50'
              }`}
            >
              {filter === 'all' ? 'Semua' : filter === 'high' ? 'Darurat' : filter === 'medium' ? 'Sedang' : 'Rendah'}
            </button>
          ))}
        </div>

        {/* Radius Filter UI */}
        <div className="mt-4 pt-3 border-t border-blue-400/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Navigation size={12} className="text-blue-200" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Filter Radius</span>
            </div>
            <button 
              onClick={() => onRadiusFilterChange({ ...radiusFilter, enabled: !radiusFilter.enabled })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${radiusFilter.enabled ? 'bg-emerald-500' : 'bg-blue-900/50 border border-blue-400/30'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${radiusFilter.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          
          {radiusFilter.enabled && (
            <div className="animate-fade-in">
              {!userLocation ? (
                <p className="text-[9px] text-blue-200 italic">Mencari lokasi Anda...</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-blue-100">Jarak Maksimal:</span>
                    <span className="text-[10px] font-bold text-white bg-blue-500/40 px-1.5 py-0.5 rounded">{radiusFilter.distance} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    step="1"
                    value={radiusFilter.distance}
                    onChange={(e) => onRadiusFilterChange({ ...radiusFilter, distance: parseInt(e.target.value) })}
                    className="w-full h-1 bg-blue-900/50 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[8px] text-blue-200/70 font-medium">
                    <span>1km</span>
                    <span>50km</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* List Laporan */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
        {filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Info size={32} className="mb-2 opacity-20" />
            <p className="font-medium text-xs">Belum ada laporan</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const statusInfo = getStatusConfig(report.status);
            const hazardInfo = getHazardInfo(report.hazardLevel);
            const isCommentsExpanded = !!expandedComments[report.id];
            
            return (
              <div
                key={report.id}
                ref={(el) => (reportRefs.current[report.id] = el)}
                onClick={() => onReportClick(report)}
                className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer overflow-hidden flex flex-col ${
                  highlightedReportId === report.id 
                    ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg scale-[1.02]' 
                    : 'border-gray-100 hover:shadow-md'
                }`}
              >
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="max-w-[70%]">
                      <h3 className="font-bold text-gray-800 text-xs leading-snug truncate">{report.categoryLabel}</h3>
                      <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
                         <MapPin size={10} className="mr-1 text-gray-400 flex-shrink-0" />
                         <span className="truncate">{report.address}</span>
                      </div>
                    </div>
                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${hazardInfo.bg} ${hazardInfo.text}`}>
                      {hazardInfo.label}
                    </div>
                  </div>

                  <div 
                    className={`flex items-center justify-between mb-2 bg-gray-50 p-1.5 rounded-lg border transition-all ${
                        hasAccessToStatus ? 'border-blue-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer group' : 'border-gray-100 cursor-default'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasAccessToStatus && onStatusChange) onStatusChange(report.id);
                    }}
                  >
                     <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></div>
                        <span className={`text-[10px] font-bold ${statusInfo.color.split(' ')[1]}`}>
                          {statusInfo.label}
                        </span>
                     </div>
                     {hasAccessToStatus && (
                         <div className="flex items-center gap-1 text-[8px] text-blue-500 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                             Ubah <ShieldCheck size={10} />
                         </div>
                     )}
                  </div>

                  <p className="text-[11px] text-gray-600 mb-2 line-clamp-2 leading-relaxed">{report.description}</p>
                  
                  {report.impactMetric && (
                      <div className="mb-2 px-2 py-1 bg-green-50 rounded border border-green-100 flex items-center gap-1.5">
                          <CheckCircle2 size={10} className="text-green-600" />
                          <span className="text-[9px] font-semibold text-green-700">{report.impactMetric}</span>
                      </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 mr-2">
                        <Clock size={10} />
                        <span>{getRelativeTime(report.timestamp)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onVerify(report.id); }}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${report.isVerifiedByCurrentUser ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          <ThumbsUp size={12} className={report.isVerifiedByCurrentUser ? 'fill-blue-700' : ''} />
                          {report.upvotes}
                        </button>

                        <button 
                          onClick={(e) => toggleComments(report.id, e)}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${isCommentsExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          <MessageCircle size={12} className={isCommentsExpanded ? 'fill-indigo-700' : ''} />
                          {report.comments?.length || 0}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {(currentUser.role === 'developer' || (currentUser.role === 'user' && report.reporterId === currentUser.id)) && onDeleteReport && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setReportToDelete(report.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Hapus Laporan"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setFlaggingId(report.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Tandai laporan bermasalah"
                        >
                          <AlertTriangle size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onShare(report); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Share2 size={14} />
                        </button>
                    </div>
                  </div>
                </div>

                {isCommentsExpanded && (
                  <div 
                    className="bg-gray-50 border-t border-gray-100 p-3 space-y-3 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {(!report.comments || report.comments.length === 0) ? (
                        <p className="text-[10px] text-gray-400 italic text-center py-2">Belum ada komentar</p>
                      ) : (
                        report.comments.map((comment) => (
                          <div key={comment.id} className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-bold text-blue-600">{comment.author}</span>
                              <span className="text-[8px] text-gray-400">{new Date(comment.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[10px] text-gray-700 leading-tight">{comment.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form 
                      onSubmit={(e) => handleCommentSubmit(report.id, e)}
                      className="flex gap-2"
                    >
                      <input 
                        type="text"
                        placeholder="Tulis komentar..."
                        value={commentInputs[report.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                        className="flex-1 text-[10px] px-3 py-1.5 rounded-full border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      />
                      <button 
                        type="submit"
                        disabled={!commentInputs[report.id]?.trim()}
                        className="p-1.5 bg-blue-600 text-white rounded-full disabled:bg-gray-300 transition-colors shadow-sm"
                      >
                        <Send size={12} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-gray-900">Hapus Laporan</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  if (onDeleteReport) onDeleteReport(reportToDelete);
                  setReportToDelete(null);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
