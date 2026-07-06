-- ============================================================
-- Individua · seed — catálogo inicial de conquistas
-- `icon` usa nomes de ícones do Lucide (https://lucide.dev)
-- ============================================================

insert into public.achievements (code, name, description, icon, xp_reward) values
  ('first-mission',  'Primeira Missão',   'Conclua seu primeiro card',                          'rocket',        25),
  ('ten-cards',      'Dez na Conta',      'Conclua 10 cards',                                   'target',        50),
  ('fifty-cards',    'Operador Veterano', 'Conclua 50 cards',                                   'medal',        100),
  ('hundred-cards',  'Centurião',         'Conclua 100 cards',                                  'crown',        200),
  ('streak-7',       'Semana em Chamas',  'Mantenha um streak de 7 dias',                       'flame',         75),
  ('streak-30',      'Mês Imparável',     'Mantenha um streak de 30 dias',                      'calendar-check', 300),
  ('early-bird',     'Madrugador',        'Conclua um card antes das 9h',                       'sunrise',       50),
  ('night-owl',      'Coruja',            'Conclua um card depois das 23h',                     'moon',          50),
  ('marathon',       'Maratonista',       'Conclua 5 cards no mesmo dia',                       'zap',           75),
  ('punctual',       'Pontual',           'Conclua 10 cards antes do prazo',                    'clock',        100),
  ('multi-board',    'Multitarefa',       'Conclua cards em 3 boards diferentes',               'layers',        75),
  ('level-10',       'Ascensão',          'Alcance o nível 10',                                 'trending-up',  150)
on conflict (code) do nothing;
