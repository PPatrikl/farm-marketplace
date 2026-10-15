-- Migration: forest_listings_full gets primary_image_url
-- Date: 2026-10-14
-- Applied to Supabase: yes (SQL Editor, 2026-10-14)
--
-- Why: Metsätori cards and the detail page always showed the fallback photo,
-- because the view had no image column.
--
-- History of this view:
--   2026-10-13  added lat, lng (from PostGIS location)
--   2026-10-14  added primary_image_url (primary image, else first by sort_order)
--
-- NOTE: create or replace view can only ADD columns at the END.
-- Always start from this (latest) definition when changing the view.

create or replace view forest_listings_full as
select fol.id,
    fol.seller_id,
    fol.status,
    fol.product_type,
    fol.product_name,
    fol.description,
    fol.quantity,
    fol.unit,
    fol.price_per_unit,
    fol.harvested_at,
    fol.delivery_available,
    fol.pickup_only,
    fol.delivery_area,
    fol.city,
    fol.region,
    fol.location,
    fol.view_count,
    fol.contact_count,
    fol.created_at,
    fol.updated_at,
    p.full_name as seller_name,
    p.avatar_url as seller_avatar,
    p.rating as seller_rating,
    p.review_count as seller_review_count,
    p.identity_verified,
    p.food_licence,
    fol.harvested_at::date = current_date as harvested_today,
    st_y(fol.location::geometry) as lat,
    st_x(fol.location::geometry) as lng,
    (select li.url
       from listing_images li
      where li.forest_listing_id = fol.id
      order by li.is_primary desc, li.sort_order
      limit 1) as primary_image_url
from forest_listings fol
join profiles p on fol.seller_id = p.id
where fol.status = 'active'::forest_status;