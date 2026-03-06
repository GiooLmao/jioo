import React, { useState, useRef, useEffect } from 'react';
import { HazardLevel, ReportCategoryData } from '../types';
import { X, Upload, AlertCircle, AlertTriangle, CheckCircle2, MapPinOff, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface ReportFormProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: (data: {
    mainCategory: string;
    subCategory: string;
    categoryLabel: string;
    description: string;
    photoUrl: string | null;
    hazardLevel: HazardLevel;
  }) => void;
}

// Definisi Kategori Bercabang (Branching Logic)
const CATEGORIES: ReportCategoryData[] = [
  {
    id: 'infrastructure',
    label: 'Infrastruktur Jalan',
    subCategories: [
      { id: 'pothole', label: 'Jalan Berlubang' },
      { id: 'streetlight', label: 'Lampu Jalan Mati' },
      { id: 'sidewalk', label: 'Trotoar Rusak' },
      { id: 'signage', label: 'Rambu Lalu Lintas' }
    ]
  },
  {
    id: 'environment',
    label: 'Lingkungan & Kebersihan',
    subCategories: [
      { id: 'trash', label: 'Tumpukan Sampah' },
      { id: 'flood', label: 'Banjir / Genangan' },
      { id: 'tree', label: 'Pohon Tumbang' }
    ]
  },
  {
    id: 'facility',
    label: 'Fasilitas Umum',
    subCategories: [
      { id: 'playground', label: 'Taman Bermain' },
      { id: 'bench', label: 'Bangku Taman' },
      { id: 'bus_stop', label: 'Halte Bus' }
    ]
  },
  {
    id: 'other',
    label: 'Lainnya',
    subCategories: [] 
  }
];

