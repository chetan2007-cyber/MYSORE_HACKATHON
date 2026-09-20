# CivicTrack Architecture & Tech Stack

## Stack Overview
1. Frontend: React (Create React App), Tailwind CSS v3
2. Backend: Node.js, Express.js
3. Database: MongoDB Atlas (Mongoose ORM)

## Core Components
1. Predictive Escalation Engine: A custom Node.js controller that calculates a `neglectRiskScore` based on category history and jurisdiction vulnerability.
2. Idempotent API Gateway: Custom Express middleware (`x-idempotency-key`) preventing duplicate ticket creation on flaky mobile networks.
3. Role-Based Queue: MongoDB queries sorting active tickets by calculated `urgencyWeight` and risk scores for Supervisor dashboards.