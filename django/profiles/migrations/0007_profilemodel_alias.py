# Generated by Django 5.0.6 on 2024-08-22 08:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0006_profilemodel_avatar'),
    ]

    operations = [
        migrations.AddField(
            model_name='profilemodel',
            name='alias',
            field=models.CharField(blank=True, default=None, max_length=150, null=True),
        ),
    ]
