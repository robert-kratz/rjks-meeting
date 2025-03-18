# Basis-Image
FROM node:20-alpine AS builder

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Installiere benötigte Abhängigkeiten für Mediasoup
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    make \
    gcc \
    g++ \
    libtool \
    autoconf \
    automake \
    nasm \
    linux-headers \
    curl \
    bash \
    cmake \
    git \
    musl-dev

# Kopiere die package.json und package-lock.json für das Dependency Caching
COPY package.json package-lock.json ./

# Installiere die Abhängigkeiten
RUN npm install

# Kopiere den restlichen Code
COPY . .

# Baue die Anwendung
RUN npm run build

# Production-Image
FROM node:20-alpine

WORKDIR /app

# Kopiere das gebaute Projekt aus dem vorherigen Schritt
COPY --from=builder /app ./

# Setze die Startanweisung
CMD ["npm", "run", "start"]