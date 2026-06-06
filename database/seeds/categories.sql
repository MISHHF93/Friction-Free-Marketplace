insert into public.categories (slug, name, description, sort_order) values
  ('electronics', 'Electronics', 'Trusted devices, cameras, gaming, and accessories.', 10),
  ('home', 'Home', 'Furniture, decor, tools, and home goods.', 20),
  ('outdoors', 'Outdoors', 'Camping, cycling, sports, and adventure gear.', 30),
  ('collectibles', 'Collectibles', 'Vintage, rare, and authenticated collectibles.', 40),
  ('services', 'Services', 'Local services with marketplace trust workflows.', 50)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
