exports.up = function up(pgm) {
  // replace wrong section_ids in products
  pgm.sql(`
    update products as p
    set property_value = right_sections.id
    from shop_sections as wrong_sections, shop_sections as right_sections
    where wrong_sections.value = right_sections.value
    and wrong_sections.section_id is null
    and right_sections.section_id is not null
    and p.property_name = '_HIVE_section_id' and to_number(p.property_value, '999999999') = wrong_sections.id
  `);

  // delete wrong sections
  pgm.sql(`
    delete from shop_sections
    where section_id is null
  `);
};

exports.down = function down(/* pgm */) {
  // nothing to do
};
