// My Auth System SDK
const MyAuth = {
    // 본인의 Render 서버 주소로 자동 설정
    SERVER_URL: "https://my-auth-db.onrender.com",

    // 회원가입 함수
    async register(id, pw) {
        try {
            const res = await fetch(`${this.SERVER_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, pw })
            });
            return await res.text();
        } catch (e) {
            return "서버 연결 실패";
        }
    },

    // 로그인 함수
    async login(id, pw) {
        try {
            const res = await fetch(`${this.SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, pw })
            });
            return await res.text();
        } catch (e) {
            return "서버 연결 실패";
        }
    }
};
