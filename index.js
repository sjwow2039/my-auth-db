const { Octokit } = require("@octokit/rest");
const express = require('express');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json()); // JSON 요청 본문을 해석하기 위해 필요합니다.

// 1. 환경 변수 설정 (나중에 Render 대시보드에서 입력할 값들입니다)
const octokit = new Octokit({ auth: process.env.GH_TOKEN });
const OWNER = process.env.GH_OWNER; 
const REPO = process.env.GH_REPO;   
const PATH = "users.json";

// GitHub에서 현재 저장된 유저 목록을 가져오는 공통 함수
async function getGitHubData() {
    try {
        const { data } = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: PATH,
        });
        // GitHub API는 내용을 base64로 인코딩해서 보내므로 해독이 필요합니다.
        const content = Buffer.from(data.content, 'base64').toString();
        return { users: JSON.parse(content), sha: data.sha };
    } catch (error) {
        // 만약 파일이 없으면 빈 배열을 반환합니다.
        console.log("파일을 찾을 수 없어 빈 목록을 반환합니다.");
        return { users: [], sha: null };
    }
}

// [POST] /register - 회원가입 API
app.post('/register', async (req, res) => {
    try {
        const { id, pw } = req.body;
        if (!id || !pw) return res.status(400).send("ID와 PW를 모두 입력해주세요.");

        const { users, sha } = await getGitHubData();

        // 중복 아이디 확인
        if (users.find(user => user.id === id)) {
            return res.status(400).send("이미 존재하는 아이디입니다.");
        }

        // 비밀번호 암호화 (보안 필수!)
        const hashedPw = await bcrypt.hash(pw, 10);
        users.push({ id, pw: hashedPw });

        // GitHub에 업데이트된 목록 저장
        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: PATH,
            message: `Register new user: ${id}`,
            content: Buffer.from(JSON.stringify(users, null, 2)).toString('base64'),
            sha: sha // 파일 수정을 위해 기존 파일의 고유 ID(sha) 전달
        });

        res.status(201).send("회원가입 성공! 데이터가 GitHub에 저장되었습니다.");
    } catch (err) {
        console.error(err);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// [POST] /login - 로그인 API
app.post('/login', async (req, res) => {
    try {
        const { id, pw } = req.body;
        const { users } = await getGitHubData();

        const user = users.find(u => u.id === id);
        
        // 유저가 존재하고, 암호화된 비밀번호가 일치하는지 확인
        if (user && await bcrypt.compare(pw, user.pw)) {
            res.send("로그인에 성공하였습니다!");
        } else {
            res.status(401).send("아이디 또는 비밀번호가 일치하지 않습니다.");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("서버 오류 발생");
    }
});

// 메인 페이지 접속 확인용
app.get('/', (req, res) => {
    res.send("인증 서버가 정상 작동 중입니다.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
