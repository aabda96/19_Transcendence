FROM python:3.9

RUN python -m venv /myenv

RUN /myenv/bin/pip install --upgrade pip
COPY requirements.txt .
RUN /myenv/bin/pip install -r requirements.txt
RUN /myenv/bin/pip install django-redis

#Peut-etre pas besoin
RUN apt-get update && apt-get install -y iputils-ping postgresql-client 

WORKDIR /app

COPY . .

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
