from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
    ('app', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='saga_state',
            field=models.CharField(default='PENDING', max_length=50),
        ),
        migrations.AddField(
            model_name='order',
            name='fail_reason',
            field=models.TextField(blank=True, default=''),
        ),
    ]
