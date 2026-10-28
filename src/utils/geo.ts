import { SchoolLocationConfig } from '../types';

/**
 * Titik Koordinat Resmi SMA Negeri 1 Julok:
 * Jl. Alue Ie Mirah, Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur, Aceh
 * Latitude: 5.0309 (Lintang Utara)
 * Longitude: 97.6235 (Bujur Timur)
 */
export const DEFAULT_SCHOOL_LOCATION: SchoolLocationConfig = {
  schoolName: 'SMA Negeri 1 Julok',
  address: 'Jl. Alue Ie Mirah, Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur - Kode Pos 24457',
  latitude: 5.0309,
  longitude: 97.6235,
  radiusMeters: 200, // 200 meter menjangkau seluruh kompleks gedung, lapangan, kelas, dan ruang guru
  strictValidation: true, // Wajib berada dalam radius sekolah untuk absen mandiri
};

/**
 * Menghitung jarak antara 2 titik koordinat (meter) menggunakan rumus Haversine
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radius Bumi dalam meter
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format jarak menjadi teks ramah baca (meter atau kilometer)
 */
export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${meters} meter`;
  }
  const km = (meters / 1000).toFixed(2);
  return `${km} km`;
}

/**
 * Tautan Google Maps untuk melihat titik koordinat secara langsung
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Validasi apakah posisi pengguna berada di dalam radius toleransi sekolah
 */
export function validateUserLocation(
  userLat: number,
  userLng: number,
  config: SchoolLocationConfig = DEFAULT_SCHOOL_LOCATION
): {
  isInside: boolean;
  distanceMeters: number;
  maxRadius: number;
} {
  const distance = calculateDistanceMeters(
    userLat,
    userLng,
    config.latitude,
    config.longitude
  );

  return {
    isInside: distance <= config.radiusMeters,
    distanceMeters: distance,
    maxRadius: config.radiusMeters,
  };
}
