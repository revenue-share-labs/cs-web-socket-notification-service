# WebSocket Notification Service

## Description

* [Tech docs](https://xsolla.atlassian.net/wiki/spaces/EXLP/pages/21626095753/Solution+Architecture+Document#4.3.2.2-Real-time-user-notifications)

Service that handle users' WebSocket connections and forwards to corresponding users
messages from Kafka's `user-notifications` topic. Leverages Redis Pub/Sub mechanism
to make sure that user would receive his message even if he connected to service
instance that listen for another topic's partition.

## How to use

* use Socket.IO client (npm package: `socket.io-client`) to connect to service
* pass JWT token to auth params
* listen to `notification` event for new user messages

### Attention

* if notification occurs when no user clients are connected then it drops
* when multiple clients for single user are connected then every client would
  receive a new message

## External dependencies

* Authentication Service: to secure communication channel and to ensure that user would
  receive only notification that belongs to him
* User Service: to check authentication
* Kafka: to listen `user-notifications` topic for new user messages
* Redis: to be able to deliver user message even if he connected to another service
  instance

## How to run in development

* run `authentication-service` in development mode with MongoDB
* run `user-service` in development mode
* run Kafka via docker-compose from `contract-service` repo
* run Redis via docker-compose from this repo
* start an app with `npm run strart:dev` (in watch mode)

## How to run in production

* build docker image
* run docker image with environments (container uses `npm run start:prod`)

## How to run tests

```shell
# run unit tests (to filter add any part of filepath)
npm run test
# run unit tests in watch mode
npm run test:watch
# run unit tests with coverage
npm run test:cov
# run unit tests with debug/inspect capabilities
npm run test:debug

# run integration (e2e) tests (a way longer to complete)
npm run test:e2e
```
