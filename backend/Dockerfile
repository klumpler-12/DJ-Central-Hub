FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
