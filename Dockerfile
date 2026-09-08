FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY lib ./lib
COPY api ./api
COPY server-http.js ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server-http.js"]
