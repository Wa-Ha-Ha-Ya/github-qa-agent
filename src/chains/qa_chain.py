import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from openai import api_key, base_url

from src.prompts.docs_agent_prompt import load_instructions

load_dotenv()
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_MODEL_ID = os.getenv("LLM_MODEL_ID")
LLM_URL = os.getenv("LLM_BASE_URL")

def build_qa_chain():
    llm = ChatOpenAI(model=LLM_MODEL_ID, api_key= LLM_API_KEY , base_url = LLM_URL, temperature=0)

    prompt = ChatPromptTemplate.from_messages([
        ("system", load_instructions()),
        ("system", "Here is the relevant documentation:\n\n{context}"),
        ("human", "{question}")
    ])

    chain = (
            {"context": RunnablePassthrough(), "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
    )
    return chain