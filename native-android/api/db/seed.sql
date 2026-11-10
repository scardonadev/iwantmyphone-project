-- ==============================================================================
-- iwantmyphone · app nativa — datos semilla de `iwantmyphone_app`
-- ==============================================================================
--
-- GENERADO a partir de src/seed/seed.sql del proyecto Next (mismos celulares,
-- fichas y comentarios), más lo que la app necesita y el Next no tiene:
-- costo, descripción y descuento de cada celular, usuarios por rol,
-- direcciones, métodos de pago y pedidos sintéticos para los reportes.
--
-- Lo ejecuta `npm run db:setup` UNA vez, en una transacción, solo si la tabla
-- `marcas` está vacía. Para volver a sembrar: `npm run db:reset`.
--
-- Usuarios de desarrollo (cambiar o borrar fuera de local):
--   administrador  admin@iwantmyphone.dev      Admin1234
--   vendedor       vendedor@iwantmyphone.dev   Vendedor1234
--   visitante      visitante@iwantmyphone.dev  Visitante1234
--   12 clientes    cliente01..12@example.com   Visitante1234 (dueños de los pedidos)
-- ==============================================================================

-- 1. Marca -----------------------------------------------------------------------
INSERT INTO marcas (nombre, logo_url, pais_origen)
VALUES ('Apple', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', 'Estados Unidos');

-- 2. Celulares (copiados del seed del Next) --------------------------------------
INSERT INTO celulares (marca_id, modelo, precio, fecha_lanzamiento, images_urls)
SELECT m.id, v.modelo, v.precio, v.fecha_lanzamiento::date, v.images_urls
FROM marcas m
CROSS JOIN (VALUES
    -- iPhone (1st gen) — iPhone1,1 [0]
    ('iPhone (1st gen)', 499.00, '2007-06-29',
     'https://img.appledb.dev/device@256/iPhone1%2C1/0.png'),
    -- iPhone 3G — iPhone1,2 [0]
    ('iPhone 3G', 599.00, '2008-07-11',
     'https://img.appledb.dev/device@256/iPhone1%2C2/0.png'),
    -- iPhone 3GS — iPhone2,1 [0]
    ('iPhone 3GS', 599.00, '2009-06-19',
     'https://img.appledb.dev/device@256/iPhone2%2C1/0.png'),
    -- iPhone 4 — iPhone3,1 [0]
    ('iPhone 4', 649.00, '2010-06-24',
     'https://img.appledb.dev/device@256/iPhone3%2C1/0.png'),
    -- iPhone 4S — iPhone4,1 [0]
    ('iPhone 4S', 649.00, '2011-10-14',
     'https://img.appledb.dev/device@256/iPhone4%2C1/0.png'),
    -- iPhone 5 — iPhone5,1 [0]
    ('iPhone 5', 649.00, '2012-09-21',
     'https://img.appledb.dev/device@256/iPhone5%2C1/0.png'),
    -- iPhone 5C — iPhone5,3 [Blue, Green, Pink, White, Yellow]
    ('iPhone 5C', 549.00, '2013-09-20',
     'https://img.appledb.dev/device@256/iPhone5%2C3/Blue.png,https://img.appledb.dev/device@256/iPhone5%2C3/Green.png,https://img.appledb.dev/device@256/iPhone5%2C3/Pink.png,https://img.appledb.dev/device@256/iPhone5%2C3/White.png,https://img.appledb.dev/device@256/iPhone5%2C3/Yellow.png'),
    -- iPhone 5S — iPhone6,1 [Silver, Space Gray, Gold]
    ('iPhone 5S', 649.00, '2013-09-20',
     'https://img.appledb.dev/device@256/iPhone6%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone6%2C1/Space%20Gray.png,https://img.appledb.dev/device@256/iPhone6%2C1/Gold.png'),
    -- iPhone 6 — iPhone7,2 [Silver, Space Gray, Gold]
    ('iPhone 6', 649.00, '2014-09-19',
     'https://img.appledb.dev/device@256/iPhone7%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone7%2C2/Space%20Gray.png,https://img.appledb.dev/device@256/iPhone7%2C2/Gold.png'),
    -- iPhone 6 Plus — iPhone7,1 [Silver, Space Gray, Gold]
    ('iPhone 6 Plus', 749.00, '2014-09-19',
     'https://img.appledb.dev/device@256/iPhone7%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone7%2C1/Space%20Gray.png,https://img.appledb.dev/device@256/iPhone7%2C1/Gold.png'),
    -- iPhone 6S — iPhone8,1 [Gold, Rose Gold, Silver, Space Gray]
    ('iPhone 6S', 649.00, '2015-09-25',
     'https://img.appledb.dev/device@256/iPhone8%2C1/Gold.png,https://img.appledb.dev/device@256/iPhone8%2C1/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone8%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone8%2C1/Space%20Gray.png'),
    -- iPhone 6S Plus — iPhone8,2 [Gold, Rose Gold, Silver, Space Gray]
    ('iPhone 6S Plus', 749.00, '2015-09-25',
     'https://img.appledb.dev/device@256/iPhone8%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone8%2C2/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone8%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone8%2C2/Space%20Gray.png'),
    -- iPhone SE (1st gen) — iPhone8,4 [Gold, Rose Gold, Silver, Space Gray]
    ('iPhone SE (1st gen)', 399.00, '2016-03-31',
     'https://img.appledb.dev/device@256/iPhone8%2C4/Gold.png,https://img.appledb.dev/device@256/iPhone8%2C4/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone8%2C4/Silver.png,https://img.appledb.dev/device@256/iPhone8%2C4/Space%20Gray.png'),
    -- iPhone 7 — iPhone9,1 [(PRODUCT)RED, Black, Gold, Jet Black, Rose Gold, Silver]
    ('iPhone 7', 649.00, '2016-09-16',
     'https://img.appledb.dev/device@256/iPhone9%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone9%2C1/Black.png,https://img.appledb.dev/device@256/iPhone9%2C1/Gold.png,https://img.appledb.dev/device@256/iPhone9%2C1/Jet%20Black.png,https://img.appledb.dev/device@256/iPhone9%2C1/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone9%2C1/Silver.png'),
    -- iPhone 7 Plus — iPhone9,2 [(PRODUCT)RED, Black, Gold, Jet Black, Rose Gold, Silver]
    ('iPhone 7 Plus', 769.00, '2016-09-16',
     'https://img.appledb.dev/device@256/iPhone9%2C2/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone9%2C2/Black.png,https://img.appledb.dev/device@256/iPhone9%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone9%2C2/Jet%20Black.png,https://img.appledb.dev/device@256/iPhone9%2C2/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone9%2C2/Silver.png'),
    -- iPhone 8 — iPhone10,1 [(PRODUCT)RED, Gold, Silver, Space Gray]
    ('iPhone 8', 699.00, '2017-09-22',
     'https://img.appledb.dev/device@256/iPhone10%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone10%2C1/Gold.png,https://img.appledb.dev/device@256/iPhone10%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone10%2C1/Space%20Gray.png'),
    -- iPhone 8 Plus — iPhone10,2 [(PRODUCT)RED, Gold, Silver, Space Gray]
    ('iPhone 8 Plus', 799.00, '2017-09-22',
     'https://img.appledb.dev/device@256/iPhone10%2C2/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone10%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone10%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone10%2C2/Space%20Gray.png'),
    -- iPhone X — iPhone10,3 [Silver, Space Gray]
    ('iPhone X', 999.00, '2017-11-03',
     'https://img.appledb.dev/device@256/iPhone10%2C3/Silver.png,https://img.appledb.dev/device@256/iPhone10%2C3/Space%20Gray.png'),
    -- iPhone XS — iPhone11,2 [Gold, Silver, Space Gray]
    ('iPhone XS', 999.00, '2018-09-21',
     'https://img.appledb.dev/device@256/iPhone11%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone11%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone11%2C2/Space%20Gray.png'),
    -- iPhone XS Max — iPhone11,6 [Gold, Silver, Space Gray]
    ('iPhone XS Max', 1099.00, '2018-09-21',
     'https://img.appledb.dev/device@256/iPhone11%2C6/Gold.png,https://img.appledb.dev/device@256/iPhone11%2C6/Silver.png,https://img.appledb.dev/device@256/iPhone11%2C6/Space%20Gray.png'),
    -- iPhone XR — iPhone11,8 [(PRODUCT)RED, Black, Blue, Coral, White, Yellow]
    ('iPhone XR', 749.00, '2018-10-26',
     'https://img.appledb.dev/device@256/iPhone11%2C8/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone11%2C8/Black.png,https://img.appledb.dev/device@256/iPhone11%2C8/Blue.png,https://img.appledb.dev/device@256/iPhone11%2C8/Coral.png,https://img.appledb.dev/device@256/iPhone11%2C8/White.png,https://img.appledb.dev/device@256/iPhone11%2C8/Yellow.png'),
    -- iPhone 11 — iPhone12,1 [(PRODUCT)RED, Black, Green, Purple, White, Yellow]
    ('iPhone 11', 699.00, '2019-09-20',
     'https://img.appledb.dev/device@256/iPhone12%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone12%2C1/Black.png,https://img.appledb.dev/device@256/iPhone12%2C1/Green.png,https://img.appledb.dev/device@256/iPhone12%2C1/Purple.png,https://img.appledb.dev/device@256/iPhone12%2C1/White.png,https://img.appledb.dev/device@256/iPhone12%2C1/Yellow.png'),
    -- iPhone 11 Pro — iPhone12,3 [Gold, Midnight Green, Silver, Space Gray]
    ('iPhone 11 Pro', 999.00, '2019-09-20',
     'https://img.appledb.dev/device@256/iPhone12%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone12%2C3/Midnight%20Green.png,https://img.appledb.dev/device@256/iPhone12%2C3/Silver.png,https://img.appledb.dev/device@256/iPhone12%2C3/Space%20Gray.png'),
    -- iPhone 11 Pro Max — iPhone12,5 [Gold, Midnight Green, Silver, Space Gray]
    ('iPhone 11 Pro Max', 1099.00, '2019-09-20',
     'https://img.appledb.dev/device@256/iPhone12%2C5/Gold.png,https://img.appledb.dev/device@256/iPhone12%2C5/Midnight%20Green.png,https://img.appledb.dev/device@256/iPhone12%2C5/Silver.png,https://img.appledb.dev/device@256/iPhone12%2C5/Space%20Gray.png'),
    -- iPhone SE (2nd gen) — iPhone12,8 [(PRODUCT)RED, Black, White]
    ('iPhone SE (2nd gen)', 399.00, '2020-04-24',
     'https://img.appledb.dev/device@256/iPhone12%2C8/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone12%2C8/Black.png,https://img.appledb.dev/device@256/iPhone12%2C8/White.png'),
    -- iPhone 12 mini — iPhone13,1 [Purple, (PRODUCT)RED, Black, Blue, Green, White]
    ('iPhone 12 mini', 699.00, '2020-11-13',
     'https://img.appledb.dev/device@256/iPhone13%2C1/Purple.png,https://img.appledb.dev/device@256/iPhone13%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone13%2C1/Black.png,https://img.appledb.dev/device@256/iPhone13%2C1/Blue.png,https://img.appledb.dev/device@256/iPhone13%2C1/Green.png,https://img.appledb.dev/device@256/iPhone13%2C1/White.png'),
    -- iPhone 12 — iPhone13,2 [Purple, (PRODUCT)RED, Black, Blue, Green, White]
    ('iPhone 12', 799.00, '2020-10-23',
     'https://img.appledb.dev/device@256/iPhone13%2C2/Purple.png,https://img.appledb.dev/device@256/iPhone13%2C2/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone13%2C2/Black.png,https://img.appledb.dev/device@256/iPhone13%2C2/Blue.png,https://img.appledb.dev/device@256/iPhone13%2C2/Green.png,https://img.appledb.dev/device@256/iPhone13%2C2/White.png'),
    -- iPhone 12 Pro — iPhone13,3 [Gold, Graphite, Pacific Blue, Silver]
    ('iPhone 12 Pro', 999.00, '2020-10-23',
     'https://img.appledb.dev/device@256/iPhone13%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone13%2C3/Graphite.png,https://img.appledb.dev/device@256/iPhone13%2C3/Pacific%20Blue.png,https://img.appledb.dev/device@256/iPhone13%2C3/Silver.png'),
    -- iPhone 12 Pro Max — iPhone13,4 [Gold, Graphite, Pacific Blue, Silver]
    ('iPhone 12 Pro Max', 1099.00, '2020-11-13',
     'https://img.appledb.dev/device@256/iPhone13%2C4/Gold.png,https://img.appledb.dev/device@256/iPhone13%2C4/Graphite.png,https://img.appledb.dev/device@256/iPhone13%2C4/Pacific%20Blue.png,https://img.appledb.dev/device@256/iPhone13%2C4/Silver.png'),
    -- iPhone 13 mini — iPhone14,4 [Green, (PRODUCT)RED, Blue, Midnight, Pink, Starlight]
    ('iPhone 13 mini', 699.00, '2021-09-24',
     'https://img.appledb.dev/device@256/iPhone14%2C4/Green.png,https://img.appledb.dev/device@256/iPhone14%2C4/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C4/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C4/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C4/Pink.png,https://img.appledb.dev/device@256/iPhone14%2C4/Starlight.png'),
    -- iPhone 13 — iPhone14,5 [Green, (PRODUCT)RED, Blue, Midnight, Pink, Starlight]
    ('iPhone 13', 799.00, '2021-09-24',
     'https://img.appledb.dev/device@256/iPhone14%2C5/Green.png,https://img.appledb.dev/device@256/iPhone14%2C5/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C5/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C5/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C5/Pink.png,https://img.appledb.dev/device@256/iPhone14%2C5/Starlight.png'),
    -- iPhone 13 Pro — iPhone14,2 [Alpine Green, Gold, Graphite, Sierra Blue, Silver]
    ('iPhone 13 Pro', 999.00, '2021-09-24',
     'https://img.appledb.dev/device@256/iPhone14%2C2/Alpine%20Green.png,https://img.appledb.dev/device@256/iPhone14%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone14%2C2/Graphite.png,https://img.appledb.dev/device@256/iPhone14%2C2/Sierra%20Blue.png,https://img.appledb.dev/device@256/iPhone14%2C2/Silver.png'),
    -- iPhone 13 Pro Max — iPhone14,3 [Alpine Green, Gold, Graphite, Sierra Blue, Silver]
    ('iPhone 13 Pro Max', 1099.00, '2021-09-24',
     'https://img.appledb.dev/device@256/iPhone14%2C3/Alpine%20Green.png,https://img.appledb.dev/device@256/iPhone14%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone14%2C3/Graphite.png,https://img.appledb.dev/device@256/iPhone14%2C3/Sierra%20Blue.png,https://img.appledb.dev/device@256/iPhone14%2C3/Silver.png'),
    -- iPhone SE (3rd gen) — iPhone14,6 [(PRODUCT)RED, Midnight, Starlight]
    ('iPhone SE (3rd gen)', 429.00, '2022-03-18',
     'https://img.appledb.dev/device@256/iPhone14%2C6/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C6/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C6/Starlight.png'),
    -- iPhone 14 — iPhone14,7 [Yellow, (PRODUCT)RED, Blue, Midnight, Purple, Starlight]
    ('iPhone 14', 799.00, '2022-09-16',
     'https://img.appledb.dev/device@256/iPhone14%2C7/Yellow.png,https://img.appledb.dev/device@256/iPhone14%2C7/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C7/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C7/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C7/Purple.png,https://img.appledb.dev/device@256/iPhone14%2C7/Starlight.png'),
    -- iPhone 14 Plus — iPhone14,8 [Yellow, (PRODUCT)RED, Blue, Midnight, Purple, Starlight]
    ('iPhone 14 Plus', 899.00, '2022-10-07',
     'https://img.appledb.dev/device@256/iPhone14%2C8/Yellow.png,https://img.appledb.dev/device@256/iPhone14%2C8/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C8/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C8/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C8/Purple.png,https://img.appledb.dev/device@256/iPhone14%2C8/Starlight.png'),
    -- iPhone 14 Pro — iPhone15,2 [Deep Purple, Gold, Silver, Space Black]
    ('iPhone 14 Pro', 999.00, '2022-09-16',
     'https://img.appledb.dev/device@256/iPhone15%2C2/Deep%20Purple.png,https://img.appledb.dev/device@256/iPhone15%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone15%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone15%2C2/Space%20Black.png'),
    -- iPhone 14 Pro Max — iPhone15,3 [Deep Purple, Gold, Silver, Space Black]
    ('iPhone 14 Pro Max', 1099.00, '2022-09-16',
     'https://img.appledb.dev/device@256/iPhone15%2C3/Deep%20Purple.png,https://img.appledb.dev/device@256/iPhone15%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone15%2C3/Silver.png,https://img.appledb.dev/device@256/iPhone15%2C3/Space%20Black.png'),
    -- iPhone 15 — iPhone15,4 [Black, Blue, Green, Pink, Yellow]
    ('iPhone 15', 799.00, '2023-09-22',
     'https://img.appledb.dev/device@256/iPhone15%2C4/Black.png,https://img.appledb.dev/device@256/iPhone15%2C4/Blue.png,https://img.appledb.dev/device@256/iPhone15%2C4/Green.png,https://img.appledb.dev/device@256/iPhone15%2C4/Pink.png,https://img.appledb.dev/device@256/iPhone15%2C4/Yellow.png'),
    -- iPhone 15 Plus — iPhone15,5 [Black, Blue, Green, Pink, Yellow]
    ('iPhone 15 Plus', 899.00, '2023-09-22',
     'https://img.appledb.dev/device@256/iPhone15%2C5/Black.png,https://img.appledb.dev/device@256/iPhone15%2C5/Blue.png,https://img.appledb.dev/device@256/iPhone15%2C5/Green.png,https://img.appledb.dev/device@256/iPhone15%2C5/Pink.png,https://img.appledb.dev/device@256/iPhone15%2C5/Yellow.png'),
    -- iPhone 15 Pro — iPhone16,1 [Black Titanium, Blue Titanium, Natural Titanium, White Titanium]
    ('iPhone 15 Pro', 999.00, '2023-09-22',
     'https://img.appledb.dev/device@256/iPhone16%2C1/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C1/Blue%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C1/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C1/White%20Titanium.png'),
    -- iPhone 15 Pro Max — iPhone16,2 [Black Titanium, Blue Titanium, Natural Titanium, White Titanium]
    ('iPhone 15 Pro Max', 1199.00, '2023-09-22',
     'https://img.appledb.dev/device@256/iPhone16%2C2/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C2/Blue%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C2/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C2/White%20Titanium.png'),
    -- iPhone 16 — iPhone17,3 [Black, Pink, Teal, Ultramarine, White]
    ('iPhone 16', 799.00, '2024-09-20',
     'https://img.appledb.dev/device@256/iPhone17%2C3/Black.png,https://img.appledb.dev/device@256/iPhone17%2C3/Pink.png,https://img.appledb.dev/device@256/iPhone17%2C3/Teal.png,https://img.appledb.dev/device@256/iPhone17%2C3/Ultramarine.png,https://img.appledb.dev/device@256/iPhone17%2C3/White.png'),
    -- iPhone 16 Plus — iPhone17,4 [Black, Pink, Teal, Ultramarine, White]
    ('iPhone 16 Plus', 899.00, '2024-09-20',
     'https://img.appledb.dev/device@256/iPhone17%2C4/Black.png,https://img.appledb.dev/device@256/iPhone17%2C4/Pink.png,https://img.appledb.dev/device@256/iPhone17%2C4/Teal.png,https://img.appledb.dev/device@256/iPhone17%2C4/Ultramarine.png,https://img.appledb.dev/device@256/iPhone17%2C4/White.png'),
    -- iPhone 16 Pro — iPhone17,1 [Black Titanium, Desert Titanium, Natural Titanium, White Titanium]
    ('iPhone 16 Pro', 999.00, '2024-09-20',
     'https://img.appledb.dev/device@256/iPhone17%2C1/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C1/Desert%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C1/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C1/White%20Titanium.png'),
    -- iPhone 16 Pro Max — iPhone17,2 [Black Titanium, Desert Titanium, Natural Titanium, White Titanium]
    ('iPhone 16 Pro Max', 1199.00, '2024-09-20',
     'https://img.appledb.dev/device@256/iPhone17%2C2/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C2/Desert%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C2/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C2/White%20Titanium.png'),
    -- iPhone 16e — iPhone17,5 [Black, White]
    ('iPhone 16e', 599.00, '2025-02-28',
     'https://img.appledb.dev/device@256/iPhone17%2C5/Black.png,https://img.appledb.dev/device@256/iPhone17%2C5/White.png'),
    -- iPhone 17 — iPhone18,3 [Black, Lavender, Mist Blue, Sage, White]
    ('iPhone 17', 799.00, '2025-09-19',
     'https://img.appledb.dev/device@256/iPhone18%2C3/Black.png,https://img.appledb.dev/device@256/iPhone18%2C3/Lavender.png,https://img.appledb.dev/device@256/iPhone18%2C3/Mist%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C3/Sage.png,https://img.appledb.dev/device@256/iPhone18%2C3/White.png'),
    -- iPhone Air — iPhone18,4 [Cloud White, Light Gold, Sky Blue, Space Black]
    ('iPhone Air', 999.00, '2025-09-19',
     'https://img.appledb.dev/device@256/iPhone18%2C4/Cloud%20White.png,https://img.appledb.dev/device@256/iPhone18%2C4/Light%20Gold.png,https://img.appledb.dev/device@256/iPhone18%2C4/Sky%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C4/Space%20Black.png'),
    -- iPhone 17 Pro — iPhone18,1 [Cosmic Orange, Deep Blue, Silver]
    ('iPhone 17 Pro', 1099.00, '2025-09-19',
     'https://img.appledb.dev/device@256/iPhone18%2C1/Cosmic%20Orange.png,https://img.appledb.dev/device@256/iPhone18%2C1/Deep%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C1/Silver.png'),
    -- iPhone 17 Pro Max — iPhone18,1 (render del iPhone 17 Pro: AppleDB aún no publica el suyo) [Cosmic Orange, Deep Blue, Silver]
    ('iPhone 17 Pro Max', 1199.00, '2025-09-19',
     'https://img.appledb.dev/device@256/iPhone18%2C1/Cosmic%20Orange.png,https://img.appledb.dev/device@256/iPhone18%2C1/Deep%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C1/Silver.png'),
    -- iPhone 17e — iPhone18,5 [Black, Soft Pink, White]
    ('iPhone 17e', 599.00, '2026-03-11',
     'https://img.appledb.dev/device@256/iPhone18%2C5/Black.png,https://img.appledb.dev/device@256/iPhone18%2C5/Soft%20Pink.png,https://img.appledb.dev/device@256/iPhone18%2C5/White.png')
) AS v (modelo, precio, fecha_lanzamiento, images_urls)
WHERE m.nombre = 'Apple';

-- 3. Especificaciones (copiadas del seed del Next) -------------------------------
INSERT INTO especificaciones (celular_id, procesador, ram, almacenamiento, pantalla, camara, bateria, sistema_op)
SELECT c.id, v.procesador, v.ram, v.almacenamiento, v.pantalla, v.camara, v.bateria, v.sistema_op
FROM celulares c
JOIN (VALUES
        ('iPhone (1st gen)', 'Samsung 32-bit RISC 412 MHz', '128 MB', '4GB / 8GB / 16GB', '3.5" LCD (320x480)', '2 MP', '1400 mAh', 'iPhone OS 1.0'),
        ('iPhone 3G', 'Samsung 32-bit RISC 412 MHz', '128 MB', '8GB / 16GB', '3.5" LCD (320x480)', '2 MP', '1150 mAh', 'iPhone OS 2.0'),
        ('iPhone 3GS', 'Samsung Cortex-A8 600 MHz', '256 MB', '8GB / 16GB / 32GB', '3.5" LCD (320x480)', '3 MP Video VGA', '1219 mAh', 'iPhone OS 3.0'),
        ('iPhone 4', 'Apple A4', '512 MB', '8GB / 16GB / 32GB', '3.5" Retina LCD (960x640)', '5 MP + VGA frontal', '1420 mAh', 'iOS 4.0'),
        ('iPhone 4S', 'Apple A5 Dual-Core', '512 MB', '8GB / 16GB / 32GB / 64GB', '3.5" Retina LCD (960x640)', '8 MP 1080p + VGA frontal', '1432 mAh', 'iOS 5.0'),
        ('iPhone 5', 'Apple A6', '1 GB', '16GB / 32GB / 64GB', '4.0" Retina LCD (1136x640)', '8 MP + 1.2 MP frontal', '1440 mAh', 'iOS 6.0'),
        ('iPhone 5C', 'Apple A6', '1 GB', '16GB / 32GB / 64GB', '4.0" Retina LCD (1136x640)', '8 MP + 1.2 MP frontal', '1440 mAh', 'iOS 6.0'),
        ('iPhone 5S', 'Apple A7 (64-bit)', '1 GB', '16GB / 32GB / 64GB', '4.0" Retina LCD (1136x640)', '8 MP TrueTone + 1.2 MP frontal', '1560 mAh', 'iOS 7.0'),
        ('iPhone 6', 'Apple A8', '1 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '8 MP iSight + 1.2 MP frontal', '1810 mAh', 'iOS 8.0'),
        ('iPhone 6 Plus', 'Apple A8', '1 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '8 MP iSight + 1.2 MP frontal', '1810 mAh', 'iOS 8.0'),
        ('iPhone 6S', 'Apple A9', '2 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '12 MP 4K + 5 MP frontal', '1715 mAh', 'iOS 9.0'),
        ('iPhone 6S Plus', 'Apple A9', '2 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '12 MP 4K + 5 MP frontal', '1715 mAh', 'iOS 9.0'),
        ('iPhone SE (1st gen)', 'Apple A9', '2 GB', '16GB / 32GB / 64GB / 128GB', '4.0" Retina LCD (1136x640)', '12 MP 4K + 1.2 MP frontal', '1624 mAh', 'iOS 9.3'),
        ('iPhone 7', 'Apple A10 Fusion', '2 GB', '32GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP f/1.8 + 7 MP frontal', '1960 mAh', 'iOS 10.0'),
        ('iPhone 7 Plus', 'Apple A10 Fusion', '2 GB', '32GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP f/1.8 + 7 MP frontal', '1960 mAh', 'iOS 10.0'),
        ('iPhone 8', 'Apple A11 Bionic', '2 GB', '64GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP 4K 60fps + 7 MP frontal', '1821 mAh', 'iOS 11.0'),
        ('iPhone 8 Plus', 'Apple A11 Bionic', '2 GB', '64GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP 4K 60fps + 7 MP frontal', '1821 mAh', 'iOS 11.0'),
        ('iPhone X', 'Apple A11 Bionic', '3 GB', '64GB / 256GB', '5.8" Super Retina OLED (2436x1125)', 'Doble 12 MP (Angular + Tele) + 7 MP TrueDepth', '2716 mAh', 'iOS 11.0.1'),
        ('iPhone XS', 'Apple A12 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina OLED (2436x1125)', 'Doble 12 MP (OIS) + 7 MP TrueDepth', '2658 mAh', 'iOS 12.0'),
        ('iPhone XS Max', 'Apple A12 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina OLED (2436x1125)', 'Doble 12 MP (OIS) + 7 MP TrueDepth', '2658 mAh', 'iOS 12.0'),
        ('iPhone XR', 'Apple A12 Bionic', '3 GB', '64GB / 128GB / 256GB', '6.1" Liquid Retina LCD (1792x828)', '12 MP f/1.8 + 7 MP TrueDepth', '2942 mAh', 'iOS 12.0'),
        ('iPhone 11', 'Apple A13 Bionic', '4 GB', '64GB / 128GB / 256GB', '6.1" Liquid Retina LCD (1792x828)', 'Doble 12 MP (Angular + Ultra) + 12 MP frontal', '3110 mAh', 'iOS 13.0'),
        ('iPhone 11 Pro', 'Apple A13 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina XDR OLED', 'Triple 12 MP (Wide, Ultra, Tele) + 12 MP frontal', '3046 mAh', 'iOS 13.0'),
        ('iPhone 11 Pro Max', 'Apple A13 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina XDR OLED', 'Triple 12 MP (Wide, Ultra, Tele) + 12 MP frontal', '3046 mAh', 'iOS 13.0'),
        ('iPhone SE (2nd gen)', 'Apple A13 Bionic', '3 GB', '64GB / 128GB / 256GB', '4.7" Retina HD LCD', '12 MP 4K + 7 MP frontal', '1821 mAh', 'iOS 13.4'),
        ('iPhone 12 mini', 'Apple A14 Bionic (5G)', '4 GB', '64GB / 128GB / 256GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP + 12 MP TrueDepth', '2815 mAh', 'iOS 14.1'),
        ('iPhone 12', 'Apple A14 Bionic (5G)', '4 GB', '64GB / 128GB / 256GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP + 12 MP TrueDepth', '2815 mAh', 'iOS 14.1'),
        ('iPhone 12 Pro', 'Apple A14 Bionic (5G)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR + LiDAR', 'Triple 12 MP + Escáner LiDAR + 12 MP frontal', '2815 mAh', 'iOS 14.1'),
        ('iPhone 12 Pro Max', 'Apple A14 Bionic (5G)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR + LiDAR', 'Triple 12 MP + Escáner LiDAR + 12 MP frontal', '2815 mAh', 'iOS 14.1'),
        ('iPhone 13 mini', 'Apple A15 Bionic', '4 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP (Sensor-Shift OIS) + 12 MP frontal', '3227 mAh', 'iOS 15.0'),
        ('iPhone 13', 'Apple A15 Bionic', '4 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP (Sensor-Shift OIS) + 12 MP frontal', '3227 mAh', 'iOS 15.0'),
        ('iPhone 13 Pro', 'Apple A15 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" ProMotion 120Hz OLED', 'Triple 12 MP Macro + LiDAR + 12 MP frontal', '3095 mAh', 'iOS 15.0'),
        ('iPhone 13 Pro Max', 'Apple A15 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" ProMotion 120Hz OLED', 'Triple 12 MP Macro + LiDAR + 12 MP frontal', '3095 mAh', 'iOS 15.0'),
        ('iPhone SE (3rd gen)', 'Apple A15 Bionic (5G)', '4 GB', '64GB / 128GB / 256GB', '4.7" Retina HD LCD', '12 MP f/1.8 + 7 MP frontal', '2018 mAh', 'iOS 15.4'),
        ('iPhone 14', 'Apple A15 Bionic (5-core GPU)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP Photonic Engine + 12 MP frontal', '3279 mAh', 'iOS 16.0'),
        ('iPhone 14 Plus', 'Apple A15 Bionic (5-core GPU)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP Photonic Engine + 12 MP frontal', '3279 mAh', 'iOS 16.0'),
        ('iPhone 14 Pro', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Dynamic Island 120Hz OLED', '48 MP Main + 12 MP UW + 12 MP Tele 3x + 12 MP frontal', '3200 mAh', 'iOS 16.0'),
        ('iPhone 14 Pro Max', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Dynamic Island 120Hz OLED', '48 MP Main + 12 MP UW + 12 MP Tele 3x + 12 MP frontal', '3200 mAh', 'iOS 16.0'),
        ('iPhone 15', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB', '6.1" Dynamic Island USB-C OLED', '48 MP Main + 12 MP UW + 12 MP TrueDepth', '3349 mAh', 'iOS 17.0'),
        ('iPhone 15 Plus', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB', '6.1" Dynamic Island USB-C OLED', '48 MP Main + 12 MP UW + 12 MP TrueDepth', '3349 mAh', 'iOS 17.0'),
        ('iPhone 15 Pro', 'Apple A17 Pro (3nm)', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Titanium ProMotion 120Hz', '48 MP + 12 MP UW + 12 MP Tele 3x/5x + USB 3.0', '3274 mAh', 'iOS 17.0'),
        ('iPhone 15 Pro Max', 'Apple A17 Pro (3nm)', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Titanium ProMotion 120Hz', '48 MP + 12 MP UW + 12 MP Tele 3x/5x + USB 3.0', '3274 mAh', 'iOS 17.0'),
        ('iPhone 16', 'Apple A18 (Apple Intelligence)', '8 GB', '128GB / 256GB / 512GB', '6.1" OLED + Camera Control', '48 MP Fusion + 12 MP Ultra Wide', '3561 mAh', 'iOS 18.0'),
        ('iPhone 16 Plus', 'Apple A18 (Apple Intelligence)', '8 GB', '128GB / 256GB / 512GB', '6.1" OLED + Camera Control', '48 MP Fusion + 12 MP Ultra Wide', '3561 mAh', 'iOS 18.0'),
        ('iPhone 16 Pro', 'Apple A18 Pro', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.3" Borderless ProMotion 120Hz', '48 MP Fusion + 48 MP UW + 12 MP Tele 5x + 4K 120fps', '3582 mAh', 'iOS 18.0'),
        ('iPhone 16 Pro Max', 'Apple A18 Pro', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.3" Borderless ProMotion 120Hz', '48 MP Fusion + 48 MP UW + 12 MP Tele 5x + 4K 120fps', '3582 mAh', 'iOS 18.0'),
        ('iPhone 16e', 'Apple A18', '8 GB', '128GB / 256GB', '6.1" OLED Dynamic Island', '48 MP Single Fusion Camera', '3200 mAh', 'iOS 18.3'),
        ('iPhone 17', 'Apple A19 (3nm)', '8 GB', '128GB / 256GB / 512GB', '6.1" OLED ProMotion 120Hz', '48 MP Main + 48 MP Ultra Wide', '3600 mAh', 'iOS 26.0'),
        ('iPhone Air', 'Apple A19 Pro', '8 GB', '256GB / 512GB / 1TB', '6.6" Slim OLED 120Hz (eSIM-only)', '48 MP Main Fusion + 24 MP TrueDepth', '3100 mAh', 'iOS 26.0'),
        ('iPhone 17 Pro', 'Apple A19 Pro', '12 GB', '256GB / 512GB / 1TB / 2TB', '6.3" ProMotion 120Hz Anti-reflective', 'Triple 48 MP (Main, Ultra-Wide, Telephoto 5x)', '3800 mAh', 'iOS 26.0'),
        ('iPhone 17 Pro Max', 'Apple A19 Pro', '12 GB', '256GB / 512GB / 1TB / 2TB', '6.3" ProMotion 120Hz Anti-reflective', 'Triple 48 MP (Main, Ultra-Wide, Telephoto 5x)', '3800 mAh', 'iOS 26.0'),
        ('iPhone 17e', 'Apple A19', '8 GB', '128GB / 256GB', '6.1" OLED Dynamic Island + MagSafe', '48 MP Main + 12 MP Frontal', '3300 mAh', 'iOS 26.0')
) AS v (modelo, procesador, ram, almacenamiento, pantalla, camara, bateria, sistema_op)
  ON v.modelo = c.modelo;

-- 4. Comentarios (copiados del seed del Next) ------------------------------------
INSERT INTO comentarios (celular_id, nombre, mensaje, calificacion, fecha)
SELECT c.id, v.nombre, v.mensaje, v.calificacion, c.fecha_lanzamiento + v.desfase::INTERVAL
FROM celulares c
JOIN (VALUES
        ('iPhone (1st gen)', 'Diego Salazar', 'Hice fila seis horas frente a la tienda y valió cada minuto. Todavía lo guardo en su caja original.', 5, '12 days 10:24'),
        ('iPhone (1st gen)', 'Laura Ferrer', 'Navegar por internet de verdad en un teléfono es magia, pero quedarse en EDGE y sin tienda de aplicaciones se siente incompleto.', 3, '48 days 19:05'),
        ('iPhone 3G', 'Andrés Villalba', 'El salto a 3G y la App Store lo cambian todo. La carcasa plástica cruje un poco, pero por fin es un teléfono completo.', 4, '21 days 16:40'),
        ('iPhone 3GS', 'Paula Restrepo', 'La S de speed no es marketing: abre todo al instante comparado con el 3G. La cámara de 3 MP con video es un lujo.', 5, '9 days 11:12'),
        ('iPhone 3GS', 'Tomás Iriarte', 'Muy fluido, pero la batería no aguanta un día completo si uso GPS. Toca cargarlo a media tarde.', 3, '73 days 20:31'),
        ('iPhone 4', 'Camila Ochoa', 'La pantalla Retina es de otro planeta, no se distingue un solo píxel. El diseño de vidrio y acero sigue siendo el más bonito que han hecho.', 5, '14 days 09:47'),
        ('iPhone 4', 'Ricardo Peña', 'Precioso, pero si lo sostengo tapando la esquina inferior izquierda pierdo señal. Tuve que ponerle funda obligada.', 2, '39 days 22:18'),
        ('iPhone 4S', 'Valentina Cortés', 'Siri en español todavía se equivoca, pero la cámara de 8 MP y el A5 lo vuelven una compra redonda.', 4, '18 days 13:55'),
        ('iPhone 4S', 'Julián Mesa', 'Idéntico al 4 por fuera, así que nadie nota que lo cambié. Por dentro sí se siente el doble de rápido.', 4, '64 days 08:26'),
        ('iPhone 5', 'Sofía Aguirre', 'La pantalla de 4 pulgadas y el cuerpo de aluminio lo hacen increíblemente liviano. El cambio de conector a Lightning sí dolió en el bolsillo.', 4, '11 days 17:09'),
        ('iPhone 5C', 'Mariana Duarte', 'Me encanta el azul, se ve alegre y el plástico es sólido, no barato. Por dentro es un 5, y para mi uso sobra.', 4, '16 days 12:03'),
        ('iPhone 5C', 'Esteban Rojas', 'Esperaba un precio mucho más bajo para ser el modelo económico. Buen teléfono, mala relación de precio.', 3, '55 days 21:44'),
        ('iPhone 5S', 'Natalia Bermúdez', 'Touch ID funciona a la primera casi siempre y ya no vuelvo a escribir el código. El dorado envejeció mejor de lo que pensé.', 5, '7 days 10:38'),
        ('iPhone 5S', 'Felipe Naranjo', 'Primer procesador de 64 bits en un teléfono y se nota en los juegos. Le pido más batería y nada más.', 4, '41 days 18:52'),
        ('iPhone 6', 'Carolina Ospina', 'El salto a 4.7 pulgadas se agradece para leer, aunque perdí el manejo con una sola mano. Muy delgado y cómodo.', 4, '19 days 15:21'),
        ('iPhone 6 Plus', 'Gabriel Toro', 'La batería de este tamaño es otra historia, me dura dos días con uso normal. Ver video en 5.5 pulgadas es un gustazo.', 5, '23 days 09:14'),
        ('iPhone 6 Plus', 'Adriana Lemus', 'Buen teléfono pero es demasiado grande para mi mano y el aluminio se dobla si lo dejo en el bolsillo trasero. Cuidado con eso.', 2, '87 days 20:07'),
        ('iPhone 6S', 'Manuel Castrillón', '3D Touch es más útil de lo que parecía y la cámara de 12 MP con 4K es un salto real frente al 6.', 4, '13 days 11:49'),
        ('iPhone 6S Plus', 'Daniela Quiroga', 'La estabilización óptica salva todas mis fotos de conciertos. Pesado, sí, pero la pantalla lo compensa.', 5, '26 days 19:33'),
        ('iPhone 6S Plus', 'Óscar Villamizar', 'Rendimiento excelente, pero después de la actualización lo sentí más lento. La batería tampoco es la de antes.', 3, '96 days 08:58'),
        ('iPhone SE (1st gen)', 'Lucía Pardo', 'Potencia del 6S en el cuerpo del 5S: exactamente lo que pedía quien no quiere un teléfono gigante.', 5, '10 days 14:26'),
        ('iPhone SE (1st gen)', 'Sebastián Arenas', 'El mejor precio de toda la línea y la cámara es la misma del 6S. Le falta Touch ID de segunda generación, nada más.', 4, '52 days 21:11'),
        ('iPhone 7', 'Andrea Salcedo', 'Que sea resistente al agua me salvó dos veces. Quitar el conector de audífonos sigue pareciéndome innecesario.', 3, '15 days 16:47'),
        ('iPhone 7', 'Mateo Ibarra', 'El botón de inicio háptico se siente raro los primeros días y después ni lo notas. Muy rápido y silencioso.', 4, '44 days 10:19'),
        ('iPhone 7 Plus', 'Isabela Márquez', 'El modo retrato con la doble cámara hace fotos que parecen de reflex. Por eso pagué el modelo grande.', 5, '20 days 18:04'),
        ('iPhone 8', 'Alejandro Gómez', 'Carga inalámbrica y vidrio en la espalda, pero se ve igual que el 6 de hace cuatro años. Sólido y aburrido.', 3, '17 days 12:36'),
        ('iPhone 8 Plus', 'Verónica Lozano', 'El A11 vuela y la cámara doble es la misma calidad del X por menos dinero. Prefiero el Touch ID de siempre.', 5, '12 days 09:53'),
        ('iPhone 8 Plus', 'Hernán Castaño', 'Buen equipo, pero el vidrio trasero se rompe con cualquier caída. La reparación cuesta una fortuna.', 3, '78 days 20:41'),
        ('iPhone X', 'Juliana Escobar', 'Sin botón de inicio y con pantalla completa: se siente el futuro. Face ID acierta hasta con gafas oscuras.', 5, '8 days 11:27'),
        ('iPhone X', 'Rodrigo Alzate', 'La pantalla OLED es espectacular, pero mil dólares por un teléfono con muesca me sigue pareciendo demasiado.', 4, '58 days 19:16'),
        ('iPhone XS', 'Patricia Villegas', 'Mismo diseño del X con mejor cámara y más velocidad. Actualización tranquila, sin sorpresas.', 4, '22 days 15:08'),
        ('iPhone XS Max', 'Fernando Acosta', 'La pantalla de 6.5 pulgadas es enorme y perfecta para trabajar. El precio también es enorme.', 4, '14 days 10:45'),
        ('iPhone XS Max', 'Sara Gutiérrez', 'Impresionante para ver series, pero no me cabe en ningún bolsillo. Terminé usándolo con dos manos siempre.', 3, '69 days 21:52'),
        ('iPhone XR', 'Mónica Zapata', 'El coral es hermoso y la batería es la mejor que he tenido en un iPhone. La pantalla LCD no se ve mal para nada.', 5, '11 days 13:31'),
        ('iPhone XR', 'Nicolás Herrera', 'Excelente relación precio calidad, aunque los bordes de la pantalla son notoriamente más gruesos que en el XS.', 4, '47 days 18:23'),
        ('iPhone 11', 'Carla Benítez', 'La cámara ultra gran angular cambió mi forma de tomar fotos de paisajes. El modo noche funciona de verdad.', 5, '9 days 12:14'),
        ('iPhone 11', 'Iván Montoya', 'Batería para todo el día y precio razonable. Lo único: 64 GB en el modelo base se llenan en un mes.', 4, '61 days 20:29'),
        ('iPhone 11 Pro', 'Elena Cardona', 'Tres cámaras que se ven idénticas entre sí, algo raro de lograr. La pantalla XDR es lo mejor del equipo.', 5, '16 days 09:36'),
        ('iPhone 11 Pro Max', 'Santiago Ruiz', 'Verde medianoche y batería infinita. Lo compré para viajar y no he tenido que cargarlo en un vuelo largo.', 5, '13 days 17:42'),
        ('iPhone 11 Pro Max', 'Ana María Solís', 'Cámara impecable, pero el peso se siente en la mano después de un rato largo de uso.', 4, '82 days 11:07'),
        ('iPhone SE (2nd gen)', 'Jorge Betancur', 'El A13 por menos de cuatrocientos dólares no tiene competencia. Perfecto para quien viene de un 6 o un 7.', 5, '18 days 14:58'),
        ('iPhone SE (2nd gen)', 'Marcela Uribe', 'Rápido y compacto, pero la batería se queda corta y el diseño ya tiene años encima.', 3, '66 days 19:47'),
        ('iPhone 12 mini', 'Lorena Pineda', 'Por fin un teléfono pequeño con todo lo de la gama alta. Cabe en cualquier bolsillo y no renuncia a nada.', 5, '10 days 10:52'),
        ('iPhone 12 mini', 'Camilo Restrepo', 'Me enamoró el tamaño, pero la batería no llega a la noche si uso 5G. Tuve que cargarlo dos veces al día.', 3, '74 days 21:38'),
        ('iPhone 12', 'Ximena Duque', 'Los bordes planos le devolvieron la personalidad y MagSafe es mucho más útil de lo que esperaba.', 5, '15 days 16:11'),
        ('iPhone 12 Pro', 'Emilio Vargas', 'El azul pacífico es el mejor color que han hecho. El LiDAR ayuda mucho al enfoque en la noche.', 5, '12 days 09:24'),
        ('iPhone 12 Pro', 'Beatriz Cano', 'Cámara sobresaliente, aunque la diferencia real con el modelo estándar no justifica los doscientos dólares extra.', 4, '57 days 20:16'),
        ('iPhone 12 Pro Max', 'Raúl Jiménez', 'El sensor grande de este modelo saca fotos que ningún otro iPhone iguala. Es enorme, y lo asumí sabiendo.', 5, '19 days 13:03'),
        ('iPhone 13 mini', 'Silvia Moreno', 'La batería mejoró bastante frente al 12 mini y ahora sí llega a la noche. Sigue siendo el mejor tamaño.', 5, '14 days 11:41'),
        ('iPhone 13 mini', 'Álvaro Guzmán', 'Compacto y potente, pero sé que es el último pequeño que van a hacer y eso me da algo de tristeza.', 4, '88 days 18:55'),
        ('iPhone 13', 'Renata Ávila', 'La muesca más pequeña y la batería más grande hacen la diferencia diaria. El rosa es muy elegante en persona.', 5, '11 days 15:29'),
        ('iPhone 13', 'Guillermo Prieto', 'Muy buen equipo, aunque viniendo del 12 el cambio se nota poco. Si tienes el anterior, espera.', 3, '63 days 09:07'),
        ('iPhone 13 Pro', 'Teresa Núñez', 'Los 120 Hz de ProMotion se sienten desde el primer deslizamiento y ya no puedo volver atrás.', 5, '8 days 12:48'),
        ('iPhone 13 Pro', 'Cristian Bedoya', 'El modo macro es divertido y la batería mejoró muchísimo. Se calienta grabando en ProRes, eso sí.', 4, '51 days 19:22'),
        ('iPhone 13 Pro Max', 'Gloria Sandoval', 'Autonomía de dos días reales y una cámara que reemplazó mi equipo de viaje. Pesado pero lo vale.', 5, '17 days 10:33'),
        ('iPhone SE (3rd gen)', 'Óliver Cadena', 'El A15 con 5G a este precio es la mejor puerta de entrada al ecosistema. Ideal para regalar.', 4, '13 days 14:19'),
        ('iPhone SE (3rd gen)', 'Rosa Delgado', 'Funciona muy bien, pero seguir vendiendo el diseño del 8 en 2022 con esos bordes ya es demasiado.', 2, '71 days 20:56'),
        ('iPhone 14', 'Leandro Padilla', 'Detección de choques y satélite de emergencia dan mucha tranquilidad para viajar por carretera.', 4, '16 days 11:15'),
        ('iPhone 14 Plus', 'Antonia Salgado', 'Pantalla grande sin pagar precio de Pro y la batería es la que más me ha durado. Excelente decisión.', 5, '12 days 17:37'),
        ('iPhone 14 Plus', 'Fabián Correa', 'La batería es su mejor virtud, pero por dentro es un 14 del año pasado. Me faltó ProMotion.', 3, '59 days 09:44'),
        ('iPhone 14 Pro', 'Alicia Franco', 'La Isla Dinámica dejó de ser un truco cuando las aplicaciones la aprovecharon. Los 48 MP se notan al recortar.', 5, '9 days 13:26'),
        ('iPhone 14 Pro', 'Martín Quintero', 'Pantalla siempre encendida preciosa, pero al principio me consumía batería. Se arregló con una actualización.', 4, '46 days 21:03'),
        ('iPhone 14 Pro Max', 'Diana Espinosa', 'Es la cámara que uso para trabajar y no me ha quedado mal ni una vez. La batería aguanta jornadas completas.', 5, '20 days 10:11'),
        ('iPhone 15', 'Pablo Uribe', 'Por fin USB-C y un solo cable para todo. El vidrio mate en color no deja huellas y se siente muy bien.', 5, '10 days 15:52'),
        ('iPhone 15', 'Norma Trujillo', 'Buen equipo y la Isla Dinámica llegó al modelo básico, pero la carga por USB-C es más lenta de lo que esperaba.', 4, '54 days 19:28'),
        ('iPhone 15 Plus', 'Eduardo Barrios', 'Pantalla grande, batería enorme y USB-C. Es el modelo con mejor equilibrio de toda la generación.', 5, '15 days 12:07'),
        ('iPhone 15 Pro', 'Rocío Maldonado', 'El titanio bajó el peso lo suficiente para notarlo. El botón de acción lo tengo puesto en la linterna y lo uso a diario.', 5, '7 days 11:34'),
        ('iPhone 15 Pro', 'Ismael Fuentes', 'Muy rápido y ligero, aunque los primeros días se calentaba bastante jugando. Ya está corregido.', 4, '38 days 18:49'),
        ('iPhone 15 Pro Max', 'Bárbara Lozada', 'El teleobjetivo de 5x es de otro nivel para conciertos y viajes. La mejor cámara que he tenido.', 5, '11 days 09:58'),
        ('iPhone 15 Pro Max', 'Joaquín Rivas', 'Excelente en todo, pero mil doscientos dólares es mucho dinero para una actualización anual.', 4, '67 days 20:22'),
        ('iPhone 16', 'Irene Cabrera', 'El control de cámara es cómodo una vez le agarras el punto. El color ultramarino se ve mejor en persona.', 4, '14 days 13:45'),
        ('iPhone 16', 'Álex Montenegro', 'Mucho rendimiento para lo que cuesta, aunque compré pensando en funciones de inteligencia que llegaron meses después.', 3, '77 days 10:29'),
        ('iPhone 16 Plus', 'Susana Peláez', 'Pantalla amplia y batería que no se acaba. Para quien no quiere gastar en un Pro, es la opción.', 5, '18 days 16:53'),
        ('iPhone 16 Pro', 'Ernesto Palacios', 'La pantalla de 6.3 con marcos mínimos es preciosa y grabar a 4K 120 fps es una locura.', 5, '8 days 12:31'),
        ('iPhone 16 Pro', 'Ángela Sepúlveda', 'Todo excelente, pero el titanio del desierto marca las huellas más de lo que me gustaría.', 4, '43 days 19:14'),
        ('iPhone 16 Pro Max', 'Vicente Alarcón', 'Batería récord y cámara ultra gran angular de 48 MP que por fin está a la altura. Sin quejas.', 5, '12 days 11:06'),
        ('iPhone 16 Pro Max', 'Lina Guerrero', 'Impecable, aunque el tamaño obliga a usar dos manos siempre. Lo sabía al comprarlo.', 4, '62 days 20:37'),
        ('iPhone 16e', 'Hugo Miranda', 'Rendimiento de gama alta con un módem propio que gasta menos batería. Muy buena entrada de gama.', 4, '16 days 14:22'),
        ('iPhone 16e', 'Claudia Rincón', 'Me gusta el precio, pero perder la cámara ultra gran angular y MagSafe se siente en el día a día.', 3, '58 days 09:41'),
        ('iPhone 17', 'Federico Villamil', 'Ahora el modelo base trae 120 Hz y arranca en 256 GB. Es la mejor generación estándar en años.', 5, '10 days 17:18'),
        ('iPhone 17', 'Marisol Otero', 'La pantalla antirreflejo se agradece al sol y el color lavanda es muy bonito. Nada que reprochar.', 5, '39 days 12:55'),
        ('iPhone Air', 'Tobías Encinas', 'Cinco milímetros y medio de grosor que hay que tener en la mano para creerlo. Es un objeto precioso.', 5, '9 days 10:47'),
        ('iPhone Air', 'Elsa Miramontes', 'Es una obra de ingeniería, pero con una sola cámara y batería justa pagas el diseño por encima de todo.', 3, '48 days 21:29'),
        ('iPhone 17 Pro', 'Aurelio Barrera', 'El cuerpo de aluminio con cámara de vapor mantiene la temperatura estable grabando media hora seguida.', 5, '7 days 13:12'),
        ('iPhone 17 Pro', 'Noelia Cifuentes', 'El naranja cósmico llama la atención y las tres cámaras de 48 MP son consistentes entre sí. Muy contenta.', 5, '35 days 18:36'),
        ('iPhone 17 Pro Max', 'Ramiro Escalante', 'La batería más grande que han puesto en un iPhone y se nota: dos días completos sin pensar en el cargador.', 5, '13 days 11:53'),
        ('iPhone 17e', 'Yolanda Cepeda', 'Trae el A19 y MagSafe, que era lo que le faltaba al 16e. Ahora sí es la opción económica que tiene sentido.', 4, '21 days 15:44')
) AS v (modelo, nombre, mensaje, calificacion, desfase)
  ON v.modelo = c.modelo;

-- 5. Lo que el Next no tiene: costo, descuento y descripción ---------------------
-- Deterministas (hashtext del modelo), así cada recarga da los mismos números:
--   costo     = 55 %..70 % del precio.
--   descuento = 5, 10 o 15 % en los lanzamientos de sep-2023 a ago-2025
--               (generaciones anteriores a la vigente: lo que se liquida).
--   descripcion montada desde la ficha técnica.
UPDATE celulares c SET
    costo = ROUND(c.precio * (0.55 + (abs(hashtext(c.modelo)) % 16) / 100.0), 2),
    descuento_pct = CASE
        WHEN c.fecha_lanzamiento BETWEEN DATE '2023-09-01' AND DATE '2025-08-31'
            THEN (abs(hashtext(c.modelo || 'dto')) % 3 + 1) * 5
        ELSE 0
    END;

UPDATE celulares c SET descripcion =
    m.nombre || ' ' || c.modelo || ', lanzado el ' || to_char(c.fecha_lanzamiento, 'DD/MM/YYYY') || '. '
    || 'Procesador ' || e.procesador || ' con ' || e.ram || ' de RAM y opciones de almacenamiento de '
    || e.almacenamiento || '. Pantalla ' || e.pantalla || ', cámara ' || e.camara
    || ' y batería de ' || e.bateria || '. Sale de fábrica con ' || e.sistema_op || '.'
FROM marcas m, especificaciones e
WHERE m.id = c.marca_id AND e.celular_id = c.id;

-- 6. Usuarios ----------------------------------------------------------------------
-- Hashes scrypt (scrypt:N:r:p:sal:hash), mismo formato que src/auth/password.ts.
INSERT INTO usuarios (email, nombre, documento, telefono, password_hash, rol) VALUES
    ('admin@iwantmyphone.dev', 'Administrador', '1234567890', '3000000001', 'scrypt:16384:8:1:25htJ0t_K8jU0kmanGlVZg:AvwuV0bCBC9GYq_E_Lt59cqR2EaLNWnavAfi7Q3EsTovs__WS28XtRDaPDEwwWVlbnM_4RDEIQUrzLwV1xjaWA', 'administrador'),
    ('vendedor@iwantmyphone.dev', 'Valeria Vendedora', '1234567891', '3000000002', 'scrypt:16384:8:1:NniWdZn-eUUXAJfpZkqbaQ:GT7bvvn98X9nVXJg2wHqEVTPWbDWP5VIoZ6shOQ7yoouJW1TNj0yGwoNNUJQJCM3e9T-8KzTuxhvvHqAZ-1b9Q', 'vendedor'),
    ('visitante@iwantmyphone.dev', 'Víctor Visitante', '1234567892', '3000000003', 'scrypt:16384:8:1:n5jlaAZvc5Cz-ACe_rXjPA:B764k7Iq4OhL9aYHa41bGSWyyv_lJf8K2nqJgyRGLSDhyUQCRLnkFWLK1P2S8Edg55m4quCfwsQAmbfveazbgw', 'visitante');

INSERT INTO usuarios (email, nombre, documento, telefono, password_hash, rol, created_at)
SELECT format('cliente%s@example.com', lpad(n::text, 2, '0')), v.nombre,
       (1020300000 + n)::text, '31' || lpad((n * 7919 % 100000000)::text, 8, '0'),
       'scrypt:16384:8:1:n5jlaAZvc5Cz-ACe_rXjPA:B764k7Iq4OhL9aYHa41bGSWyyv_lJf8K2nqJgyRGLSDhyUQCRLnkFWLK1P2S8Edg55m4quCfwsQAmbfveazbgw', 'visitante', now() - ((400 - n * 7) || ' days')::interval
FROM (VALUES
    (1, 'Laura Ferrer'), (2, 'Andrés Villalba'), (3, 'Paula Restrepo'), (4, 'Camila Ochoa'),
    (5, 'Julián Mesa'), (6, 'Sofía Aguirre'), (7, 'Mateo Ibarra'), (8, 'Isabela Márquez'),
    (9, 'Santiago Ruiz'), (10, 'Lucía Pardo'), (11, 'Gabriel Toro'), (12, 'Mónica Zapata')
) AS v (n, nombre);

-- 7. Direcciones: una por cliente y otra para el visitante de pruebas ------------
INSERT INTO direcciones (usuario_id, alias, direccion, ciudad, departamento, indicaciones, telefono)
SELECT u.id, 'Casa',
       'Calle ' || (10 + row_number() OVER (ORDER BY u.email)) || ' # ' || (20 + row_number() OVER (ORDER BY u.email)) || '-15',
       d.ciudad, d.departamento,
       CASE WHEN row_number() OVER (ORDER BY u.email) % 3 = 0 THEN 'Portería, apto 302' END,
       u.telefono
FROM usuarios u
JOIN LATERAL (
    SELECT (ARRAY['Medellín', 'Bogotá', 'Cali', 'Barranquilla', 'Pereira', 'Bucaramanga'])[1 + abs(hashtext(u.email)) % 6] AS ciudad
) c ON TRUE
JOIN LATERAL (
    SELECT c.ciudad,
           CASE c.ciudad
               WHEN 'Medellín' THEN 'Antioquia' WHEN 'Bogotá' THEN 'Cundinamarca'
               WHEN 'Cali' THEN 'Valle del Cauca' WHEN 'Barranquilla' THEN 'Atlántico'
               WHEN 'Pereira' THEN 'Risaralda' ELSE 'Santander'
           END AS departamento
) d ON TRUE
WHERE u.rol = 'visitante';

-- 8. Métodos de pago ---------------------------------------------------------------
-- ePayco solo se ofrece en la app si la API tiene sus tres llaves en .env.
INSERT INTO metodos_pago (codigo, nombre, descripcion, proveedor, requiere_pasarela, config, orden) VALUES
    ('contraentrega', 'Pago contraentrega', 'Pagas en efectivo o con datáfono al recibir el pedido.', NULL, FALSE, '{}', 1),
    ('epayco', 'Tarjeta, PSE o efectivo', 'Pago en línea seguro con ePayco.', 'epayco', TRUE, '{"checkout": "standard"}', 2);

-- 9. Pedidos sintéticos ------------------------------------------------------------
-- ~480 pedidos en los últimos 365 días, más densos cuanto más recientes, y
-- siempre algunos de hoy y de ayer: el reporte de ventas y el resumen por
-- producto tienen datos desde el primer arranque. setseed() los hace
-- reproducibles. Solo se venden modelos ya lanzados en la fecha del pedido y
-- con menos de 4 años: nadie compraba un iPhone 17 en 2024 ni un 3G en 2026.
DO $$
DECLARE
    v_fecha       TIMESTAMPTZ;
    v_cliente     RECORD;
    v_metodo      RECORD;
    v_codigo      TEXT;
    v_pedido_id   UUID;
    v_items       INT;
    v_edad        INTERVAL;
    v_estado      estado_pedido;
    v_pagado      TIMESTAMPTZ;
    v_hoy         TIMESTAMPTZ := date_trunc('day', now());
BEGIN
    PERFORM setseed(0.42);

    CREATE TEMP TABLE fechas_pedidos ON COMMIT DROP AS
    SELECT now() - power(random(), 1.7) * INTERVAL '365 days' AS fecha
    FROM generate_series(1, 470)
    UNION ALL  -- ayer
    SELECT v_hoy - INTERVAL '1 day' + random() * INTERVAL '23 hours' FROM generate_series(1, 6)
    UNION ALL  -- hoy, sin pasar de la hora actual
    SELECT v_hoy + random() * (now() - v_hoy) FROM generate_series(1, 5);

    -- En orden cronológico, para que `numero` crezca con la fecha.
    FOR v_fecha IN SELECT fecha FROM fechas_pedidos ORDER BY fecha LOOP
        SELECT u.*, d.direccion, d.ciudad, d.departamento, d.indicaciones, d.telefono AS tel_dir
          INTO v_cliente
          FROM usuarios u JOIN direcciones d ON d.usuario_id = u.id
         WHERE u.email LIKE 'cliente%'
         ORDER BY random() LIMIT 1;

        -- El sorteo va en una variable: dentro del WHERE, random() se
        -- evaluaría una vez por fila y podría no elegir ninguna.
        v_codigo := CASE WHEN random() < 0.6 THEN 'contraentrega' ELSE 'epayco' END;
        SELECT * INTO v_metodo FROM metodos_pago WHERE codigo = v_codigo;

        v_edad := now() - v_fecha;
        v_estado := CASE
            WHEN v_edad > INTERVAL '10 days' THEN CASE WHEN random() < 0.08 THEN 'cancelado' ELSE 'entregado' END
            WHEN v_edad > INTERVAL '3 days'  THEN CASE WHEN random() < 0.5 THEN 'enviado' ELSE 'entregado' END
            WHEN v_edad > INTERVAL '1 day'   THEN CASE WHEN random() < 0.5 THEN 'confirmado' ELSE 'enviado' END
            ELSE CASE WHEN random() < 0.5 THEN 'pendiente' ELSE 'confirmado' END
        END::estado_pedido;

        -- ePayco: pagado minutos después del pedido, salvo los pendientes.
        -- Contraentrega: pagado al entregar.
        v_pagado := CASE
            WHEN v_metodo.requiere_pasarela AND v_estado NOT IN ('pendiente', 'cancelado')
                THEN v_fecha + (3 + random() * 20) * INTERVAL '1 minute'
            WHEN NOT v_metodo.requiere_pasarela AND v_estado = 'entregado'
                THEN v_fecha + INTERVAL '3 days'
        END;

        INSERT INTO pedidos (usuario_id, cliente_nombre, cliente_email, cliente_documento, cliente_telefono,
                             direccion_entrega, ciudad_entrega, departamento_entrega, indicaciones_entrega,
                             metodo_pago_id, estado, pagado_at, subtotal, descuento, total, costo_total,
                             created_at, updated_at)
        VALUES (v_cliente.id, v_cliente.nombre, v_cliente.email, v_cliente.documento, v_cliente.tel_dir,
                v_cliente.direccion, v_cliente.ciudad, v_cliente.departamento, v_cliente.indicaciones,
                v_metodo.id, v_estado, v_pagado, 0, 0, 0, 0,
                v_fecha, LEAST(now(), v_fecha + INTERVAL '2 days'))
        RETURNING id INTO v_pedido_id;

        v_items := CASE WHEN random() < 0.75 THEN 1 WHEN random() < 0.8 THEN 2 ELSE 3 END;

        INSERT INTO pedido_items (pedido_id, celular_id, modelo, imagen_url, cantidad,
                                  precio_unitario, descuento_unitario, costo_unitario)
        SELECT v_pedido_id, c.id, m.nombre || ' ' || c.modelo, split_part(c.images_urls, ',', 1),
               CASE WHEN random() < 0.85 THEN 1 ELSE 2 END,
               c.precio, ROUND(c.precio * c.descuento_pct / 100.0, 2), c.costo
        FROM celulares c JOIN marcas m ON m.id = c.marca_id
        WHERE c.fecha_lanzamiento <= v_fecha::date
          AND c.fecha_lanzamiento > (v_fecha - INTERVAL '4 years')::date
        ORDER BY random()
        LIMIT v_items;

        UPDATE pedidos p SET
            subtotal    = t.subtotal,
            descuento   = t.descuento,
            total       = t.subtotal - t.descuento,
            costo_total = t.costo
        FROM (
            SELECT SUM(precio_unitario * cantidad)    AS subtotal,
                   SUM(descuento_unitario * cantidad) AS descuento,
                   SUM(costo_unitario * cantidad)     AS costo
            FROM pedido_items WHERE pedido_id = v_pedido_id
        ) t
        WHERE p.id = v_pedido_id;

        IF v_metodo.requiere_pasarela THEN
            INSERT INTO pagos (pedido_id, metodo_pago_id, referencia, referencia_pasarela, estado,
                               monto, moneda, medio, created_at, updated_at)
            SELECT p.id, v_metodo.id,
                   'IWMP-' || p.numero || '-' || substr(md5(p.id::text), 1, 8),
                   CASE WHEN v_pagado IS NOT NULL THEN (100000000 + (abs(hashtext(p.id::text)) % 899999999))::text END,
                   CASE WHEN v_estado = 'cancelado' THEN 'rechazado'
                        WHEN v_pagado IS NULL THEN 'pendiente'
                        ELSE 'aprobado' END::estado_pago,
                   p.total, 'USD',
                   CASE WHEN v_pagado IS NOT NULL THEN (ARRAY['VS', 'MC', 'PSE', 'AM'])[1 + abs(hashtext(p.id::text)) % 4] END,
                   p.created_at, COALESCE(v_pagado, p.created_at)
            FROM pedidos p WHERE p.id = v_pedido_id;
        END IF;
    END LOOP;
END $$;
