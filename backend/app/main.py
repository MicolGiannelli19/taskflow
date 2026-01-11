from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, board, ticket

app = FastAPI(title="taskflow API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(board.router)
app.include_router(ticket.router)

@app.get("/")
def root():
    return {"message": "taskflow API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)