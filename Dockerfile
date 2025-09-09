# ---- build the React/Vite app ----
FROM node:20-slim AS build
WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm ci

# copy source and build with vite
COPY . .
RUN node ./node_modules/vite/bin/vite.js build

# ---- serve it with nginx and proxy /api ----
FROM nginx:1.25-alpine

# custom nginx config (for SPA + API proxy)
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

