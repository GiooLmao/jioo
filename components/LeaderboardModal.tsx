
import React, { useState, useMemo } from 'react';
import { X, Trophy, MapPin, User, CheckCircle2, AlertTriangle, Calendar, ChevronRight, BarChart3 } from 'lucide-react';
import { Report, HazardLevel, ReportStatus } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: Report[];
}

type LeaderboardTab = 'regions' | 'users';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, reports }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('regions');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [regionSort, setRegionSort] = useState<'total' | 'resolved'>('total');

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    reports.forEach(r => {
      years.add(new Date(r.timestamp).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (yearFilter === 'all') return reports;
    return reports.filter(r => new Date(r.timestamp).getFullYear() === yearFilter);
  }, [reports, yearFilter]);

  // Helper to extract region from address (assuming Bandung context)
  const getRegion = (address?: string) => {
    if (!address) return 'Lokasi Tidak Diketahui';
    // Simple heuristic: take the first part or look for common Bandung districts
    const districts = ['Coblong', 'Lengkong', 'Cicendo', 'Sumur Bandung', 'Regol', 'Astana Anyar', 'Bojongloa', 'Antapani', 'Arcamanik'];
    for (const d of districts) {
      if (address.toLowerCase().includes(d.toLowerCase())) return d;
    }
    return address.split(',')[0] || 'Lainnya';
  };

  const regionStats = useMemo(() => {
    const stats: Record<string, { 
      name: string; 
      total: number; 
      low: number; 
      medium: number; 
      high: number; 
      resolved: number;
    }> = {};

    filteredReports.forEach(r => {
      const region = getRegion(r.address);
      if (!stats[region]) {
        stats[region] = { name: region, total: 0, low: 0, medium: 0, high: 0, resolved: 0 };
      }
      stats[region].total++;
      if (r.hazardLevel === 'low') stats[region].low++;
      if (r.hazardLevel === 'medium') stats[region].medium++;
      if (r.hazardLevel === 'high') stats[region].high++;
      if (r.status === 'resolved') stats[region].resolved++;
    });

    return Object.values(stats).sort((a, b) => {
      if (regionSort === 'resolved') return b.resolved - a.resolved;
      return b.total - a.total;
    });
  }, [filteredReports, regionSort]);

  const userStats = useMemo(() => {
    const stats: Record<string, { 
      id: string; 
      name: string; 
      count: number; 
    }> = {};

    filteredReports.forEach(r => {
      const userId = r.reporterId || 'anonymous';
      // In a real app, we'd fetch the user name. For now, we use a placeholder or the ID.
      const userName = userId === 'developer_id' ? 'Developer Master' : 
                       userId === 'user_id' ? 'Warga Bandung' : 
                       userId === 'government_id' ? 'Petugas Dinas PU' : 'Warga Anonim';
      
      if (!stats[userId]) {
        stats[userId] = { id: userId, name: userName, count: 0 };
      }
      stats[userId].count++;
    });

    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Trophy size={24} className="text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Leaderboard Publik</h2>
              <p className="text-indigo-100 text-xs opacity-80">Statistik kontribusi & kondisi wilayah</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Filters & Tabs */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex bg-gray-200/50 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('regions')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'regions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MapPin size={14} /> Wilayah
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <User size={14} /> Kontributor
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar size={14} className="text-gray-400" />
            <select 
              value={yearFilter} 
              onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full sm:w-32"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'regions' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Peringkat Wilayah</h3>
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                  <button 
                    onClick={() => setRegionSort('total')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${regionSort === 'total' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    Laporan Terbanyak
                  </button>
                  <button 
                    onClick={() => setRegionSort('resolved')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${regionSort === 'resolved' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    Paling Banyak Diperbaiki
                  </button>
                </div>
              </div>
              
              {regionStats.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Belum ada data wilayah untuk periode ini</p>
                </div>
              ) : (
                regionStats.map((stat, index) => (
                  <div key={stat.name} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                          index === 1 ? 'bg-gray-100 text-gray-600' : 
                          index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{stat.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
                        <CheckCircle2 size={12} /> {stat.resolved} Diperbaiki
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-red-50 p-2 rounded-xl border border-red-100">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-red-600 uppercase mb-1">
                          <AlertTriangle size={10} /> Darurat
                        </div>
                        <div className="text-lg font-black text-red-700 leading-none">{stat.high}</div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded-xl border border-yellow-100">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-yellow-700 uppercase mb-1">
                          <AlertTriangle size={10} /> Sedang
                        </div>
                        <div className="text-lg font-black text-yellow-800 leading-none">{stat.medium}</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase mb-1">
                          <AlertTriangle size={10} /> Rendah
                        </div>
                        <div className="text-lg font-black text-blue-700 leading-none">{stat.low}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {userStats.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <User size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Belum ada data kontributor</p>
                </div>
              ) : (
                userStats.map((stat, index) => (
                  <div key={stat.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold relative ${
                        index === 0 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' : 
                        index === 1 ? 'bg-gray-300 text-white' : 
                        index === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {index + 1}
                        {index < 3 && <Trophy size={12} className="absolute -top-1 -right-1 text-white" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{stat.name}</h4>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ID: {stat.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-indigo-600 leading-none">{stat.count}</div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Laporan</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-medium italic">Data diperbarui secara real-time berdasarkan laporan warga.</p>
        </div>
      </div>
    </div>
  );
};
