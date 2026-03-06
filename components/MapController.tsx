import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface MapControllerProps {
  targetLocation: { lat: number; lng: number } | null;
}

export const MapController: React.FC<MapControllerProps> = ({ targetLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lng], 15, {
        animate: true,
        duration: 1.5
      });
      
      // Open popup if marker exists at this location (optional check, currently markers open by default on click)
      // Since markers are managed by parent, we rely on the flyTo to bring user attention
    }
  }, [targetLocation, map]);

  return null;
};