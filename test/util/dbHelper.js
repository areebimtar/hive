import shell from 'shelljs';
import moment from 'moment';
import PostgresDb from '../../shared/postgresDb';
import Models from '../../shared/db/models';

let initialized = false;
let db;
let models;

function runShellCommands(commandsArray) {
  for (let i = 0; i < commandsArray.length; i++) {
    const exitCode = shell.exec(commandsArray[i]).code;
    if (exitCode !== 0) {
      throw new Error(`error executing ${commandsArray[i]}`);
    }
  }
}

class DbUtil {
  constructor(config) {
    this._config = config;
  }

  _pg(statement, usePostgresDb) {
    const database = usePostgresDb ? 'postgres' : this._config.database;
    return `psql -d ${database} -c "${statement}"`;
  }

  doesDbExist(dbname) {
    const result = shell.exec(`psql -d postgres -A -t -0 -c "SELECT datname from pg_database where datname = '${dbname}'"`, {silent: true}).stdout;
    return !!result && result.indexOf(dbname) === 0;
  }

  createDbs() {
    runShellCommands([
      this._pg(`CREATE ROLE ${this._config.user} LOGIN PASSWORD '${this._config.password}'`, true),
      this._pg(`CREATE DATABASE ${this._config.database}`, true),
      this._pg(`CREATE DATABASE ${this._config.database}_auth`, true),
      this._pg(`CREATE extension IF NOT EXISTS postgres_fdw`),
      this._pg(`GRANT USAGE on FOREIGN DATA WRAPPER postgres_fdw to ${this._config.user}`),
      this._pg(`GRANT CREATE on database ${this._config.database} to ${this._config.user}`),
      this._pg(`GRANT ALL ON DATABASE ${this._config.database} to ${this._config.user}`),
      this._pg(`GRANT ALL ON DATABASE ${this._config.database}_auth to ${this._config.user}`)
    ]);
  }

  populateDbs() {
    const dburl = `postgres://${this._config.user}:${this._config.password}@localhost:${this._config.port}/${this._config.database}`;
    runShellCommands([
      `DATABASE_URL=${dburl}_auth yarn run migrate_auth_db`,
      // note the RABBIT_VHOST environment variable-- this is used by one of the migrations to create the vhost
      `DATABASE_URL=${dburl} RABBIT_VHOST=${this._config.database}_vhost yarn run migrate_app_db`
    ]);
  }
  deleteDbs() {
    runShellCommands([
      this._pg(`DROP DATABASE IF EXISTS ${this._config.database}`, true),
      this._pg(`DROP DATABASE IF EXISTS ${this._config.database}_auth`, true),
      this._pg(`DROP ROLE IF EXISTS ${this._config.user}`, true)
    ]);
  }
}

export default function createDbHelper() {
  if (!initialized) {
    const createDb = !process.env.HIVE_TEST_DB_NAME;
    const dbName = createDb ? `test_hive_${moment().valueOf()}` : process.env.HIVE_TEST_DB_NAME;
    const dbConfig = {
      user: dbName + '_user',
      password: 'testhivepassword',
      host: 'localhost',
      port: 5432,
      database: dbName,
      logQueries: false
    };

    const dbutil = new DbUtil(dbConfig);

    before(function before() {
      this.timeout(10000);
      if (createDb || !dbutil.doesDbExist(dbConfig.database)) {
        dbutil.createDbs();
        dbutil.populateDbs();
      }
      db = new PostgresDb(dbConfig);
      models = new Models(db);
    });

    after(() => {
      db.end();
      createDb && dbutil.deleteDbs();
    });

    initialized = true;
  }

  return {
    getDb: () => db,
    getModels: () => models
  };
}
