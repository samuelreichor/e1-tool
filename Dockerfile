FROM node:22-alpine AS base
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/.output .output
COPY --from=build /app/server/db/migrations server/db/migrations
COPY --from=build /app/drizzle.config.ts .
COPY --from=build /app/server/db/schema.ts server/db/schema.ts
RUN echo '{"type":"module","private":true}' > package.json && npm install drizzle-kit drizzle-orm postgres
COPY start.sh .
RUN chmod +x start.sh
EXPOSE 3000
CMD ["./start.sh"]
