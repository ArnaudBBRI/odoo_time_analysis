FROM node:22-alpine

WORKDIR /app

COPY . .

ENV HOST=0.0.0.0
ENV PORT=8765

EXPOSE 8765

CMD ["node", "server.js"]
