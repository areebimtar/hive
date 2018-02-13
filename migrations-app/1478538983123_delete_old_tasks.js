exports.up = function(pgm) {
  pgm.sql(`CREATE OR REPLACE FUNCTION trim_queue(days integer) RETURNS void as $$
    BEGIN
      CREATE TABLE task_queue_temp AS SELECT * FROM task_queue WHERE created_at >= (CURRENT_DATE - days);
      TRUNCATE task_queue;
      INSERT INTO task_queue SELECT * FROM task_queue_temp;
      DROP TABLE task_queue_temp;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = function(pgm) {
  pgm.sql(`DROP FUNCTION trim_queue(days integer);`);
};
