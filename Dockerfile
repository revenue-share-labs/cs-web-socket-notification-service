FROM node:18-alpine as base

WORKDIR /opt/app

RUN addgroup -g 1001 appuser && \
    adduser -D -S -G appuser appuser && \
    chown -R appuser:appuser /opt/app

####################

FROM base as builder

USER appuser

COPY package.json package-lock.json .npmrc ./

RUN npm i

ENV NODE_ENV=production

COPY . .

RUN npm run build && \
    rm -rf node_modules && \
    npm i -p

####################

FROM base

COPY --from=builder --chown=appuser:appuser /opt/app/nest-cli.json /opt/app/package.json /opt/app/
COPY --from=builder --chown=appuser:appuser /opt/app/node_modules /opt/app/node_modules
COPY --from=builder --chown=appuser:appuser /opt/app/dist/ /opt/app/dist

USER appuser

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV:-production}

ENTRYPOINT npm run start:prod
