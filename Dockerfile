FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY docs/openapi.yaml ./docs/openapi.yaml

EXPOSE 3000
USER node
CMD ["npm", "start"]
