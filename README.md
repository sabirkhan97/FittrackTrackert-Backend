FitTrack Backend
Backend for FitTrack Pro application using Node.js, Express.js, MongoDB, and TypeScript.
Setup

Install MongoDB: Ensure MongoDB is running locally or use a cloud provider like MongoDB Atlas.
Install Node.js: Version 18 or higher.
Clone Repository:git clone <repo-url>
cd fittrack-backend


Install Dependencies:npm install


Set Environment Variables: Create a .env file with:PORT=5000
MONGO_URI=mongodb://localhost:27017/fittrack
JWT_SECRET=your_jwt_secret_key_very_long_and_secure
NODE_ENV=development


Run Locally:npm run dev


Build for Production:npm run build
npm start


Run with Docker:docker build -t fittrack-backend .
docker run -p 5000:5000 --env-file .env fittrack-backend



API Endpoints

POST /api/users/signup: Register a new user.
POST /api/login: Login and receive JWT.
GET /api/profile: Get user profile and exercises (authenticated).
PATCH /api/profile: Update user profile (authenticated).
POST /api/exercises: Create a new exercise (authenticated).
GET /api/exercises: Get all user exercises (authenticated).
DELETE /api/exercises/:id: Delete an exercise (authenticated).
POST /api/workout-plans: Generate a workout plan (authenticated).

Notes

Replace your_jwt_secret_key_very_long_and_secure with a secure key.
The /api/workout-plans endpoint currently returns a mock response. Integrate with an AI service for dynamic generation.
Ensure MongoDB indexes are utilized for performance with large user bases.

