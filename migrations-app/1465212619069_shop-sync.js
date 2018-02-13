exports.up = function(pgm) {
  pgm.sql("DELETE FROM SHOPS WHERE property_name in ('_done','_total')");
  pgm.sql("INSERT INTO SHOPS (id,account_id,property_name,property_value) SELECT id, account_id, '_uploaded' as property_name, 0 as property_value FROM SHOPS GROUP BY id,account_id");
  pgm.sql("INSERT INTO SHOPS (id,account_id,property_name,property_value) SELECT id, account_id, '_downloaded' as property_name, 0 as property_value FROM SHOPS GROUP BY id,account_id");
};

exports.down = function(pgm) {
  pgm.sql("DELETE FROM SHOPS WHERE property_name IN ('_uploaded','_downloaded')");
  pgm.sql("UPDATE SHOPS set property_value=0 WHERE property_name in ('_to_upload', '_to_download')");
};
