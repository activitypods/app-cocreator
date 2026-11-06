# Build stage: installs the dependencies and runs the Vite build. Only the resulting
# static files make it into the final image.
FROM node:22-alpine AS build

ARG VITE_APP_NAME
ARG VITE_APP_DESCRIPTION
ARG VITE_APP_LANG
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_CLIENT_ID
ARG VITE_SHAPE_REPOSITORY_URL
ARG VITE_POD_PROVIDER_BASE_URL

# The build runs on the Coolify server, next to Fuseki
ENV NODE_OPTIONS=--max-old-space-size=1536

WORKDIR /app/frontend

RUN apk add --update --no-cache yarn

ADD frontend/package.json /app/frontend
ADD frontend/yarn.lock /app/frontend
RUN yarn install && yarn cache clean

ADD frontend /app/frontend

RUN yarn run build

FROM node:22-alpine

RUN yarn global add serve

WORKDIR /app/frontend

COPY --from=build /app/frontend/dist ./dist

EXPOSE 4000

CMD ["serve", "-s", "dist", "-l", "4000"]
