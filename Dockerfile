# Image unique pour la bêta : optimiser une image "standalone" minimale
# n'est pas la priorité tant qu'on tourne en docker-compose local. On
# privilégie ici la lisibilité et la reproductibilité des migrations.
FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Génère le client Prisma (nécessite le schema, pas la base) et construit
# l'app Next.js.
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
