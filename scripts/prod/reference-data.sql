-- Idempotent reference data for an empty production database.
-- Categories and verification levels only. No listings and no users.

insert into public.verification_levels (code, name, description, rank, requirements)
values
  ('unverified', 'Unverified', 'Email or phone account created; commerce activity is limited.', 0, '{}'::jsonb),
  ('basic', 'Basic', 'Verified email or phone with marketplace profile completed.', 10, '{"email_or_phone": true, "profile": true}'::jsonb),
  ('identity', 'Identity Verified', 'Government identity or equivalent KYC verification completed.', 20, '{"identity_document": true, "liveness": true}'::jsonb),
  ('trusted_seller', 'Trusted Seller', 'Identity verification plus successful selling history and low dispute rate.', 30, '{"identity": true, "completed_sales_min": 10, "max_dispute_rate": 0.02}'::jsonb)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    rank = excluded.rank,
    requirements = excluded.requirements,
    updated_at = now();

insert into public.categories (slug, name, description, sort_order, is_active)
values
  ('electronics', 'Electronics', 'Consumer electronics, devices, and accessories.', 10, true),
  ('home', 'Home', 'Furniture, decor, tools, and home goods.', 20, true),
  ('outdoors', 'Outdoors', 'Camping, cycling, sports, and adventure gear.', 30, true),
  ('fashion', 'Fashion', 'Clothing, shoes, watches, and accessories.', 40, true),
  ('collectibles', 'Collectibles', 'Rare, vintage, and collectible goods.', 50, true),
  ('vehicles', 'Vehicles', 'Cars, bikes, parts, and mobility products.', 60, true),
  ('services', 'Services', 'Local and remote professional services.', 70, true),
  ('baby-kids', 'Baby & kids', 'Family and children''s goods.', 80, true),
  ('sports', 'Sports', 'Fitness and sports equipment.', 90, true),
  ('books-media', 'Books & media', 'Books, music, and media.', 100, true),
  ('other', 'Other', 'Listings that do not fit another category.', 999, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

insert into public.categories (slug, name, description, sort_order, is_active, parent_id)
select child.slug, child.name, child.description, child.sort_order, true, parent.id
from (values
  ('cameras', 'Cameras', 'Cameras and lenses.', 11, 'electronics'),
  ('computers', 'Computers', 'Computers and accessories.', 12, 'electronics'),
  ('furniture', 'Furniture', 'Indoor and outdoor furniture.', 21, 'home'),
  ('bikes', 'Bikes', 'Bicycles and cycling gear.', 31, 'outdoors')
) as child(slug, name, description, sort_order, parent_slug)
join public.categories parent on parent.slug = child.parent_slug
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    parent_id = excluded.parent_id,
    is_active = true,
    updated_at = now();

-- Listing condition and shipping are fields on public.listings (condition text, ships_to text[], pickup_available boolean).
-- Suggested condition values for sellers: New, Like new, Excellent, Good, Fair, For parts.
-- Suggested ship-to values: US, CA. There is no separate shipping-options table.
