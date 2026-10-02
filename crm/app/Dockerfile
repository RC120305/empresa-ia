FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js gilberto.js silbeck.js ./
COPY public ./public
# Instruções e base do Gilberto, copiadas de crm/gilberto/ e contexto/ na publicação
COPY conhecimento ./conhecimento
# simulador FICTÍCIO do Silbeck (modo de testes, SILBECK_MODO=simulador); copiado na publicação
COPY simulador-silbeck ./simulador-silbeck
USER node
ENV PORT=8080
CMD ["node", "server.js"]