// Fungsi menghitung jarak (Haversine Formula) untuk Geofencing
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const ReportForm: React.FC<ReportFormProps> = ({ lat, lng, onClose, onSubmit }) => {
  // Geofencing State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  // Form Data State
  const [selectedMainCat, setSelectedMainCat] = useState<string>('');
  const [selectedSubCats, setSelectedSubCats] = useState<string[]>([]);
  const [otherCategoryText, setOtherCategoryText] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false); // Dropdown toggle

  const [description, setDescription] = useState('');
  const [hazardLevel, setHazardLevel] = useState<HazardLevel>('medium');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Contextual Geofencing Check
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setUserLocation({ lat: userLat, lng: userLng });
          
          const dist = getDistance(userLat, userLng, lat, lng);
          if (dist > 500) {
            setDistanceError(`Lokasi Anda terlalu jauh (${Math.round(dist)}m) dari titik laporan. Harap melapor di lokasi kejadian.`);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error("GPS Error", error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  }, [lat, lng]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMainCategorySelect = (id: string) => {
    setSelectedMainCat(id);
    setSelectedSubCats([]); // Reset sub category
    setOtherCategoryText('');
    setIsCategoryDropdownOpen(false); // Close dropdown
  };

  const handleSubCategoryToggle = (id: string) => {
    setSelectedSubCats(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMainCat) return;
    if (selectedMainCat !== 'other' && selectedSubCats.length === 0) return;
    if (selectedMainCat === 'other' && !otherCategoryText.trim()) return;

    const mainCatLabel = CATEGORIES.find(c => c.id === selectedMainCat)?.label || '';
    
    let categoryLabel = mainCatLabel;
    let subCatId = selectedSubCats.join(',');

    if (selectedMainCat !== 'other') {
       const subCatLabels = selectedSubCats.map(subId => 
         CATEGORIES.find(c => c.id === selectedMainCat)
           ?.subCategories.find(s => s.id === subId)?.label || ''
       ).filter(Boolean);
       
       if (subCatLabels.length > 0) {
         categoryLabel = `${mainCatLabel} - ${subCatLabels.join(', ')}`;
       }
    } else {
       subCatId = 'general';
       categoryLabel = otherCategoryText;
    }

    onSubmit({
      mainCategory: selectedMainCat,
      subCategory: subCatId,
      categoryLabel: categoryLabel,
      description,
      photoUrl,
      hazardLevel
    });
  };

  const currentMainCategory = CATEGORIES.find(c => c.id === selectedMainCat);

  // Render Geofencing Blocker
  if (distanceError) {
    return (
      <div className="fixed top-5 right-5 z-[3000] w-full max-w-[320px] p-6 rounded-2xl bg-white shadow-2xl border border-red-100 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <MapPinOff className="text-red-500 w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Lokasi Tidak Valid</h3>
          <p className="text-sm text-gray-600 mb-4">{distanceError}</p>
          <button onClick={onClose} className="w-full py-2 bg-gray-100 font-semibold rounded-lg hover:bg-gray-200 text-gray-700">Tutup</button>
        </div>
      </div>
    );
  }

  // Validation for Submit Button (Photo is now optional)
  const isSubmitDisabled = 
    !selectedMainCat || 
    (selectedMainCat !== 'other' && selectedSubCats.length === 0) || 
    (selectedMainCat === 'other' && !otherCategoryText.trim()) ||
    !description.trim();

  return (
    <div className="fixed top-0 md:top-5 md:right-5 z-[3000] w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[340px] bg-white md:rounded-2xl shadow-2xl animate-fade-in flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white md:rounded-t-2xl sticky top-0 z-10">
        <h2 className="text-lg font-bold text-gray-800">Lapor Baru</h2>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* SECTION 1: Category Dropdown */}
        <div className="relative">
           <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori Laporan</label>
           <button
             type="button"
             onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
             className={`w-full text-left px-4 py-3 rounded-xl border flex justify-between items-center bg-white transition-all ${
               isCategoryDropdownOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:border-blue-400'
             }`}
           >
             <span className={`${selectedMainCat ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
               {currentMainCategory ? currentMainCategory.label : 'Pilih kategori masalah...'}
             </span>
             {isCategoryDropdownOpen ? <ChevronUp size={20} className="text-gray-500"/> : <ChevronDown size={20} className="text-gray-500"/>}
           </button>

           {/* Dropdown Options */}
           {isCategoryDropdownOpen && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in-down max-h-60 overflow-y-auto">
               {CATEGORIES.map((cat) => (
                 <button
                   key={cat.id}
                   type="button"
                   onClick={() => handleMainCategorySelect(cat.id)}
                   className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between"
                 >
                   {cat.label}
                   {selectedMainCat === cat.id && <CheckCircle2 size={16} className="text-blue-600" />}
                 </button>
               ))}
             </div>
           )}
        </div>

        {/* SECTION 2: Sub-Categories (Conditional) */}
        {selectedMainCat && selectedMainCat !== 'other' && currentMainCategory && (
          <div className="animate-fade-in">
             <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Detail Masalah (Bisa pilih lebih dari satu)</label>
             <div className="grid grid-cols-1 gap-2">
               {currentMainCategory.subCategories.map((sub) => (
                 <button
                   key={sub.id}
                   type="button"
                   onClick={() => handleSubCategoryToggle(sub.id)}
                   className={`text-sm py-2.5 px-4 rounded-lg text-left transition-all border flex justify-between items-center ${
                     selectedSubCats.includes(sub.id)
                       ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' 
                       : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-white hover:border-gray-300'
                   }`}
                 >
                   <span>{sub.label}</span>
                   {selectedSubCats.includes(sub.id) && <CheckCircle2 size={16} className="text-white" />}
                 </button>
               ))}
             </div>
          </div>
        )}

        {/* SECTION 2b: Other Category Input */}
        {selectedMainCat === 'other' && (
          <div className="animate-fade-in">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Detail Masalah Lainnya</label>
            <input
              type="text"
              value={otherCategoryText}
              onChange={(e) => setOtherCategoryText(e.target.value)}
              placeholder="Sebutkan jenis masalah..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
        )}

        {/* SECTION 3: Description (Moved Up) */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi & Lokasi</label>
          <textarea 
            id="description" 
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm bg-gray-50 focus:bg-white transition-colors"
            placeholder="Patokan lokasi (mis: depan minimarket)..."
          />
        </div>

        {/* SECTION 4: Urgency / Hazard Level (Moved Down) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tingkat Bahaya</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'Rendah', color: 'green', icon: CheckCircle2 },
              { id: 'medium', label: 'Sedang', color: 'yellow', icon: AlertTriangle },
              { id: 'high', label: 'Darurat', color: 'red', icon: AlertCircle },
            ].map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setHazardLevel(level.id as HazardLevel)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  hazardLevel === level.id 
                    ? `bg-${level.color}-50 border-${level.color}-500 text-${level.color}-700 ring-1 ring-${level.color}-500 shadow-sm` 
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <level.icon size={20} className={`mb-1 ${hazardLevel === level.id ? `text-${level.color}-600` : 'text-gray-400'}`} />
                <span className="text-xs font-bold">{level.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 5: Photo (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Bukti (Opsional)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden relative ${
                photoUrl ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload size={24} className="text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                <span className="text-xs text-gray-500 font-medium">Ambil Foto / Upload</span>
              </>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitDisabled}
          className={`w-full font-bold py-3.5 rounded-full shadow-lg transition-all transform flex items-center justify-center ${
              isSubmitDisabled 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30 active:scale-95'
          }`}
        >
          Kirim Laporan <ArrowRight size={18} className="ml-2" />
        </button>

      </form>
    </div>
  );
};