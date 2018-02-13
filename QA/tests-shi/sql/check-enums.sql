-- recipient
-- men, women, unisex_adults, teen_boys, teen_girls, teens, boys, girls, children, baby_boys, baby_girls, babies, birds, cats, dogs, pets, not_specified
-- mnner, frauen, unisex_erwachsene, teenager__jungen, teenager__mdchen, jugendliche, jungs, mdchen, kinder, babys__jungen, babys__mdchen, babys, vgel, katzen, hunde, haustiere, not_specified
-- hombres, mujer, adultos_unisex, nios_adolescentes, nias_adolescentes, adolescentes, nios, nias, bebs_nios, beb_nia, bebs, pajaros, gatos, perros, mascotas, not_specified
-- 
-- occasion:
-- anniversary, baptism, bar_or_bat_mitzvah, birthday, canada_day, chinese_new_year, cinco_de_mayo, confirmation, christmas, day_of_the_dead, easter, eid, engagement, fathers_day, get_well, graduation, halloween, hanukkah, housewarming, kwanzaa, prom, july_4th, mothers_day, new_baby, new_years, quinceanera, retirement, st_patricks_day, sweet_16, sympathy, thanksgiving, valentines, wedding
-- jubilum, taufe, bar_oder_bat_mizwa, geburtstag, canada_day, chinesisches_neujahr, cinco_de_mayo, konfirmation, weihnachten, day_of_the_dead, ostern, eid, verlobung, vatertag, gute_besserung, abschluss, halloween, hanukkah, hauseinweihung, kwanzaa, prom, der_4_juli, muttertag, neugeborenes, neujahr, quinceanera, ruhestand, st_patricks_day, sweet_16, anteilnahme, thanksgiving, valentinstag, hochzeit
-- hombres, mujer, adultos_unisex, nios_adolescentes, nias_adolescentes, adolescentes, nios, nias, bebs_nios, beb_nia, bebs, pajaros, gatos, perros, mascotas, not_specified
-- 
-- style
-- 
-- null, None, Abstract, African, Art Deco, Art Nouveau, Asian, Athletic, Avant Garde, Beach, Boho, Cottage Chic, Country Western, Edwardian, Fantasy, Folk, Goth, High Fashion, Hip Hop, Hippie, Hipster, Historical, Hollywood Regency, Industrial, Kawaii, Kitsch, Mediterranean, Mid Century, Military, Minimalist, Mod, Modern, Nautical, Neoclassical, Preppy, Primitive, Regency, Renaissance, Resort, Retro, Rocker, Rustic, Sci Fi, Southwestern, Spooky, Steampunk, Techie, Traditional, Tribal, Victorian, Waldorf, Woodland, Zen,
-- 
-- 
-- when_made
-- made_to_order, 2010_2016, 2000_2009, 1997_1999, before_1997, 1990_1996, 1980s, 1970s, 1960s, 1950s, 1940s, 1930s, 1920s, 1910s, 1900s, 1800s, 1700s, before_1700


SELECT * FROM products WHERE property_name = 'occasion' AND property_value NOT IN ('anniversary', 'baptism', 'bar_or_bat_mitzvah', 'birthday', 'canada_day', 'chinese_new_year', 'cinco_de_mayo', 'confirmation', 'christmas', 'day_of_the_dead', 'easter', 'eid', 'engagement', 'fathers_day', 'get_well', 'graduation', 'halloween', 'hanukkah', 'housewarming', 'kwanzaa', 'prom', 'july_4th', 'mothers_day', 'new_baby', 'new_years', 'quinceanera', 'retirement', 'st_patricks_day', 'sweet_16', 'sympathy', 'thanksgiving', 'valentines', 'wedding');
SELECT * FROM products WHERE property_name = 'recipient' AND property_value NOT IN ('men', 'women', 'unisex_adults', 'teen_boys', 'teen_girls', 'teens', 'boys', 'girls', 'children', 'baby_boys', 'baby_girls', 'babies', 'birds', 'cats', 'dogs', 'pets', 'not_specified');
SELECT * FROM products WHERE property_name = 'when_made' AND property_value NOT IN ( 'made_to_order', '2010_2016', '2000_2009', '1997_1999', 'before_1997', '1990_1996', '1980s', '1970s', '1960s', '1950s', '1940s', '1930s', '1920s', '1910s', '1900s', '1800s', '1700s', 'before_1700');
SELECT id , property_value, style FROM (SELECT id , property_value, regexp_split_to_table( regexp_replace(property_value, '[][]', '', 'g'), ',') AS style FROM products WHERE property_name = 'style') AS subq WHERE style NOT IN ('', 'null', '"None"', '"Abstract"', '"African"', '"Art Deco"', '"Art Nouveau"', '"Asian"', '"Athletic"', '"Avant Garde"', '"Beach"', '"Boho"', '"Cottage Chic"', '"Country Western"', '"Edwardian"', '"Fantasy"', '"Folk"', '"Goth"', '"High Fashion"', '"Hip Hop"', '"Hippie"', '"Hipster"', '"Historical"', '"Hollywood Regency"', '"Industrial"', '"Kawaii"', '"Kitsch"', '"Mediterranean"', '"Mid Century"', '"Military"', '"Minimalist"', '"Mod"', '"Modern"', '"Nautical"', '"Neoclassical"', '"Preppy"', '"Primitive"', '"Regency"', '"Renaissance"', '"Resort"', '"Retro"', '"Rocker"', '"Rustic"', '"Sci Fi"', '"Southwestern"', '"Spooky"', '"Steampunk"', '"Techie"', '"Traditional"', '"Tribal"', '"Victorian"', '"Waldorf"', '"Woodland"', '"Zen"');
SELECT * FROM shop_sections;
