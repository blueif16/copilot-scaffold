#!/bin/bash

# Test chat message through the frontend API
echo "Testing chat message..."

curl -X POST http://localhost:3000/api/copilotkit \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is a solid?"
      }
    ],
    "agent": "chat-changing-states"
  }' \
  -v

echo ""
echo "Check the logs:"
echo "  Backend: tail -f /Users/tk/Desktop/Omniscience/.logs/backend.log"
echo "  Frontend: tail -f /Users/tk/Desktop/Omniscience/.logs/frontend.log"
