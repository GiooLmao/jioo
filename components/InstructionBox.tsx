import React from 'react';

interface InstructionBoxProps {
  visible: boolean;
  mode: 'view' | 'add';
}

export const InstructionBox: React.FC<InstructionBoxProps> = ({ visible, mode }) => {
  // Hanya tampilkan jika sedang dalam mode 'add'
  if (!visible || mode !== 'add') return null;

  return (
    <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full text-sm font-medium shadow-lg backdrop-blur-md transition-all duration-300 border border-blue-500 bg-blue-600/90 text-white animate-pulse whitespace-nowrap">
      Klik lokasi pada peta untuk menandai
    </div>
  );
};