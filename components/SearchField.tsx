
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import L from 'leaflet';

export const SearchField = () => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider({
      params: {
        'accept-language': 'id', // Hasil dalam Bahasa Indonesia
        countrycodes: 'id',      // Fokus hanya di Indonesia
        addressdetails: 1,       // Ambil detail alamat lengkap
      },
    });

    const searchControl = new (GeoSearchControl as any)({
      provider: provider,
      style: 'bar',
      position: 'topleft',
      showMarker: true, // Menampilkan marker sementara di lokasi yang dicari
      showPopup: true,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: 'Cari lokasi (contoh: Gedung Sate, Monas)...',
      marker: {
        icon: new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        }),
        draggable: false,
      },
    });

    map.addControl(searchControl);

    // LOGIKA TERBANG (Fly To) SAAT ENTER/PILIH LOKASI
    map.on('geosearch/showlocation', (result: any) => {
      if (result && result.location) {
        map.flyTo([result.location.y, result.location.x], 18, {
          animate: true,
          duration: 2.0 // Durasi terbang yang halus
        });
      }
    });

    return () => {
      map.off('geosearch/showlocation');
      map.removeControl(searchControl);
    };
  }, [map]);

  return null;
};
