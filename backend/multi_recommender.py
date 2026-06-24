import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from recommender import movies, vectors


def recommend_multiple(liked_movies):
    movie_indices = []
    missing_movies = []

    for movie in liked_movies:
        matches = movies.index[
            movies["title"].str.strip().str.casefold() == movie.strip().casefold()
        ]

        if not matches.empty:
            movie_indices.append(matches[0])
        else:
            missing_movies.append(movie)

    print("Missing movies:", missing_movies)

    user_vector = np.asarray(vectors[movie_indices].mean(axis=0))
    user_vector = user_vector.reshape(1, -1)

    distances = cosine_similarity(user_vector, vectors)

    movies_list = list(enumerate(distances[0]))
    movies_list = sorted(
        movies_list,
        reverse=True,
        key=lambda x: x[1],
    )

    recommendations = []

    for i in movies_list:
        movie_idx = i[0]

        if movie_idx not in movie_indices:
            recommendations.append(movies.iloc[movie_idx].title)

    return recommendations
