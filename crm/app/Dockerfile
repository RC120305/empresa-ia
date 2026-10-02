FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js gilberto.js ./
COPY public ./public
# Instruções e base do Gilberto, copiadas de crm/gilberto/ e contexto/ na publicação
COPY conhecimento ./conhecimento
USER node
ENV PORT=8080
CMD ["node", "server.js"]
