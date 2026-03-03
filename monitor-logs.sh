#!/bin/bash

echo "=== Monitoring Omniscience Logs ==="
echo ""
echo "Backend logs will show [Chat Agent] messages"
echo "Frontend logs will show [CopilotKit API] and [TopicRunner] messages"
echo ""
echo "Now open http://localhost:3000/topics/changing-states in your browser"
echo "Click the companion, type a message, and send it"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Monitor both logs with labels
tail -f /Users/tk/Desktop/Omniscience/.logs/backend.log /Users/tk/Desktop/Omniscience/.logs/frontend.log | while read line; do
    if [[ "$line" == "==>"* ]]; then
        echo ""
        echo "$line"
    elif [[ "$line" == *"[Chat Agent]"* ]]; then
        echo "🔵 BACKEND: $line"
    elif [[ "$line" == *"[CopilotKit API]"* ]]; then
        echo "🟢 FRONTEND API: $line"
    elif [[ "$line" == *"[TopicRunner]"* ]]; then
        echo "🟡 FRONTEND UI: $line"
    elif [[ "$line" == *"[ChatOverlay]"* ]]; then
        echo "🟠 CHAT UI: $line"
    elif [[ "$line" == *"POST /api/copilotkit"* ]]; then
        echo "📡 $line"
    elif [[ "$line" == *"ERROR"* ]] || [[ "$line" == *"Error"* ]] || [[ "$line" == *"error"* ]]; then
        echo "❌ $line"
    fi
done
