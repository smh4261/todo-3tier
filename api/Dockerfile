FROM node:22-alpine
WORKDIR /app

# 의존성만 먼저 복사해 소스가 바뀌어도 설치 단계는 캐시를 쓴다.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY db.js server.js ./

# root가 아닌 일반 사용자로 실행한다.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
