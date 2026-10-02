FROM node:22-alpine
WORKDIR /app
COPY server.js .
COPY public ./public
USER node
ENV PORT=8080
CMD ["node", "server.js"]
