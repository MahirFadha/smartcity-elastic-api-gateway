FROM node:20-alpine

WORKDIR /app

# Copy server code directly (no external dependencies needed, uses native node:http)
COPY server.js .

EXPOSE 3000

ENV PORT=3000
ENV SERVICE_NAME="Service Pajak"
ENV ARTIFICIAL_DELAY_MS=100

CMD ["node", "server.js"]
