# ---------------------------------------------------------------------------------------------------------
# These "tests" serve as scripts for generating SQL DB data using Etsy test data
# - current SQL DB data in repo are overwritten by these "tests"
# For more information see QA/tests-shi/sql/README-update-listing-caches.md
# ---------------------------------------------------------------------------------------------------------

import pytest
from tests.base import BaseTestClass, run_sql, HIVE_DATABASE_URL
from pages.login_page import LoginPage
from modules.hivedb import HiveDatabase
import tests.vela_control as vela
import subprocess
import os
import re
from fixtures.fixtures import test_id

OLD_SYNC_TIME_STR = '2017-01-01 00:00:00.000+00'
OLD_PRODUCT_MODIFICATION_TIMESTAMP = '2017-01-01 00:00:00.000+00'

SQL_DATA_PATH = os.path.join(os.environ['QA_DIR'], 'sql')


@pytest.mark.usefixtures("test_status", "test_id")
class TestGenerateSql(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.db = HiveDatabase(HIVE_DATABASE_URL)
        self._used_etsy_testcase = None

    def import_shop(self, etsy_test_case, timeout_sec=30):
        """ Import shop from etsy emulator to Hive

        :param etsy_test_case: name of etsy test case - conforms to its json file
        :param timeout_sec: timeout for importing the shop
        """
        self._used_etsy_testcase = etsy_test_case
        self.set_etsy_testcase(etsy_test_case)
        self.stop_all()
        run_sql('HIVE', 'listings_no_shop', retry=2)
        self.restart_all()

        d = self.driver
        d.delete_all_cookies()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)
        lpg.go_to_etsy()

        vela.wait_for_shop_to_sync(expected_status='up_to_date', timeout_sec=timeout_sec)

        self.stop_all()

        assert self.db.get_shop_status(2) == 'up_to_date'

    def save_db_dump(self, output_name):
        """ Sanitize DB contents and dump it to SQL file.

        :param output_name: name of SQL file to write the DB dump to
        """
        self.db.truncate_task_queue()
        self.db.set_shop_last_sync_time(2, OLD_SYNC_TIME_STR)
        self.db.set_product_modification_timestamp(OLD_PRODUCT_MODIFICATION_TIMESTAMP)

        sqldump = os.path.join(os.environ['QA_DIR'], 'bin', 'sqldump')
        process = subprocess.run(['sh', '-c', sqldump + ' --data-only'], stdout=subprocess.PIPE)
        assert process.returncode == 0

        readme = """-- README
-- Test data generated by '%s' from Etsy test case '%s'
-- END OF README -- The comments in this README section will be preserved by test data migration script.""" % \
                 (self.test_id, self._used_etsy_testcase)

        sql = readme + process.stdout.decode('utf-8')
        sql = sql.replace('SET row_security = off;\n', '')

        # create truncate tables sql code for all tables and add it to sql
        truncate_tables_sql = '\n'.join(['TRUNCATE %s CASCADE;' % item[0] for item in self.db.get_table_list()])
        sql = re.sub(r'(SET search_path = public, pg_catalog;\n)',
                     '\\1BEGIN TRANSACTION;\n%s\n\n' % truncate_tables_sql,
                     sql)
        sql += 'COMMIT;\n'

        with open(os.path.join(SQL_DATA_PATH, output_name), 'w') as fw:
            fw.write(sql)

    # -------------------------------------------------
    # --- Scripts for generating listings SQL files ---
    # -------------------------------------------------
    def test_generate_listings_02_sql(self):
        etsy_test_case = 'listings_02'
        output_name = 'listings_02.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 6

        self.db.add_user_profile_flag(1, 'syncStatusModalSeen', True)

        self.save_db_dump(output_name)

    def test_generate_listings_03_sql(self):
        etsy_test_case = 'listings_03'
        output_name = 'listings_03.sql'

        self.import_shop(etsy_test_case, timeout_sec=180)

        assert self.db.get_number_of_products(2) == 102

        self.db.add_user_profile_flag(1, 'syncStatusModalSeen', True)

        self.save_db_dump(output_name)

    def test_generate_listings_09_sql(self):
        etsy_test_case = 'listings_09'
        output_name = 'listings_09.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 4

        self.db.add_user_profile_flag(1, 'syncStatusModalSeen', True)

        self.save_db_dump(output_name)

    def test_generate_listings_10_sql(self):
        etsy_test_case = 'listings_10'
        output_name = 'listings_10.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 1

        self.save_db_dump(output_name)

    def test_generate_listings_13_sql(self):
        etsy_test_case = 'listings_51'
        output_name = 'listings_13.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 3

        self.db.add_user_profile_flag(1, 'syncStatusModalSeen', True)

        self.save_db_dump(output_name)

    def test_generate_listings_14_sql(self):
        etsy_test_case = 'listings_14'
        output_name = 'listings_14.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 4

        self.db.add_user_profile_flag(1, 'syncStatusModalSeen', True)

        self.save_db_dump(output_name)

    def test_generate_listings_empty_sql(self):
        etsy_test_case = 'listings_empty'
        output_name = 'listings_empty.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 0

        self.save_db_dump(output_name)

    def test_generate_listings_15_sql(self):
        etsy_test_case = 'listings_15'
        output_name = 'listings_15.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 2

        self.db.add_user_profile_flag(1, 'syncStatusModalSeen', True)

        self.save_db_dump(output_name)

    def test_generate_listings_16_changed_sql(self):
        etsy_test_case = 'listings_16'
        output_name = 'listings_16_changed.sql'

        self.import_shop(etsy_test_case)

        assert self.db.get_number_of_products(2) == 3

        self.db.add_user_profile_flag(1, 'syncStatusModalSeen', True)
        self.db.change_can_write_inventory(True, '100003')

        self.save_db_dump(output_name)
