# Use official Python image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including nginx and uwsgi
RUN apt-get update && apt-get install -y \
    build-essential \
    nginx \
    uwsgi \
    uwsgi-plugin-python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# Copy nginx configuration
COPY deploy/backend-nginx.conf /etc/nginx/sites-available/default

# Create uwsgi configuration
RUN echo "[uwsgi]\n\
module = app:app\n\
master = true\n\
processes = 4\n\
threads = 2\n\
socket = /tmp/uwsgi.sock\n\
chmod-socket = 664\n\
vacuum = true\n\
die-on-term = true" > /etc/uwsgi/apps-enabled/app.ini

# Expose port for nginx
EXPOSE 80

# Start nginx and uwsgi
CMD ["sh", "-c", "uwsgi --ini /etc/uwsgi/apps-enabled/app.ini & nginx -g 'daemon off;'"]
