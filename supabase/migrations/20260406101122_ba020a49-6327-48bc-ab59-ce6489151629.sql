CREATE OR REPLACE FUNCTION public.nearby_artisans(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
    (6371 * acos(
      cos(radians(_lat)) * cos(radians(p.location_lat)) *
      cos(radians(p.location_lng) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(p.location_lat))
    )) AS distance_km
  FROM public.profiles p
  INNER JOIN public.artisan_profiles ap ON ap.user_id = p.user_id
  WHERE p.location_lat IS NOT NULL
    AND p.location_lng IS NOT NULL
    AND (6371 * acos(
      cos(radians(_lat)) * cos(radians(p.location_lat)) *
      cos(radians(p.location_lng) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(p.location_lat))
    )) <= _radius_km
  ORDER BY distance_km;
$$;