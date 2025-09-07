CREATE OR REPLACE FUNCTION public.get_offers_near_location(user_lat double precision, user_lng double precision)
 RETURNS SETOF common_offers
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.common_offers
  ORDER BY
    coordinates <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
END;
$function$;
