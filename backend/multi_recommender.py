import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

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

    user_tags = set()

    for idx in movie_indices:
        tags = movies.iloc[idx]["tags"].split()
        user_tags.update(tags)

    for i in movies_list:
        movie_idx = i[0]

        if movie_idx not in movie_indices:
            recommended_movie = movies.iloc[movie_idx]

            movie_tags = set(
                recommended_movie["tags"].split()
            )

            common_tags = sorted(
                tag
                for tag in user_tags.intersection(movie_tags)
                if (
                    tag not in ENGLISH_STOP_WORDS
                    and len(tag) > 2
                    and tag.isalpha()
                )
            )[:3]
            best_match = None
            best_score = -1

            for liked_idx in movie_indices:
                score = cosine_similarity(
                    vectors[movie_idx].reshape(1, -1),
                    vectors[liked_idx].reshape(1, -1)
                )[0][0]

                if score > best_score:
                    best_score = score
                    best_match = movies.iloc[liked_idx].title

            recommendations.append({
                "title": recommended_movie.title,
                "because_you_liked": best_match,
                "interest_tags": common_tags
            })

            if len(recommendations) == 10:
                break

    return recommendations
