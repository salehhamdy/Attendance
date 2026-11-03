import { haversineDistance } from '../../../shared/utils/geo.js';

export const WORK_ZONE = {
  name: 'Rixos Radamis (Sharm El-Sheikh)',
  lat: 27.9158,
  lng: 34.33,
  radius: 300, // 300m designated work area
};

export const getDistanceMeters = haversineDistance;
