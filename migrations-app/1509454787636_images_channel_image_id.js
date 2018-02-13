exports.up = function(pgm) {
  pgm.renameColumn('images', 'etsy_image_id', 'channel_image_id');
};

exports.down = function(pgm) {
  pgm.renameColumn('images', 'channel_image_id', 'etsy_image_id');
};
