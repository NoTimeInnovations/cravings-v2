CREATE OR REPLACE FUNCTION offer_distance(
    offer_geography GEOGRAPHY,
    user_lat FLOAT,
    user_lon FLOAT
)
RETURNS FLOAT AS $$
BEGIN
    RETURN ST_Distance(
        offer_geography,
        ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::GEOGRAPHY
    );
END;
$$ LANGUAGE plpgsql STABLE;
