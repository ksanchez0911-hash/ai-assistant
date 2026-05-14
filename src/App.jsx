import { useState } from 'react';
import "./App.css";

const cleanValue = (value) =>
  value
    .trim()
    .replace(/[.!,]*$/g, "")
    .replace(/\bai\b$/i, "")
    .trim();

const parseOccupationFromText = (text) => {
  const patterns = [
    /i (?:work|am working|have been working|build|develop)(?: (?:as|in|on|with|for))? ([a-z ]+?)(?:\.|!|,|$)/i,
    /i(?:'m| am) a[n]? ([a-z ]+?)(?:\.|!|,|$)/i,
    /my job is ([a-z ]+?)(?:\.|!|,|$)/i,
    /i do ([a-z ]+?)(?:\.|!|,|$)/i,
    /i am a[n]? ([a-z ]+?)(?:\.|!|,|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return cleanValue(match[1]);
    }
  }
  return null;
};

const parseNameFromText = (text) => {
  const patterns = [
    /my name is ([a-z ]+)(?:\.|!|,|$)/i,
    /i(?:'m| am) called ([a-z ]+)(?:\.|!|,|$)/i,
    /you can call me ([a-z ]+)(?:\.|!|,|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanValue(match[1]);
  }
  return null;
};

const parseHobbiesFromText = (text) => {
  const patterns = [
    /(?:my hobbies are|my hobby is|i like|i love|i enjoy|i'm into|i am into|interests include|hobbies include) ([a-z ,&]+?)(?:\.|!|,|$)/i,
    /(?:i enjoy|i love|i like) ([a-z ,&]+?)(?:\.|!|,|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanValue(match[1]);
  }
  return null;
};

const parseLocationFromText = (text) => {
  const patterns = [
    /i live in ([a-zA-Z0-9 ,]+?)(?:\.|!|,|$)/i,
    /i(?:'m| am) from ([a-zA-Z0-9 ,]+?)(?:\.|!|,|$)/i,
    /based in ([a-zA-Z0-9 ,]+?)(?:\.|!|,|$)/i,
    /i(?:'m| am) in ([a-zA-Z0-9 ,]+?)(?:\.|!|,|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanValue(match[1]);
  }
  return null;
};

const parsePossessionsFromText = (text) => {
  const patterns = [
    /i have ([a-zA-Z0-9 ,&'-]+?)(?:\.|!|,|$)/i,
    /i own ([a-zA-Z0-9 ,&'-]+?)(?:\.|!|,|$)/i,
    /i(?:'ve| have) got ([a-zA-Z0-9 ,&'-]+?)(?:\.|!|,|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanValue(match[1]);
  }
  return null;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState(() => {
    const saved = localStorage.getItem("userMemory");
    return saved ? JSON.parse(saved) : {};
  });

  const saveToMemory = (key, value) => {
    console.log("saving", key, value);
    const updated = { ...memory, [key]: value };
    setMemory(updated);
    localStorage.setItem("userMemory", JSON.stringify(updated));
  };

  const saveMemoryEntries = (entries) => {
    Object.entries(entries).forEach(([key, value]) => {
      if (value) {
        saveToMemory(key, value);
      }
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: "user", content: input };
    const immediateFacts = {};
    const occupation = parseOccupationFromText(input);
    const name = parseNameFromText(input);
    const hobbies = parseHobbiesFromText(input);
    const location = parseLocationFromText(input);
    const possessions = parsePossessionsFromText(input);

    if (occupation) {
      immediateFacts.occupation = occupation;
    }
    if (name) {
      immediateFacts.name = name;
    }
    if (hobbies) {
      immediateFacts.hobbies = hobbies;
    }
    if (location) {
      immediateFacts.location = location;
    }
    if (possessions) {
      immediateFacts.possessions = possessions;
    }

    const currentMemory = { ...memory, ...immediateFacts };
    if (Object.keys(immediateFacts).length) {
      saveMemoryEntries(immediateFacts);
    }

    setMessages((prev) => [...prev, userMessage]);
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3.2",
        messages: [{ role: "system", content: `Your name is Lumin. You speak naturally like a real person, not a robot. Keep responses conversational and relaxed. You tell users the reality and not what they want to hear. You know the following about the user: ${JSON.stringify(currentMemory)}` }, ...messages, userMessage],
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
        messages: [
          { role: "system", content: `You are an extraction data tool. Extract personal facts about the user from the conversation. Return ONLY a valid JSON object with keys like {"name":"John", "occupation":"construction", "hobbies":"reading, hiking", "location":"Denver", "possessions":"Tesla Model 3"}. If nothing worth saving, return {}. Only include keys that the user clearly stated or strongly implied. Example: if the user says "I work on construction AI", return {"occupation":"construction"}. If the user says "I have a mountain bike", return {"possessions":"mountain bike"}. Do not add any explanation, extra text, or code formatting.` },
          { role: "user", content: input },
          { role: "assistant", content: aiMessage.content }
        ],
        stream: false,
      })
    });

    const memoryData = await memoryCheck.json();
    console.log("memory extract:", memoryData.message.content);
    try {
      const match = memoryData.message.content.match(/\{[\s\S]*\}/);
      const extracted = match ? JSON.parse(match[0]) : {};
      saveMemoryEntries(extracted);
    } catch (e) {
      console.error("Failed to parse memory extraction JSON", e);
    }

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
