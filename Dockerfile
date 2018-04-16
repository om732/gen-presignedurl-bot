FROM node:8-alpine

WORKDIR /app

RUN npm install pm2 -g \
    && chown -R node:node /app

COPY . /app

USER node

RUN npm install

CMD ["pm2-runtime", "process.yml"]
