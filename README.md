# Real-Time Language Translation Chat Application

This application provides real-time chat functionality with integrated AI-based language translation. Users can choose their preferred language for sending and receiving messages, and the system automatically translates messages to and from the selected languages.

---

## Overview

- **Backend**: REST API and WebSocket server to manage real-time chat and room interactions.
- **Frontend**: JavaScript application with dynamic UI for chat and translation controls.

---

## AI Model

### Chosen Model
- **Model**: `gpt-3.5-turbo` by OpenAI.

### Purpose
- Translate text between languages.
- Ensure seamless integration of translation within the chat application.

### Why Chosen
- State-of-the-art performance for natural language understanding and generation.
- High accuracy and fluency in translations.

### Alternatives Considered
- **Google Translate API**: Rejected due to lack of customizable conversational capabilities.
- **Microsoft Translator**: Rejected due to complexity of integration with the existing stack.

### Integration
- Used OpenAI's `chat/completions` API endpoint for language translation.
- Messages are passed to the model with specific prompts for translation tasks.
