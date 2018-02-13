exports.up = function(pgm) {
  pgm.sql('CREATE TABLE "session" ("sid" varchar NOT NULL COLLATE "default","sess" json NOT NULL,"expire" timestamp(6) NOT NULL);');
  pgm.sql('ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;');
};

exports.down = function(pgm) {
  pgm.dropTable('session');
};
