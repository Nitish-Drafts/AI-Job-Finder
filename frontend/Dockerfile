# Stage 1: Build static React resources
FROM node:20-alpine AS build-stage

WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve static resources with Nginx
FROM nginx:stable-alpine AS production-stage

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled resources from build-stage
COPY --from=build-stage /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
