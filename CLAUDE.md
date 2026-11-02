# Todo 3티어 앱 (개인 연습 프로젝트)

## 기술 스펙 (반드시 지킬 것, 다른 기술로 바꾸지 말 것)
- web/ : React (Vite로 생성). 빌드 결과는 정적 파일로 제공
- api/ : Node.js + Express
- DB   : PostgreSQL

## 최소 기능
- 할 일 목록 보기, 추가, 완료 표시, 삭제
- 새로고침하거나 재시작해도 데이터가 남아 있어야 함

## API
- GET    /api/todos        목록
- POST   /api/todos        추가
- PATCH  /api/todos/:id    완료 표시
- DELETE /api/todos/:id    삭제

## 규칙
- DB 주소·계정·비밀번호는 코드에 쓰지 말고 환경 변수로 받기
- .env는 Git에 올리지 않기 (.gitignore에 추가)
- 작업은 단계별로 하나씩, 각 단계가 뭘 하는지 설명하면서 진행