import os
import pika
import json
from subprocess import call

BIN_DIR = os.path.dirname(__file__) + '/../bin'


def setup_rabbit():
    """ Setup everything for rabbit - vhost, queues, sync token, ...
    """
    if call([os.path.join(BIN_DIR, 'default', 'setup-rabbitmq')]) != 0:
        raise Exception("Error: setup-rabbitmq failed.")


class Rabbit(object):
    """ Helper class for communication with RabbitMQ
    """
    def __init__(self):
        self.host = os.environ['QA_RABBIT_HOST']
        user = os.environ['QA_RABBIT_USER']
        password = os.environ['QA_RABBIT_PASSWORD']
        self.virtual_host = os.environ['QA_RABBIT_VHOST']

        self.credentials = pika.credentials.PlainCredentials(user, password)
        self.connection = None

    def _connect(self):
        """ Connect to RabbitMQ host
        """
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=self.host,
                                      virtual_host=self.virtual_host,
                                      credentials=self.credentials,
                                      socket_timeout=2,
                                      connection_attempts=3)
        )

    def _disconnect(self):
        """ Disonnect from RabbitMQ host
        """
        if self.connection:
            self.connection.close()

    def publish_to_queue(self, queue_name: str, body: dict):
        """ Send message to RabbitMQ queue

        :param queue_name: Name of the queue to publish to
        :param body: Message body
        """

        self._connect()

        channel = self.connection.channel()
        channel.basic_publish(exchange='',
                              routing_key=queue_name,
                              body=json.dumps(body))

        self._disconnect()

    def publish_to_exchange(self, exchange_name: str, routing_key: str, body: dict):
        """ Send message to RabbitMQ queue

        :param exchange_name: Name of the exchange to publish to
        :param body: Message body
        """

        self._connect()

        channel = self.connection.channel()
        channel.basic_publish(exchange=exchange_name,
                              routing_key=routing_key,
                              body=json.dumps(body))

        self._disconnect()
