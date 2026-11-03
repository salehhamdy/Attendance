import math
from typing import List, Tuple, Optional, Any

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees) in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_nearest_branch(lat: float, lng: float, branches: List[Any]) -> Tuple[Optional[Any], float, bool]:
    """
    Finds the closest branch, distance in meters, and whether coordinate is inside allowed radius.
    """
    if not branches:
        return None, 0.0, True

    best_branch = None
    min_dist = float("inf")

    for branch in branches:
        b_lat = getattr(branch, "lat", None) or getattr(branch, "latitude", None)
        b_lng = getattr(branch, "lng", None) or getattr(branch, "longitude", None)
        if b_lat is None or b_lng is None:
            continue
        dist = haversine_distance(lat, lng, float(b_lat), float(b_lng))
        if dist < min_dist:
            min_dist = dist
            best_branch = branch

    if best_branch is None:
        return None, 0.0, True

    b_radius = getattr(best_branch, "radius", 300) or 300
    in_zone = min_dist <= float(b_radius)
    return best_branch, round(min_dist, 1), in_zone

