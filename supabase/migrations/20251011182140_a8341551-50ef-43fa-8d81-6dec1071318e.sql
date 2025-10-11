-- First, clear existing products and inventory logs to reseed with Indian market data
DELETE FROM inventory_logs;
DELETE FROM order_items;
DELETE FROM products;
DELETE FROM categories;

-- Recreate categories
INSERT INTO categories (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Electronics', 'Latest gadgets and electronic devices'),
  ('22222222-2222-2222-2222-222222222222', 'Clothing', 'Trendy fashion and apparel');

-- Insert 15 products with Indian market focus and INR pricing
INSERT INTO products (id, name, description, price, stock, category_id, image_url) VALUES
  -- Electronics (8 products)
  ('e1111111-1111-1111-1111-111111111111', 'Samsung Galaxy S24', 'Flagship smartphone with 6.2-inch AMOLED display, Snapdragon 8 Gen 3 for seamless multitasking, 50MP camera for vibrant photos, and 5000mAh battery ideal for India''s power needs—includes 5G support for fast data.', 79999, 45, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300'),
  
  ('e2222222-2222-2222-2222-222222222222', 'Dell Inspiron 15 Laptop', 'Powerful laptop with 11th Gen Intel i5, 8GB RAM, 512GB SSD perfect for work-from-home professionals, FHD display with anti-glare for comfortable viewing during long hours, includes Windows 11 and 1-year warranty.', 52999, 28, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300'),
  
  ('e3333333-3333-3333-3333-333333333333', 'Sony WH-1000XM5 Headphones', 'Premium noise-cancelling wireless headphones with 30-hour battery life, perfect for Indian commutes and travel, industry-leading ANC blocks out traffic and crowd noise, exceptional sound quality with LDAC support.', 29999, 62, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=300'),
  
  ('e4444444-4444-4444-4444-444444444444', 'LG 43-inch 4K Smart TV', 'Stunning 4K UHD display with HDR10 and Dolby Vision, WebOS platform with Netflix, Prime Video, and Hotstar pre-installed, AI ThinQ voice control in Hindi and English, ideal for Indian families during IPL and festivals.', 38999, 18, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300'),
  
  ('e5555555-5555-5555-5555-555555555555', 'Apple iPad 10th Gen', 'Versatile 10.9-inch Liquid Retina display tablet with A14 Bionic chip, perfect for students and creative professionals, supports Apple Pencil for note-taking and digital art, all-day battery life handles power cuts with ease.', 44900, 35, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300'),
  
  ('e6666666-6666-6666-6666-666666666666', 'Canon EOS 1500D DSLR Camera', 'Entry-level DSLR with 24.1MP sensor and WiFi connectivity, ideal for capturing Indian weddings and festivals, comes with 18-55mm kit lens, easy-to-use interface perfect for beginners, 1080p video recording capability.', 31999, 22, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300'),
  
  ('e7777777-7777-7777-7777-777777777777', 'Mi Air Purifier 3', 'HEPA filter removes 99.97% pollutants including PM2.5, essential for Delhi and metro cities with high AQI, covers up to 484 sq ft, smart app control and Alexa compatible, ultra-quiet operation at just 32dB.', 9999, 8, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300'),
  
  ('e8888888-8888-8888-8888-888888888888', 'boAt Airdopes 141', 'True wireless earbuds with 42-hour playback, IPX4 water resistance perfect for monsoons and workouts, instant voice assistant access in Hindi, ASAP charge gives 75 minutes playtime in 5 minutes, top Indian audio brand.', 1499, 4, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300'),
  
  -- Clothing (7 products)
  ('c1111111-1111-1111-1111-111111111111', 'Levi''s Slim Fit Jeans', 'Premium denim with 2% stretch for comfort during long days, available in sizes 28-40, stone-washed for a trendy look, and sustainable cotton blend perfect for Indian weather variations, classic 5-pocket design.', 3499, 75, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300'),
  
  ('c2222222-2222-2222-2222-222222222222', 'FabIndia Kurta Set', 'Handloom cotton kurta with churidar for men, breathable fabric ideal for hot Indian summers and festive occasions, traditional block print design showcasing Indian craftsmanship, machine washable and supports local artisans.', 2999, 52, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1626497764746-6dc36546d62d?w=300'),
  
  ('c3333333-3333-3333-3333-333333333333', 'Allen Solly Formal Shirt', 'Wrinkle-free formal shirt in pure cotton, perfect for office wear in Indian corporate settings, available in white, blue, and pink, slim-fit design with cutaway collar, stays fresh even in AC-to-heat transitions.', 1899, 88, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1602810318660-d2c46b750f88?w=300'),
  
  ('c4444444-4444-4444-4444-444444444444', 'Biba Anarkali Dress', 'Elegant ethnic wear for women with intricate embroidery, perfect for weddings, Diwali, and festive celebrations, flowy silhouette flatters all body types, comes with matching dupatta, pure georgette fabric with cotton lining.', 4599, 6, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300'),
  
  ('c5555555-5555-5555-5555-555555555555', 'Nike Air Max Sneakers', 'Comfortable sports shoes with Air cushioning technology, suitable for Indian road running and gym workouts, breathable mesh upper handles humidity, stylish design works for casual wear too, available in multiple colorways.', 7999, 41, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'),
  
  ('c6666666-6666-6666-6666-666666666666', 'Raymond Suit Set', 'Premium 3-piece suit in wrinkle-resistant poly-viscose blend, tailored cut perfect for Indian weddings and business meetings, includes jacket, trousers, and waistcoat, dry-clean only, charcoal grey color suits all skin tones.', 12999, 9, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1594938328870-f3c65deb5b57?w=300'),
  
  ('c7777777-7777-7777-7777-777777777777', 'Jockey Cotton T-Shirt Pack', 'Pack of 3 round-neck t-shirts in combed cotton, super soft and breathable for Indian summers, shrink-resistant with reinforced shoulder taping, neutral colors (white, grey, black) perfect as innerwear or casual wear.', 1299, 95, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300');