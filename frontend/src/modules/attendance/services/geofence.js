import { haversineDistance, findNearestBranch } from '../../../shared/utils/geo.js';

export const DEFAULT_ZONE = {
  name: 'Main Business Location',
  lat: 27.9158,
  lng: 34.33,
  radius: 300,
};

export const WORK_ZONE = DEFAULT_ZONE;
export const getDistanceMeters = haversineDistance;
export { findNearestBranch };
