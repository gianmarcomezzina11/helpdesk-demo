# Dockerfile per MCP Jitsi + MeshCentral su Azure App Service Container
FROM node:18-alpine

# Installa dipendenze di sistema per MeshCentral e npm
RUN apk add --no-cache \
    npm \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

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
