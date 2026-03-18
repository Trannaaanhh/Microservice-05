import json
import os
import threading
import time

import pika
from django.db import close_old_connections

from .models import Shipment

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/%2F')
_SHIPPING_FAIL_IDS = {x.strip() for x in os.getenv('SHIPPING_FAIL_IDS', '').split(',') if x.strip()}
_started = False


def _should_fail(payload):
    order_id = str(payload.get('order_id'))
    return bool(payload.get('simulate_failure')) or (order_id in _SHIPPING_FAIL_IDS)


def _reply(ch, props, body):
    if props.reply_to:
        ch.basic_publish(
            exchange='',
            routing_key=props.reply_to,
            properties=pika.BasicProperties(correlation_id=props.correlation_id, content_type='application/json'),
            body=json.dumps(body),
        )


def _reserve_shipping(ch, method, props, body):
    close_old_connections()
    try:
        payload = json.loads(body.decode('utf-8'))
        order_id = int(payload.get('order_id'))
    except Exception:
        _reply(ch, props, {'ok': False, 'error': 'invalid payload'})
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    if _should_fail(payload):
        _reply(ch, props, {'ok': False, 'error': 'simulated shipping reservation failure'})
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    shipment = Shipment.objects.filter(order_id=order_id).first()
    if shipment is None:
        shipment = Shipment.objects.create(order_id=order_id, status='RESERVED')
    else:
        shipment.status = 'RESERVED'
        shipment.save(update_fields=['status'])

    _reply(ch, props, {'ok': True, 'shipment_id': shipment.pk, 'status': shipment.status})
    ch.basic_ack(delivery_tag=method.delivery_tag)


def _release_shipping(ch, method, props, body):
    close_old_connections()
    try:
        payload = json.loads(body.decode('utf-8'))
        order_id = int(payload.get('order_id'))
    except Exception:
        _reply(ch, props, {'ok': False, 'error': 'invalid payload'})
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    shipment = Shipment.objects.filter(order_id=order_id).first()
    if shipment is None:
        shipment = Shipment.objects.create(order_id=order_id, status='RELEASED')
    else:
        shipment.status = 'RELEASED'
        shipment.save(update_fields=['status'])

    _reply(ch, props, {'ok': True, 'shipment_id': shipment.pk, 'status': shipment.status})
    ch.basic_ack(delivery_tag=method.delivery_tag)


def _consume_loop():
    while True:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            channel = connection.channel()
            channel.queue_declare(queue='shipping.reserve', durable=True)
            channel.queue_declare(queue='shipping.release', durable=True)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue='shipping.reserve', on_message_callback=_reserve_shipping)
            channel.basic_consume(queue='shipping.release', on_message_callback=_release_shipping)
            channel.start_consuming()
        except Exception:
            time.sleep(2)


def start_shipping_consumer():
    global _started
    if _started:
        return
    _started = True
    thread = threading.Thread(target=_consume_loop, daemon=True)
    thread.start()
