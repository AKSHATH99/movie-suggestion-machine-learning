from pathlib import Path

print(Path.cwd())

import pandas as pd
from scipy.sparse import load_npz
from sklearn.metrics.pairwise import cosine_similarity


BASE_DIR = Path.cwd()
movies = pd.read_pickle(BASE_DIR / "artifacts" / "movies.pkl")
vectors = load_npz(BASE_DIR / "artifacts" / "vectors.npz")

def recommend(movie_name: str, limit: int = 5) -> list[str]:
    matches = movies.index[
        movies["title"].str.strip().str.casefold()
        == movie_name.strip().casefold()
    ]

    if matches.empty:
        return []

    movie_index = matches[0]

    scores = cosine_similarity(
        vectors[movie_index],
        vectors,
    ).flatten()

    ranked_indices = scores.argsort()[::-1]

    recommendations = []

    for index in ranked_indices:
        if index != movie_index:
            recommendations.append(movies.iloc[index]["title"])

        if len(recommendations) == limit:
            break

    return recommendations
