# Generated by Django 4.2.13 on 2024-07-25 13:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profilemodel',
            name='avatar',
            field=models.BinaryField(blank=True, null=True),
        ),
    ]
