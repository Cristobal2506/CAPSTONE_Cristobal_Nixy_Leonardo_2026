-- Los cinco ejes de Matemática 4° básico (Bases Curriculares 2012).
-- Los nombres de isla son provisorios: los define el equipo de diseño con el cliente.
INSERT INTO eje (codigo, nombre, isla_nombre, orden) VALUES
  ('numeros',     'Números y operaciones',   'Isla del Sol',        1),
  ('patrones',    'Patrones y álgebra',      'Isla de la Luna',     2),
  ('geometria',   'Geometría',               'Isla de las Piedras', 3),
  ('medicion',    'Medición',                'Isla del Viento',     4),
  ('datos',       'Datos y probabilidades',  'Isla de las Nubes',   5)
ON CONFLICT (codigo) DO NOTHING;
