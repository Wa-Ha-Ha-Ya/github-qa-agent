import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from src.tools.docs_tools import fetch_repo_docs, search_repo_docs
from src.chains.qa_chain import build_qa_chain
import re

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatMessage(BaseModel):
    type: str
    content: str


class ChatRequest(BaseModel):
    input: Dict[str, List[ChatMessage]]
    config: Optional[Dict[str, Any]] = None


# 简单内存缓存：已拉取的仓库集合（生产环境可用 Redis）
repo_indexed = set()


def extract_owner_repo(text: str):
    """从文本中提取 GitHub 仓库 owner/repo"""
    match = re.search(r'github\.com/([^/]+)/([^/\s]+)', text)
    if match:
        return match.group(1), match.group(2)
    return None, None


async def generate_response(thread_id: str, user_msg: str):
    # 1. 尝试提取仓库
    owner, repo = extract_owner_repo(user_msg)
    if owner and repo:
        repo_key = f"{owner}/{repo}"
        if repo_key not in repo_indexed:
            # 先发送一个状态提示
            yield f"data: {json.dumps({'type': 'text', 'content': '📥 正在分析仓库文档...'})}\n\n"
            result = fetch_repo_docs(owner, repo)
            repo_indexed.add(repo_key)
            yield f"data: {json.dumps({'type': 'text', 'content': f'{result}'})}\n\n"

    # 2. 如果没有仓库上下文，直接让 LLM 回答（会提醒用户提供链接）
    if not owner:
        chain = build_qa_chain()
        async for chunk in chain.astream({"context": "", "question": user_msg}):
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    # 3. 检索文档
    docs = search_repo_docs(user_msg, owner, repo)
    context = "\n\n".join([d.page_content for d in docs])

    # 4. 构建链并流式生成回答
    chain = build_qa_chain()
    async for chunk in chain.astream({"context": context, "question": user_msg}):
        yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    messages = req.input.get("messages", [])
    if not messages:
        return {"error": "no messages"}
    user_msg = messages[-1].content
    thread_id = req.config.get("configurable", {}).get("thread_id", "default")
    return StreamingResponse(generate_response(thread_id, user_msg), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)