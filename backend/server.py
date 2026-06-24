from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from multi_recommender import recommend_multiple
from recommender import recommend


app = FastAPI(
    title="Movie Suggestion API",
    description="Backend API for the movie suggestion application.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://movie-suggestion-machine-learning.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Movie Suggestion API is running"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/recommend/{movie_name}")
def get_recommendations(movie_name: str):
    results = recommend(movie_name)

    return {
        "movie": movie_name,
        "recommendations": results,
    }


class MultiRecommendationRequest(BaseModel):
    liked_movies: list[str]


@app.post("/test-selected-movies")
def test_selected_movies(request: MultiRecommendationRequest):
    print("Selected movies from frontend:", request.liked_movies)

    return {
        "message": "Movies reached backend",
        "liked_movies": request.liked_movies,
    }


@app.post("/recommend/multiple")
def get_multiple_recommendations(request: MultiRecommendationRequest):
    results = recommend_multiple(request.liked_movies)

    return {
        "liked_movies": request.liked_movies,
        "recommendations": results,
    }
