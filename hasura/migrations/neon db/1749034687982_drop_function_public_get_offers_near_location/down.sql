CREATE OR REPLACE FUNCTION public.get_offers_near_location(user_lat double precision, user_lng double precision, max_distance integer DEFAULT 10000, limit_count integer DEFAULT NULL::integer, offset_count integer DEFAULT 0)
 RETURNS SETOF common_offers
 LANGUAGE sql
 STABLE
AS $function$
  SELECT o.*
  FROM public.common_offers o
  WHERE ST_Distance(
    ST_MakePoint(user_lng, user_lat)::geography,
    o.coordinates
  ) <= max_distance
  ORDER BY ST_Distance(
    ST_MakePoint(user_lng, user_lat)::geography,
    o.coordinates
  )
  LIMIT limit_count
  OFFSET offset_count;
$function$;
