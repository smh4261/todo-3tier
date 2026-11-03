# Todo 3티어 앱 (개인 연습 프로젝트)

## 기술 스펙 (반드시 지킬 것, 다른 기술로 바꾸지 말 것)
- web/ : React (Vite로 생성). 빌드 결과는 정적 파일로 제공
- api/ : Node.js + Express
- DB   : PostgreSQL

## 최소 기능
- 할 일 목록 보기, 추가, 완료 표시, 삭제
- 날짜를 골라 그날의 할 일, 시간대별 일정, 메모 보기·수정
- 새로고침하거나 재시작해도 데이터가 남아 있어야 함

## API
- GET    /api/todos        목록 (?date=YYYY-MM-DD로 날짜 지정)
- POST   /api/todos        추가 (title, date)
- PATCH  /api/todos/:id    완료 표시
- DELETE /api/todos/:id    삭제
- GET    /api/days/:date   날짜별 일정·메모
- PUT    /api/days/:date   날짜별 일정·메모 저장

## 규칙
- DB 주소·계정·비밀번호는 코드에 쓰지 말고 환경 변수로 받기
- .env는 Git에 올리지 않기 (.gitignore에 추가)
- 작업은 단계별로 하나씩, 각 단계가 뭘 하는지 설명하면서 진행