FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run Chainlit
CMD ["chainlit", "run", "app.py", "-h", "0.0.0.0", "-p", "8000"]


