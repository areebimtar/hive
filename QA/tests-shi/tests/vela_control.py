import operator

import arrow

from modules.rabbit import Rabbit
from tests.base import run_sql
from modules.testing import wait_for_assert

ETSY_CHANNEL_ID = 1
SHOPIFY_CHANNEL_ID = 2


def trigger_etsy_shop_sync(company_id, shop_id, db_name='db1'):
    """ Triggers immediate synchronization of the shop using Rabbit.
    Sends syncShop task to manager.

    :param company_id: company ID of the user
    :param shop_id: ID of the shop
    :param channel_id: channel ID of the shop
    """

    message = {
        'companyId': str(company_id),
        'channelId': str(ETSY_CHANNEL_ID),
        'operation': 'syncShop',
        'operationData': str(shop_id)
    }

    rabbit = Rabbit()
    rabbit.publish_to_queue('%s.manager-tasks' % db_name, message)


def trigger_shopify_shop_sync(user_id, shop_id):
    msg_type = 'shopify.syncShop'
    message = {
        'headers': {
            'type': msg_type,
            'userId': str(user_id),
            'shopId': str(shop_id)
        },
        'body': {
            'triggeredByUser': False
        }
    }

    rabbit = Rabbit()
    rabbit.publish_to_exchange('commands', msg_type, message)


def get_shop_last_sync_time() -> arrow.Arrow:
    """ Returns last sync time of the shop under test

    :return: timestamp as an Arrow object
    """
    data = run_sql('HIVE', 'select_shop_last_sync', True)
    return arrow.get(data[0][2])


def wait_for_shop_to_sync(last_sync_time: arrow.Arrow=None, expected_status: str=None, timeout_sec: int=30):
    """ Waits for shop under test to sync, either according to shop status or according to last sync timestamp.

    :param last_sync_time: timestamp of previous sync of the shop, as an Arrow object
    :param expected_status: expected end status of the shop
    :param timeout_sec: timeout for the wait operation
    """
    assert last_sync_time or expected_status, 'Choose at least one parameter'

    # if we are importing a shop, should might not have a record yet in the shops table, wait for it
    wait_for_assert(1, lambda: len(run_sql('HIVE', 'select_shop_status', True)))

    if last_sync_time:
        wait_for_assert(last_sync_time,
                        get_shop_last_sync_time,
                        oper=operator.lt,
                        delay_sec=1,
                        retries=timeout_sec,
                        message='Shop not synced')

    if expected_status:
        expected_db_shop_status = [expected_status, 'f', '']
        wait_for_assert(expected_db_shop_status, lambda: run_sql('HIVE', 'select_shop_status', True)[0][1:],
                        "Shop sync not finished", delay_sec=1, retries=timeout_sec)
