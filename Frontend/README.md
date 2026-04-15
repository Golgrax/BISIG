# BISIG - Bidirectional Interface for Sign Intelligence & Gestures

Bridging Filipino Sign Language (FSL) and Spoken Language via Pose-Based Transformers.

## Overview
BISIG (FSL Intelligence) is a university-led initiative designed to empower the Filipino deaf and hard-of-hearing community. This project provides a real-time, bidirectional translation system that bridges the communication gap between FSL signers and the hearing population.

**Note:** This is currently a **demo prototype**. This repository contains the frontend interface which connects to a specialized API backend system deployed separately. The backend handles heavy-duty tasks such as receiving text prompts and generating 3D model poses, skeletal data, and video outputs.

## Key Features
- **Real-time Bidirectional Translation:** Supports both Sign-to-Text and Text-to-Sign.
- **Localized for FSL:** Specifically trained on Filipino Sign Language datasets.
- **Web-Native Architecture:** Accessible via any modern browser using TensorFlow.js and MediaPipe for on-device pose estimation.
- **Multiple Output Formats:** Renders translations through lightweight Skeletons, 3D Avatars (Three.js), or photorealistic videos.

## Development & Deployment

### Local Development
To start the development server:
```bash
npm start
```

### Deployment
To build the project and deploy it to Firebase Hosting:
```bash
npm run deploy
```

The application is configured for Firebase Hosting and uses Firestore and Firebase Authentication for data persistence and user management.
