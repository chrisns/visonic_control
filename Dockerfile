FROM node:alpine

RUN mkdir /app
WORKDIR /app
COPY package.json .
RUN npm install -s --prod
COPY . .

CMD npm start

HEALTHCHECK --interval=5m --timeout=3s \
  CMD wget -q localhost:3000 -O /dev/null || exit 1