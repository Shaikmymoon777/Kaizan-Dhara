from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
from llm_integration import MultiLLMOrchestrator

app = FastAPI(title="Multi-LLM Orchestrator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

orchestrator = MultiLLMOrchestrator()

class Message(BaseModel):
    role: str
    content: str

class GenerateRequest(BaseModel):
    role: Optional[str] = "Orchestrator"
    messages: Optional[List[Message]] = None
    prompt: Optional[str] = None # Support legacy or simple prompt
    model: Optional[str] = None
    stream: Optional[bool] = False
    options: Optional[Dict[str, Any]] = None
    format: Optional[str] = None

from fastapi.responses import StreamingResponse

@app.post("/generate")
async def generate_response(request: GenerateRequest):
    try:
        # Convert Pydantic model to dict
        req_data = request.dict()
        
        # Route logic is now in the orchestrator
        response_result = orchestrator.route_request(req_data)
        
        if request.stream:
             return StreamingResponse(response_result, media_type="text/plain")
        else:
            # Return format expected by frontend (compatible with our ollamaService update)
            return {"response": response_result}
        
    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/tags")
async def get_tags():
    # Mock tags response for frontend 'ensureModel' check
    return {"models": [{"name": "mistral"}, {"name": "claude-2"}]}

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
