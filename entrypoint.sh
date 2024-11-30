#!/bin/sh

/myenv/bin/python django/manage.py makemigrations
/myenv/bin/python django/manage.py migrate

exec /myenv/bin/python django/manage.py runserver 0.0.0.0:8000
