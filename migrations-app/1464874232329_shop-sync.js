exports.up = function(pgm) {
  pgm.sql("DELETE FROM SHOPS WHERE property_name in ('_done','_total')");
  pgm.sql("INSERT INTO SHOPS (id,account_id,property_name,property_value) SELECT id, account_id, '_to_upload' as property_name, 0 as property_value FROM SHOPS GROUP BY id,account_id");
  pgm.sql("INSERT INTO SHOPS (id,account_id,property_name,property_value) SELECT id, account_id, '_to_download' as property_name, 0 as property_value FROM SHOPS GROUP BY id,account_id");
};

exports.down = function(pgm) {
  pgm.sql("DELETE FROM SHOPS WHERE property_name IN ('_to_upload','_to_download')");
  pgm.sql("INSERT INTO SHOPS (id,account_id,property_name,property_value) SELECT id, account_id, '_done' as property_name, 0 as property_value FROM SHOPS GROUP BY id,account_id");
  pgm.sql("INSERT INTO SHOPS (id,account_id,property_name,property_value) SELECT id, account_id, '_total' as property_name, 0 as property_value FROM SHOPS GROUP BY id,account_id");
};
