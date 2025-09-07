CREATE OR REPLACE FUNCTION get_offer_distance_to_user(
    offer_id integer,
    user_id integer
)
RETURNS float AS $$
DECLARE
    distance_km float;
BEGIN
    -- Calculate distance in kilometers
    SELECT ST_Distance(
        o.coordinates,
        uc.user_coordinates
    ) / 1000 INTO distance_km  -- Convert meters to kilometers
    FROM common_offers o
    CROSS JOIN user_coordinates uc
    WHERE o.id = offer_id
    AND uc.user_id = get_offer_distance_to_user.user_id;
    
    RETURN distance_km;
END;
$$ LANGUAGE plpgsql STABLE;
