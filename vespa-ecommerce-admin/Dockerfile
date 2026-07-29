FROM node:22.14-alpine
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

USER node
CMD ["npm", "run", "dev"]