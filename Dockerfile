# Dockerfile per MCP Jitsi + MeshCentral su Azure App Service Container
FROM node:18-slim

# Installa dipendenze di sistema per MeshCentral
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    && rm -rf /var/lib/apt/lists/*

# Crea directory app
WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm ci --only=production

# Copia il resto del codice
COPY . .

# Build TypeScript
RUN npm run build

# Crea directory per MeshCentral
RUN mkdir -p meshcentral-data meshcentral-files

# Espone porta (Azure la sovrascrive con PORT env var)
EXPOSE 8080

# Variabile d'ambiente per produzione
ENV NODE_ENV=production

# Startup command
CMD ["npm", "start"]
