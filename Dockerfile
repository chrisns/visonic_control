FROM node:alpine

RUN mkdir /app
WORKDIR /app
COPY package.json .
RUN npm install --prod
COPY . .

CMD npm start

# TODO: add healthcheck