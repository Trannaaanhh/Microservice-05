from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('app', '0002_order_saga_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='book_ids',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
