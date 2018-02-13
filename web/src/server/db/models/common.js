export function createSequence(db, name, opts) {
  const options = Object.assign({}, { dropExisting: true }, opts);

  let createSequenceQuery = 'CREATE SEQUENCE ' + name;
  if (options.min !== undefined) {
    createSequenceQuery += ' MINVALUE ' + options.min;
  }

  if (options.max !== undefined) {
    createSequenceQuery += ' MAXVALUE ' + options.max;
  }

  createSequenceQuery += ' NO CYCLE';

  if (options.dropExisting) {
    const dropSequence = 'DROP SEQUENCE IF EXISTS ' + name + ' CASCADE';

    return db.none(dropSequence)
      .then(db.none.bind(db, createSequenceQuery));
  }

  return db.none(createSequenceQuery);
}

export function createTable(db, name, fields, opts) {
  const options = Object.assign({}, { dropExisting: true }, opts);

  let createTableQuery = 'CREATE TABLE ' + name + '(';
  const rows = [];
  for (const key in fields) {
    if ({}.hasOwnProperty.call(fields, key)) {
      rows.push(key + ' ' + fields[key]);
    }
  }

  createTableQuery += rows.join(',');
  createTableQuery += ')';

  if (options.dropExisting) {
    const dropTable = 'DROP TABLE IF EXISTS ' + name + ' CASCADE';
    return db.none(dropTable)
      .then(db.none.bind(db, createTableQuery));
  }

  return db.none(createTableQuery);
}
