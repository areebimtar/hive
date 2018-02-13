exports.up = function(pgm) {
  pgm.sql('update product_properties set _hive_is_invalid=false where _hive_is_invalid is null');
  pgm.addColumns('product_properties', {
    title: { type: 'text', default: null },
    description: { type: 'text', default: null },
    creation_tsz: { type: 'timestamp with time zone', default: null },
    ending_tsz: { type: 'timestamp with time zone', default: null },
    price: { type: 'text', default: null },
    quantity: { type: 'text', default: null },
    state_tsz: { type: 'timestamp with time zone', default: null },
    taxonomy_id: { type: 'bigint', default: null },
    section_id: { type: 'text', default: null },
    tags: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    materials: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    _hive_on_new_schema: { type: 'boolean', notNull: true, default: false },
    _hive_changed_properties: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    _hive_last_sync: { type: 'timestamp with time zone', default: null }
  });

  pgm.alterColumn('product_properties', '_hive_is_invalid', { default: false, notNull: true });

  pgm.renameColumn('product_properties', 'channel_listing_id', 'listing_id');
};

exports.down = function(pgm) {
  pgm.dropColumns('product_properties', ['title', 'description', 'creation_tsz', 'ending_tsz', 'price', 'quantity', 'state_tsz', 'taxonomy_id', 'section_id', 'tags', 'materials', '_hive_on_new_schema', '_hive_changed_properties', '_hive_last_sync']);
  pgm.renameColumn('product_properties', 'listing_id', 'channel_listing_id');
};
