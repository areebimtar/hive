from modules.postgres import Postgres
from enum import Enum
from typing import List


class ShopInfoCols(Enum):
    LAST_SYNC_TIMESTAMP = 'last_sync_timestamp'
    SYNC_STATUS = 'sync_status'


class ShopSyncStatus(Enum):
    SYNC = 'sync'
    UP_TO_DATE = 'up_to_date'


class HiveDatabase(object):
    def __init__(self, connection_string):
        self.db = Postgres.get_db(connection_string)

    def find_etsy_products(self, shop_id, title_like):
        sql = "SELECT id, title FROM product_properties WHERE shop_id = %s AND title LIKE %s order by id"
        rows = self.db.select(sql, [shop_id, title_like])
        return rows

    def find_shopify_products(self, shop_id, title_like):
        sql = "SELECT id, title FROM shopify_products WHERE shop_id = %s AND title LIKE %s order by id"
        rows = self.db.select(sql, [shop_id, title_like])
        return rows

    def get_shop_id(self, shop_name):
        sql = "SELECT id FROM shops WHERE name = %s"
        rows = self.db.select(sql, [shop_name])
        assert len(rows) == 1, "DB has not returned 1 row for shop id - incorrect SHOP_NAME value in configuration?"
        return rows[0][0]

    def get_shop_domain(self, shop_id):
        sql = "SELECT domain FROM shops WHERE id = %s"
        rows = self.db.select(sql, [shop_id])
        assert len(rows) == 1, "DB has not returned 1 row for shop domain"
        return rows[0][0]

    def get_shop_tokens(self, shop_id):
        sql = "SELECT oauth_token, oauth_token_secret FROM accounts a INNER JOIN shops s ON s.account_id=a.id WHERE s.id = %s"
        rows = self.db.select(sql, [shop_id])
        assert len(rows) == 1, "DB has not returned 1 row for shop tokens"
        return rows[0]

    def get_shop_status(self, shop_id):
        sql = "SELECT sync_status FROM shops WHERE id = %s"
        rows = self.db.select(sql, [shop_id])
        assert len(rows) == 1, "DB has not returned 1 row for shop status"
        return rows[0][0]

    def get_shop_last_sync_time(self, shop_id):
        sql = "SELECT last_sync_timestamp FROM shops WHERE id = %s"
        rows = self.db.select(sql, [shop_id])
        assert len(rows) == 1, "DB has not returned 1 row for shop status"
        return rows[0][0]

    def get_shop_info(self, shop_id: int, columns: List[ShopInfoCols]=None):
        assert columns is not None, 'No columns provided'
        cols = [column.value for column in columns]
        sql = "SELECT " + ", ".join(cols) + " FROM shops WHERE id = %s"
        rows = self.db.select(sql, [shop_id])
        assert len(rows) == 1, "DB has not returned 1 row for shop info"
        return rows[0]

    def set_shop_last_sync_time(self, shop_id, last_sync_time):
        sql = "UPDATE shops SET last_sync_timestamp = %s WHERE id = %s"
        self.db.run(sql, [last_sync_time, shop_id])

    def set_product_modification_timestamp(self, hive_last_modified_tsz, product_id=None):
        if product_id:
            sql = "UPDATE product_properties SET _hive_last_modified_tsz = %s WHERE id = %s"
            self.db.run(sql, [hive_last_modified_tsz, product_id])
        else:
            sql = "UPDATE product_properties SET _hive_last_modified_tsz = %s"
            self.db.run(sql, [hive_last_modified_tsz])

    def change_section_etsy_id(self, new_etsy_section_id, section_name):
        sql = "UPDATE shop_sections SET section_id = %s WHERE value = %s"
        self.db.run(sql, [new_etsy_section_id, section_name])

    def change_can_write_inventory(self, new_value, etsy_listing_id: str):
        sql = "UPDATE product_properties SET can_write_inventory = %s WHERE listing_id = %s"
        self.db.run(sql, [new_value, etsy_listing_id])

    def get_user_id(self, username):
        sql = "SELECT id FROM hive_auth.users WHERE email = %s"
        rows = self.db.select(sql, [username])
        assert len(rows) == 1, "DB has not returned 1 row for user ID"
        return rows[0][0]

    def get_user_db_name(self, username):
        sql = "SELECT db FROM hive_auth.users WHERE email = %s"
        rows = self.db.select(sql, [username])
        assert len(rows) == 1, "DB has not returned 1 row for user DB"
        return rows[0][0]

    def get_can_write_inventory(self, etsy_listing_id: str=None):
        if etsy_listing_id:
            sql = "SELECT can_write_inventory FROM product_properties WHERE listing_id = %s"
            rows = self.db.select(sql, [etsy_listing_id])
            assert len(rows) == 1, "DB has not returned 1 row for user ID"
            return rows[0][0]
        else:
            sql = "SELECT listing_id, can_write_inventory FROM product_properties ORDER BY listing_id"
            rows = self.db.select(sql)
            return rows

    def get_company_id(self, username):
        sql = "SELECT company_id FROM hive_auth.users WHERE email = %s"
        rows = self.db.select(sql, [username])
        assert len(rows) == 1, "DB has not returned 1 row for company ID"
        return rows[0][0]

    def get_number_of_products(self, shop_id):
        sql = "SELECT count(id) from product_properties where shop_id=%s"
        rows = self.db.select(sql, [shop_id])
        assert len(rows) == 1, "DB has not returned 1 row for number of products"
        return rows[0][0]

    def reset_user_profile_flags(self, user_id, flags):
        if flags:
            sql = "UPDATE user_profiles SET property_value=FALSE WHERE user_id = %s and property_name = ANY(%s);"
            self.db.run(sql, [user_id, flags])

    def add_user_profile_flag(self, user_id, flag_name, value):
        sql = "INSERT INTO user_profiles (user_id, property_name, property_value) VALUES (%s, %s, %s);"
        self.db.run(sql, [user_id, flag_name, value])

    def truncate_task_queue(self):
        sql = "TRUNCATE task_queue; SELECT pg_catalog.setval('task_queue_id_seq', 1, false);"
        self.db.run(sql)

    def get_table_list(self):
        sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        rows = self.db.select(sql)
        return rows
