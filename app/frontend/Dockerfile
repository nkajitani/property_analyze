FROM oven/bun:1.1-alpine

WORKDIR /work

COPY package.json bun.lockb* ./
RUN bun install

COPY . .

EXPOSE 3000
RUN bun run build
CMD ["bun", "run", "start"]
