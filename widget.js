(function () {
  "use strict";

  const WIDGET_STYLE_ID = "ai-cs-widget-style";
  const WIDGET_CONTAINER_ID = "ai-cs-widget";

  if (document.getElementById(WIDGET_CONTAINER_ID)) {
    return;
  }

  /*
   * ==============================
   * CONFIG
   * ==============================
   */

  const AI_CS_SERVER =
    window.AI_CS_SERVER ||
    window.location.origin;

  /*
   * ==============================
   * STYLE
   * ==============================
   */

  const style = document.createElement("style");

  style.id = WIDGET_STYLE_ID;

  style.textContent = `
    #ai-cs-widget {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 999999;
      font-family: Arial, sans-serif;
    }

    #ai-cs-button {
      width: 58px;
      height: 58px;
      border: none;
      border-radius: 50%;
      background: #1976d2;
      color: white;
      font-size: 25px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.25);
    }

    #ai-cs-window {
      display: none;
      position: absolute;
      right: 0;
      bottom: 70px;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
      border: 1px solid #ddd;
    }

    #ai-cs-header {
      background: #1976d2;
      color: white;
      padding: 14px;
    }

    #ai-cs-company {
      font-size: 17px;
      font-weight: bold;
    }

    #ai-cs-status {
      font-size: 12px;
      margin-top: 3px;
      opacity: 0.9;
    }

    #ai-cs-messages {
      height: calc(100% - 116px);
      padding: 12px;
      overflow-y: auto;
      background: #f5f7fa;
    }

    .ai-cs-message {
      max-width: 85%;
      padding: 10px 12px;
      border-radius: 12px;
      margin-bottom: 9px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-line;
      word-wrap: break-word;
    }

    .ai-cs-bot {
      background: white;
      color: #222;
      margin-right: auto;
    }

    .ai-cs-user {
      background: #1976d2;
      color: white;
      margin-left: auto;
    }

    #ai-cs-input-area {
      height: 58px;
      display: flex;
      gap: 7px;
      padding: 9px;
      background: white;
      border-top: 1px solid #ddd;
    }

    #ai-cs-input {
      flex: 1;
      min-width: 0;
      border: 1px solid #d0d7de;
      border-radius: 20px;
      padding: 9px 12px;
      outline: none;
      font-size: 14px;
    }

    #ai-cs-send {
      border: none;
      border-radius: 20px;
      background: #1976d2;
      color: white;
      padding: 0 15px;
      cursor: pointer;
    }

    #ai-cs-close {
      float: right;
      border: none;
      background: transparent;
      color: white;
      font-size: 20px;
      cursor: pointer;
    }

    @media (max-width: 480px) {
      #ai-cs-widget {
        right: 12px;
        bottom: 12px;
      }

      #ai-cs-window {
        width: calc(100vw - 24px);
        height: 70vh;
        max-height: 560px;
      }
    }
  `;

  document.head.appendChild(style);

  /*
   * ==============================
   * CONTAINER
   * ==============================
   */

  const container = document.createElement("div");

  container.id = WIDGET_CONTAINER_ID;

  container.innerHTML = `
    <div id="ai-cs-window">

      <div id="ai-cs-header">

        <button id="ai-cs-close">
          ×
        </button>

        <div id="ai-cs-company">
          🤖 AI Customer Service
        </div>

        <div id="ai-cs-status">
          ● Online • Siap membantu
        </div>

      </div>

      <div id="ai-cs-messages">

        <div class="ai-cs-message ai-cs-bot">
          Halo 👋
          
          Ada yang bisa saya bantu?
        </div>

      </div>

      <div id="ai-cs-input-area">

        <input
          id="ai-cs-input"
          type="text"
          placeholder="Ketik pertanyaan..."
          autocomplete="off"
        >

        <button id="ai-cs-send">
          Kirim
        </button>

      </div>

    </div>

    <button
      id="ai-cs-button"
      aria-label="Buka AI Customer Service"
    >
      🤖
    </button>
  `;

  document.body.appendChild(container);

  /*
   * ==============================
   * ELEMENTS
   * ==============================
   */

  const button =
    document.getElementById("ai-cs-button");

  const chatWindow =
    document.getElementById("ai-cs-window");

  const closeButton =
    document.getElementById("ai-cs-close");

  const input =
    document.getElementById("ai-cs-input");

  const sendButton =
    document.getElementById("ai-cs-send");

  const messages =
    document.getElementById("ai-cs-messages");

  /*
   * ==============================
   * OPEN / CLOSE
   * ==============================
   */

  button.addEventListener("click", function () {
    chatWindow.style.display = "block";
    input.focus();
  });

  closeButton.addEventListener("click", function () {
    chatWindow.style.display = "none";
  });

  /*
   * ==============================
   * MESSAGE
   * ==============================
   */

  function addMessage(text, type) {
    const message =
      document.createElement("div");

    message.className =
      "ai-cs-message " +
      (type === "user"
        ? "ai-cs-user"
        : "ai-cs-bot");

    message.textContent = text;

    messages.appendChild(message);

    messages.scrollTop =
      messages.scrollHeight;

    return message;
  }

  /*
   * ==============================
   * SEND MESSAGE
   * ==============================
   */

  async function sendMessage() {

    const message =
      input.value.trim();

    if (!message) {
      return;
    }

    addMessage(message, "user");

    input.value = "";

    const loading =
      addMessage(
        "🤖 Sedang memeriksa...",
        "bot"
      );

    sendButton.disabled = true;
    input.disabled = true;

    try {

      const response =
        await fetch(
          AI_CS_SERVER + "/chat",
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message: message
            })
          }
        );

      const data =
        await response.json();

      loading.remove();

      if (!response.ok) {

        addMessage(
          data.message ||
          data.reply ||
          "Maaf, terjadi masalah pada AI-CS.",
          "bot"
        );

        return;
      }

      addMessage(
        data.reply ||
        "Maaf, AI tidak memberikan jawaban.",
        "bot"
      );

    } catch (error) {

      console.error(
        "AI-CS WIDGET ERROR:",
        error
      );

      loading.remove();

      addMessage(
        "⚠️ Tidak dapat terhubung ke AI-CS.",
        "bot"
      );

    } finally {

      sendButton.disabled = false;
      input.disabled = false;

      input.focus();
    }
  }

  /*
   * ==============================
   * EVENTS
   * ==============================
   */

  sendButton.addEventListener(
    "click",
    sendMessage
  );

  input.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {
        sendMessage();
      }

    }
  );

})();
