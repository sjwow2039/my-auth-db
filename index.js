const { Octokit } = require("@octokit/rest");
const express = require('express');
const bcrypt = require('bcryptjs');

const app = express();

// [추가] CORS 에러 해결을 위한 설정 (로컬 HTML에서 접속 허용)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    // 브라우저가 보내는 사전 요청(OPTIONS) 처리
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

// 환경 변수 설정
const octokit = new Octokit({ auth: process.env.GH_TOKEN });
const OWNER = process.env.GH_OWNER; 
const REPO = process.env.GH_REPO;   
const PATH = "users.json";

// 데이터 가져오기 공통 함수
async function getGitHubData() {
    try {
        const { data } = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: PATH,
        });
        const content = Buffer.from(data.content, 'base64').toString();
        return { users: JSON.parse(content), sha: data.sha };
    } catch (error) {
        return { users: [], sha: null };
    }
}

// 회원가입
app.post('/register', async (req, res) => {
    try {
        const { id, pw } = req.body;
        if (!id || !pw) return res.status(400).send("ID와 PW를 입력하세요.");

        const { users, sha } = await getGitHubData();
        if (users.find(u => u.id === id)) return res.status(400).send("이미 있는 ID입니다.");

        const hashedPw = await bcrypt.hash(pw, 10);
        users.push({ id, pw: hashedPw });

        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER, repo: REPO, path: PATH,
            message: `Register: ${id}`,
            content: Buffer.from(JSON.stringify(users, null, 2)).toString('base64'),
            sha: sha
        });
        res.status(201).send("회원가입 성공!");
    } catch (err) {
        res.status(500).send("서버 저장 오류");
    }
});

// 로그인
app.post('/login', async (req, res) => {
    try {
        const { id, pw } = req.body;
        const { users } = await getGitHubData();
        const user = users.find(u => u.id === id);
        
        if (user && await bcrypt.compare(pw, user.pw)) {
            res.send("로그인 성공!");
        } else {
            res.status(401).send("정보 불일치!");
        }
    } catch (err) {
        res.status(500).send("로그인 처리 중 오류");
    }
});
app.get('/', (req, res) => res.send("인증 서버 정상 작동 중!"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
