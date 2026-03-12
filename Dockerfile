FROM node:18-slim

# Install system dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libx11-6 \
    libxss1 \
    libappindicator3-1 \
    libindicator7 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "start"]
