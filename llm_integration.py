import os
import json
import requests
from typing import List, Dict, Any, Generator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class MultiLLMOrchestrator:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "ollama").lower()
        # Default to a Qwen model as requested (e.g., qwen2.5-coder or qwen2.5)
        # This works for both Ollama and generic generic APIs usually
        self.model = os.getenv("LLM_MODEL", "qwen2.5") 
        
        print(f"Initializing Orchestrator with Provider: {self.provider.upper()}, Model: {self.model}")
        
        if self.provider == "ollama":
            self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            print(f"Ollama URL: {self.base_url}")
        elif self.provider in ["openai", "compatible"]:
            self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
            self.api_key = os.getenv("OPENAI_API_KEY", "")
            print(f"API Base URL: {self.base_url}")
            
    def _call_ollama(self, messages: List[Dict[str, str]], stream: bool = False) -> Any:
        """Call Ollama chat endpoint directly"""
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
            "options": {
                "num_ctx": 32768
            },
            "keep_alive": "5m"
        }
        
        try:
            print(f"Calling Ollama at {url} (stream={stream})")
            response = requests.post(url, json=payload, stream=stream)
            response.raise_for_status()
            
            if stream:
                def generate():
                    for line in response.iter_lines():
                        if line:
                            try:
                                json_response = json.loads(line)
                                if 'message' in json_response and 'content' in json_response['message']:
                                    yield json_response['message']['content']
                                if json_response.get('done', False):
                                    break
                            except json.JSONDecodeError:
                                continue
                return generate()
            else:
                result = response.json()
                return result.get("message", {}).get("content", "")
        except Exception as e:
            print(f"Error calling Ollama: {e}")
            raise e

    def _call_openai_compatible(self, messages: List[Dict[str, str]], stream: bool = False) -> Any:
        """Call OpenAI-compatible chat completion endpoint"""
        # Ensure URL ends with /chat/completions if using standard v1 base
        url = f"{self.base_url}/chat/completions" if not self.base_url.endswith("/chat/completions") else self.base_url
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": stream
        }
        
        try:
            print(f"Calling API at {url} (stream={stream})")
            response = requests.post(url, headers=headers, json=payload, stream=stream)
            response.raise_for_status()
            
            if stream:
                def generate():
                    for line in response.iter_lines():
                        if line:
                            line_str = line.decode('utf-8').strip()
                            if line_str.startswith("data: "):
                                data_str = line_str[6:]
                                if data_str == "[DONE]":
                                    break
                                try:
                                    json_response = json.loads(data_str)
                                    choices = json_response.get("choices", [])
                                    if choices:
                                        delta = choices[0].get("delta", {})
                                        if "content" in delta:
                                            yield delta["content"]
                                except json.JSONDecodeError:
                                    continue
                return generate()
            else:
                result = response.json()
                choices = result.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")
                return ""
        except Exception as e:
            print(f"Error calling API: {e}")
            raise e

    def route_request(self, request_data: Dict[str, Any]) -> Any:
        """Route request based on configured provider"""
        role = request_data.get('role', 'Orchestrator')
        messages = request_data.get('messages', [])
        stream = request_data.get('stream', False)
        # Allow model override per request
        request_model = request_data.get('model') or self.model
        
        # Validation
        if not messages and 'prompt' in request_data:
            messages = [{"role": "user", "content": request_data['prompt']}]

        print(f"Routing request for role '{role}' using model '{request_model}' via {self.provider.upper()}")
        
        # Temporarily override self.model for this call to use in provider methods
        original_model = self.model
        self.model = request_model
        
        try:
            if self.provider == "ollama":
                return self._call_ollama(messages, stream=stream)
            elif self.provider in ["openai", "compatible"]:
                return self._call_openai_compatible(messages, stream=stream)
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
        finally:
            self.model = original_model

if __name__ == "__main__":
    # Example usage
    orchestrator = MultiLLMOrchestrator()
    
    # Test Data
    test_req = {
        "role": "Requirement",
        "messages": [{"role": "user", "content": "Hello, are you Qwen?"}]
    }
    
    print("Testing routing...")
    try:
        res = orchestrator.route_request(test_req)
        if hasattr(res, '__iter__') and not isinstance(res, str):
            print("Stream Response:", "".join(list(res)))
        else:
            print("Response:", res)
    except Exception as e:
        print("Error:", e)
