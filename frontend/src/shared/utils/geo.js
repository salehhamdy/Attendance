/**
 * Computes great-circle distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in meters rounded to nearest integer
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the nearest approved branch or office site from a given GPS coordinate.
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{id: number|string, name: string, lat: number, lng: number, radius: number}>} branches
 * @returns {{branch: Object|null, distance: number|null, inZone: boolean}}
 */
export function findNearestBranch(lat, lng, branches = []) {
  if (!branches || !branches.length || typeof lat !== 'number' || typeof lng !== 'number') {
    return { branch: null, distance: null, inZone: false };
  }

  let nearestBranch = null;
  let minDistance = Infinity;

  for (const b of branches) {
    const dist = haversineDistance(lat, lng, b.lat, b.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestBranch = b;
    }
  }

  const radius = nearestBranch ? Number(nearestBranch.radius) || 300 : 300;
  return {
    branch: nearestBranch,
    distance: minDistance,
    inZone: minDistance <= radius,
  };
}
