exports.up = function up(pgm) {
  pgm.alterColumn('product_properties', 'id', {
    type: 'bigint',
    default: pgm.func(`nextval('product_id_seq'::regclass)`),
    primaryKey: true
  });
  // Note: don't delete sequence product_properties_id_seq to be able to rollback

  // ensure unique channel_listing_id per shop_id
  pgm.sql(`
    WITH summary AS (
      SELECT pp.id,
          pp.channel_listing_id,
          pp.shop_id,
          ROW_NUMBER() OVER(PARTITION BY pp.channel_listing_id, pp.shop_id
      ORDER BY pp.id DESC) AS rowNum
      FROM product_properties pp)
    DELETE from product_properties
    WHERE id in (
      SELECT s.id
      FROM summary s
      WHERE s.rowNum > 1
    )
  `);

  // add unique constraint
  pgm.addConstraint(
    'product_properties',
    'unique_channel_listing_id_shop_id',
    'UNIQUE (channel_listing_id, shop_id)'
  );
};

exports.down = function down(pgm) {
  pgm.dropConstraint(
    'product_properties',
    'unique_channel_listing_id_shop_id'
  );

  pgm.alterColumn('product_properties', 'id', {
    type: 'int',
    default: pgm.func(`nextval('product_properties_id_seq'::regclass)`),
    primaryKey: true
  });
};
