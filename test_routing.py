
import sys
from unittest.mock import MagicMock

# Mock Haystack nodes
sys.modules['haystack'] = MagicMock()
sys.modules['haystack.document_stores'] = MagicMock()
sys.modules['haystack.nodes'] = MagicMock()
sys.modules['dotenv'] = MagicMock()

# Now import the class - we need to copy the class definition roughly or just rely on the file if imports work
# Since we mocked the modules, importing llm_integration should work IF it only imports those.
# However, llm_integration imports os, typing, etc.
# Let's try to just test the logic by defining the class here with mocks or importing if possible.
# Importing is better to test the actual file.

import llm_integration

# Mock the nodes in the instance
orchestrator = llm_integration.MultiLLMOrchestrator()
orchestrator.ollama_node = MagicMock(return_value=["Ollama Response"])
orchestrator.claude_node = MagicMock(return_value=["Claude Response"])

# Test 1: Requirement -> Ollama
req1 = {"role": "Requirement", "messages": [{"role": "user", "content": "test"}]}
res1 = orchestrator.route_request(req1)
print(f"Test 1 (Requirement): {res1} - {'PASS' if 'Ollama' in res1 else 'FAIL'}")

# Test 2: Design -> Ollama
req2 = {"role": "Design", "messages": [{"role": "user", "content": "test"}]}
res2 = orchestrator.route_request(req2)
print(f"Test 2 (Design): {res2} - {'PASS' if 'Ollama' in res2 else 'FAIL'}")

# Test 3: Development -> Claude
req3 = {"role": "Development", "messages": [{"role": "user", "content": "test"}]}
res3 = orchestrator.route_request(req3)
print(f"Test 3 (Development): {res3} - {'PASS' if 'Claude' in res3 else 'FAIL'}")

# Test 4: Testing -> Claude
req4 = {"role": "Testing", "messages": [{"role": "user", "content": "test"}]}
res4 = orchestrator.route_request(req4)
print(f"Test 4 (Testing): {res4} - {'PASS' if 'Claude' in res4 else 'FAIL'}")

# Test 5: Orchestrator -> Claude
req5 = {"role": "Orchestrator", "messages": [{"role": "user", "content": "test"}]}
res5 = orchestrator.route_request(req5)
print(f"Test 5 (Orchestrator): {res5} - {'PASS' if 'Claude' in res5 else 'FAIL'}")
