import psycopg2
import os

# Connect to the database ($DATABASE_URL) and run SQL queries
# get_db() singleton returns existing session
#
# Usage:
#    from db.postgres import Postgres
#
#    db = Postgres.get_db()
#    rows = db.select('SELECT email FROM users WHERE name_first = %s', ['Jeff'])
#    db.run('UPDATE users SET name_first = %s WHERE email = %s', ['Jefferson', 'jbrown@example.com']);


class Postgres():
    _session = None
    _connection_string = None

    @staticmethod
    def get_db(connection_string):
        if connection_string == Postgres._connection_string:
            return Postgres._session
        if Postgres._session is not None:
            Postgres._session.close()

        Postgres._connection_string = connection_string
        Postgres._session = Postgres(connection_string)
        return Postgres._session

    def __init__(self, connection_string):
        self.connection = psycopg2.connect(connection_string)

    def close(self):
        self.connection.close()

    def select(self, sql, params=None):
        cur = self.connection.cursor()
        cur.execute(sql, params)
        self.connection.commit()
        result = cur.fetchall()
        cur.close()
        return result

    def run(self, sql, params=None):
        cur = self.connection.cursor()
        cur.execute(sql, params)
        self.connection.commit()
        cur.close()

