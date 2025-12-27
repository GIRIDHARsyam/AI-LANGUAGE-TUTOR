let recognition;
let listening = false;
let transcript = "";
let confidence = null;

const recordBtn = document.getElementById("recordBtn");
const sendBtn = document.getElementById("sendBtn");
const transcriptEl = document.getElementById("transcript");
const confidenceEl = document.getElementById("confidence");
const feedbackEl = document.getElementById("feedback");

const languageSelect = document.getElementById("language");
const levelSelect = document.getElementById("level");

// Setup Speech Recognition
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false; // only final results
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    transcript = e.results[0][0].transcript;
    confidence = e.results[0][0].confidence;
    transcriptEl.textContent = transcript;
    confidenceEl.textContent = confidence ? `Confidence: ${confidence.toFixed(2)}` : "";
  };

  recognition.onend = () => {
    listening = false;
    recordBtn.textContent = "🎤 Start Recording";
  };
} else {
  alert("❌ Web Speech API not supported. Use Chrome or Edge.");
}

// Toggle Recording
recordBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (!listening) {
    transcript = "";
    confidence = null;
    transcriptEl.textContent = "🎙 Listening...";
    feedbackEl.textContent = "";
    recognition.start();
    listening = true;
    recordBtn.textContent = "⏹ Stop Recording";
  } else {
    recognition.stop();
  }
});

// Send to backend
sendBtn.addEventListener("click", async () => {
  if (!transcript.trim()) {
    alert("⚠️ No transcript available. Please record first!");
    return;
  }

  feedbackEl.textContent = "⏳ Asking the tutor...";
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        confidence,
        language: languageSelect.value,
        userLevel: levelSelect.value,
      }),
    });

    const data = await res.json();
    feedbackEl.textContent = data.feedback || "🤔 No response received.";
  } catch (err) {
    console.error("Frontend error:", err);
    feedbackEl.textContent = "❌ Error: " + err.message;
  }
});
