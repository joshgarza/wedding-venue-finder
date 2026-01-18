docker exec -it ollama_brain ollama run phi3 // pull phi3

// "hello world" query to phi3 in docker container
curl http://localhost:11434/api/generate -d '{
  "model": "phi3",
  "prompt": "Say exactly: Hello World. This is the Venue Intelligence Engine.",
  "stream": false
}'

docker exec -it ollama ollama pull moondream // pull moondream
