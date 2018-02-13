
DROP FUNCTION IF EXISTS drop_tables();
CREATE FUNCTION drop_tables()
  RETURNS void
  LANGUAGE plpgsql
AS $drop_tables$
  DECLARE
    v_table text;
    v_sequence text;
    v_cmd text;

  BEGIN
    FOR v_table IN SELECT table_name FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' AND table_schema = 'public'
    LOOP
      v_cmd := 'DROP TABLE IF EXISTS ' || v_table || ' CASCADE;';
      EXECUTE v_cmd;
    END LOOP;

    FOR v_sequence IN SELECT sequence_name FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    LOOP
      v_cmd := 'DROP SEQUENCE IF EXISTS ' || v_sequence || ' CASCADE;';
      EXECUTE v_cmd;
    END LOOP;

  END;
$drop_tables$;

SELECT * FROM drop_tables();


