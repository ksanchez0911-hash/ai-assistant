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
    if (input.toLowerCase().includes("my name is")) {
      const name = input.split("my name is")[1].trim();
      saveToMemory("name", name);
  }
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
};
    return (
      <div className="app">
        <h1>AI Assistant</h1>
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>
        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Say Something . . ."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>

    );
  }
export default App;
