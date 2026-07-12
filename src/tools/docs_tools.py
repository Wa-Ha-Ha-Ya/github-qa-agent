import os
import requests
from typing import List

from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from openai import api_key, vector_stores
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from langchain_core.documents import Document
from requests import check_compatibility

load_dotenv()

# 从环境变量读取配置
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
OLLAMA_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

# 全局 embedding 实例（本地 Ollama）
embeddings = OllamaEmbeddings(model=OLLAMA_MODEL)

# 全局 Qdrant 客户端（复用连接）
client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    cloud_inference= True,
    check_compatibility=False,
    timeout=120
)

# # Qdrant Cloud
# vector_store = QdrantVectorStore.from_existing_collection(
#     embedding=embeddings,
#     collection_name="github_qa_agent",
#     url = QDRANT_URL
# )

# 向量维度（根据模型而定，nomic-embed-text 是 768，可通过 API 查询或直接设定）
# 简单处理：先创建一个临时 embedding 获取维度，或写死 768
VECTOR_SIZE = 768

def _collection_name(owner: str, repo: str) -> str:
    """生成合法的 collection 名称，只包含小写字母、数字和连字符"""
    return f"{owner}_{repo}".lower().replace("/", "_").replace(".", "_")

def fetch_repo_docs(owner: str, repo: str, branch: str = "main") -> str:
    """拉取指定仓库的文档并存入 Qdrant"""
    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"

    # 获取文件树
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        return f"获取文件树失败: {resp.status_code}"

    tree = resp.json().get("tree", [])
    # 筛选文档文件
    doc_paths = [
        item["path"] for item in tree
        if item["path"].endswith((".md", ".rst", ".txt"))
        and ("/" not in item["path"] or item["path"].startswith("docs/"))
    ]
    if not doc_paths:
        return "未找到任何文档文件"

    # 下载文件内容
    docs_data = []
    for path in doc_paths[:30]:  # 限制数量
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
        file_resp = requests.get(raw_url, headers=headers)
        if file_resp.status_code == 200:
            docs_data.append({"path": path, "content": file_resp.text})

    if not docs_data:
        return "所有文档下载失败"

    # 文本分割
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    documents = []
    for d in docs_data:
        for i, chunk in enumerate(text_splitter.split_text(d["content"])):
            documents.append(Document(page_content=chunk, metadata={"source": d["path"], "chunk": i}))

    # 存入 Qdrant（先删除已有 collection，再创建）
    collection_name = _collection_name(owner, repo)
    if client.collection_exists(collection_name):
        client.delete_collection(collection_name)

    test_embedding = embeddings.embed_query("dimension check")
    vector_size = len(test_embedding)  # 动态获取
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )
    vectorstore = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
        embedding=embeddings,
    )
    vectorstore.add_documents(documents)

    return f"成功索引 {len(doc_paths)} 个文件，{len(documents)} 个文本块"

def search_repo_docs(query: str, owner: str, repo: str) -> List[Document]:
    """在 Qdrant 中搜索文档"""
    collection_name = _collection_name(owner, repo)
    if not client.collection_exists(collection_name):
        return []

    vectorstore = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
        embedding=embeddings
    )
    return vectorstore.similarity_search(query, k=4)