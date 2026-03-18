import json
import os
import time
import uuid

import pika

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/%2F')
EVENT_EXCHANGE = 'bookstore.events'


def _connect():
    params = pika.URLParameters(RABBITMQ_URL)
    return pika.BlockingConnection(params)


def rpc_call(queue_name, payload, timeout=8):
    connection = _connect()
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)

    result = channel.queue_declare(queue='', exclusive=True, auto_delete=True)
    callback_queue = result.method.queue

    correlation_id = str(uuid.uuid4())
    response_holder = {'body': None}

    def on_response(ch, method, props, body):
        if props.correlation_id == correlation_id:
            try:
                response_holder['body'] = json.loads(body.decode('utf-8'))
            except Exception:
                response_holder['body'] = {'ok': False, 'error': 'invalid response'}

    channel.basic_consume(queue=callback_queue, on_message_callback=on_response, auto_ack=True)
    channel.basic_publish(
        exchange='',
        routing_key=queue_name,
        properties=pika.BasicProperties(
            reply_to=callback_queue,
            correlation_id=correlation_id,
            delivery_mode=2,
            content_type='application/json',
        ),
        body=json.dumps(payload),
    )

    deadline = time.time() + timeout
    while time.time() < deadline and response_holder['body'] is None:
        connection.process_data_events(time_limit=1)

    connection.close()
    return response_holder['body']


def publish_event(event_type, payload):
    connection = _connect()
    channel = connection.channel()
    channel.exchange_declare(exchange=EVENT_EXCHANGE, exchange_type='fanout', durable=True)
    envelope = {'type': event_type, 'payload': payload, 'ts': int(time.time())}
    channel.basic_publish(
        exchange=EVENT_EXCHANGE,
        routing_key='',
        properties=pika.BasicProperties(delivery_mode=2, content_type='application/json'),
        body=json.dumps(envelope),
    )
    connection.close()
