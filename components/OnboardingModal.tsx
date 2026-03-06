import React, { useState } from 'react';
import { Map, PlusCircle, List, Check, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Selamat Datang!",
      description: "Aplikasi ini memudahkan Anda melaporkan dan memantau kerusakan fasilitas publik di sekitar Anda secara langsung melalui peta.",
      icon: <Map className="w-14 h-14 text-blue-600 mb-4" />
    },
    {
      title: "Cara Melapor",
      description: "Tekan tombol + besar berwarna biru di pojok kanan bawah, lalu klik lokasi di peta untuk menandai fasilitas yang rusak.",
      icon: <PlusCircle className="w-14 h-14 text-blue-600 mb-4" />
    },
    {
      title: "Pantau & Filter",
      description: "Gunakan menu sidebar di kiri untuk melihat daftar semua laporan. Anda bisa memfilter berdasarkan tingkat bahaya: Tinggi, Sedang, atau Rendah.",
      icon: <List className="w-14 h-14 text-blue-600 mb-4" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col relative animate-fade-in-up border border-gray-100">
        
        {/* Skip Button */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-6 text-gray-500 hover:text-black text-xs font-bold uppercase tracking-widest z-10 transition-colors"
        >
          Lewati
        </button>

        {/* Content */}
        <div className="p-10 flex flex-col items-center text-center mt-4">
          <div className="bg-blue-50 p-6 rounded-full mb-6 ring-8 ring-blue-50/50">
            {steps[step].icon}
          </div>
          <h2 className="text-2xl font-semibold text-black mb-4 tracking-tight">{steps[step].title}</h2>
          <p className="text-gray-900 text-base font-medium leading-relaxed">
            {steps[step].description}
          </p>
        </div>

        {/* Footer / Controls */}
        <div className="bg-gray-50 px-10 py-7 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-blue-600 w-8' : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
          >
            {step === steps.length - 1 ? (
              <>Selesai <Check size={18} strokeWidth={3} /></>
            ) : (
              <>Lanjut <ArrowRight size={18} strokeWidth={3} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};