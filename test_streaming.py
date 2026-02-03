
import requests
import json
import time

def test_streaming():
    url = "http://localhost:8000/generate"
    payload = {
        "prompt": "Count from 1 to 5 slowly",
        "stream": True,
        "model": "mistral"
    }
    
    print(f"Testing streaming at {url}...")
    start_time = time.time()
    
    try:
        response = requests.post(url, json=payload, stream=True)
        response.raise_for_status()
        
        print("Response status:", response.status_code)
        
        chunk_count = 0
        first_chunk_time = None
        
        for chunk in response.iter_content(chunk_size=None):
            if chunk:
                text = chunk.decode('utf-8')
                print(f"Chunk received: {text}", end='', flush=True)
                chunk_count += 1
                if first_chunk_time is None:
                    first_chunk_time = time.time()
        
        print("\n\n--- Stats ---")
        total_time = time.time() - start_time
        print(f"Total chunks: {chunk_count}")
        if first_chunk_time:
            print(f"Time to first chunk: {first_chunk_time - start_time:.4f}s")
        print(f"Total time: {total_time:.4f}s")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_streaming()
