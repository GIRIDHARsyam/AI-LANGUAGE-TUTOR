let recognition;
let listening = false;
let transcript = "";
let confidence = null;

// Get references to HTML elements
const recordBtn = document.getElementById("recordBtn");
const sendBtn = document.getElementById("sendBtn");
const transcriptEl = document.getElementById("transcript");
const confidenceEl = document.getElementById("confidence");
const feedbackEl = document.getElementById("feedback");
const languageSelect = document.getElementById("language");
const levelSelect = document.getElementById("level");
// ✅ ADDED: Reference to the new animation overlay
const animationOverlay = document.getElementById('animation-overlay');

// ❌ REMOVED: Old code that created the pulsing red circle via JS

// Setup Speech Recognition
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
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
    // ✅ ADDED: Ensure animation is hidden when recording ends
    animationOverlay.classList.add('hidden');
  };
} else {
  alert("❌ Web Speech API not supported. Use Chrome or Edge.");
}

// --- Recording button ---
recordBtn.addEventListener("click", () => {
  if (!recognition) return;

  if (!listening) {
    // START RECORDING
    transcript = "";
    confidence = null;
    transcriptEl.textContent = "🎙 Listening...";
    feedbackEl.textContent = "";

    recognition.start();
    listening = true;
    recordBtn.textContent = "⏹ Stop Recording";

    // ✅ MODIFIED: Show the full-screen animation
    animationOverlay.classList.remove('hidden');

  } else {
    // STOP RECORDING
    recognition.stop();
    // ✅ MODIFIED: Hide the full-screen animation
    animationOverlay.classList.add('hidden');
  }
});

// --- Send transcript to backend ---
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
        language: languageSelect.value,
        userLevel: levelSelect.value,
      }),
    });

    const data = await res.json();
    feedbackEl.textContent = data.feedback;

    // Speak the feedback
    const utterance = new SpeechSynthesisUtterance(data.feedback);
    utterance.lang = languageSelect.value === "English" ? "en-US" : "en-US";
    speechSynthesis.speak(utterance);

  } catch (err) {
    console.error("Frontend error:", err);
    feedbackEl.textContent = "❌ Error: " + err.message;
  }
});

// ❌ REMOVED: Old code that added CSS keyframes via JS