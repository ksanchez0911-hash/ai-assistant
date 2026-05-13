import { useState } from 'react';
import "./App.css";
function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState(() => {
    const saved = localStorage.getItem("userMemory");
    return saved ? JSON.parse(saved) : {};
  });
  const saveToMemory = (key, value) => {
    //console.log("saving", key, value);
    const updated = { ...memory, [key]: value };
    setMemory(updated);
    localStorage.setItem("userMemory", JSON.stringify(updated));
  };
  const sendMessage = async () => {
   if (!input.trim()) return;
    const userMessage = { role: "user", content: input };
   // if (input.toLowerCase().includes("my name is")) {
      //const name = input.split("my name is")[1].trim();
      //saveToMemory("name", name);
    //}
    setMessages((prev) => [...prev, userMessage]);
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3.2",
        messages: [{ role: "system", content: `Your name is Lumin. You speak naturally like a real person, not a robot. Keep responses conversational and relaxed. You tell users the reality and not what they want to hear. You know the following about the user: ${JSON.stringify(memory)}` }, ...messages, userMessage],
        stream: false,
      })
    });
    const data = await response.json();
    const aiMessage = { role: "assistant", content: data.message.content };
    setMessages((prev) => [...prev, aiMessage]);
    const memoryCheck = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3.2",
        messages: [{ role: "system", content: `You are an extraction data tool. Extractany personal facts about the user from the conversation. Respond with ONLY valid JSON object with separate keys like {"name": "John", "age": 30}, nothing else. If nothing worth saving, return {}.` }, 
        {role: "user", content: input},
        {role: "assistant", content: aiMessage.content}
      ],
        stream: false,
      })
    });

    const memoryData = await memoryCheck.json();
    console.log("memory extract:", memoryData.message.content);
    try {
      const extracted = JSON.parse(memoryData.message.content);
      Object.entries(extracted).forEach(([key, value]) => {
        if (value) {
          saveToMemory(key, value);
        }
      });
    } catch (e) {}
    setInput("");
};
    return (
    <div className="app">
      <h1>Lumin</h1>
      <div className="main">
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>
        <div className="memory-panel">
          <h2>What I Know</h2>
          {Object.keys(memory).length === 0 ? (
            <p>Nothing saved yet.</p>
          ) : (
            Object.entries(memory).map(([key, value]) => (
              <div key={key} className="memory-item">
                <span className="memory-key">{key}:</span>
                <span className="memory-value">{value}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="What can I help you with?"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
export default App;
