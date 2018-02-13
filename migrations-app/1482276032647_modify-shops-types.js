exports.up = function(pgm) {
  // change bigints to integers so they'll be numbers in javascript
  pgm.sql(`
    ALTER TABLE shops
      ALTER COLUMN to_download TYPE integer,
      ALTER COLUMN downloaded TYPE integer,
      ALTER COLUMN to_upload TYPE integer,
      ALTER COLUMN uploaded TYPE integer;`);

  // convert epoch number to timestamp, dropping and re-adding default because we can't convert it
  pgm.sql(`
    ALTER TABLE shops
    ALTER COLUMN last_sync_timestamp DROP DEFAULT,
    ALTER COLUMN last_sync_timestamp TYPE timestamp with time zone
      USING timestamp with time zone 'epoch' + last_sync_timestamp * interval '1 second',
    ALTER COLUMN last_sync_timestamp SET DEFAULT '1999-01-01';`);
};

exports.down = function(pgm) {
  pgm.sql(`
    ALTER TABLE shops
      ALTER COLUMN to_download TYPE bigint,
      ALTER COLUMN downloaded TYPE bigint,
      ALTER COLUMN to_upload TYPE bigint,
      ALTER COLUMN uploaded TYPE bigint;`);

  pgm.sql(`
    ALTER TABLE shops
    ALTER COLUMN last_sync_timestamp DROP DEFAULT,
    ALTER COLUMN last_sync_timestamp TYPE bigint
      USING EXTRACT(EPOCH FROM last_sync_timestamp),
    ALTER COLUMN last_sync_timestamp SET DEFAULT 0;`);
};
