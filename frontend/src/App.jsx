import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import moviesCsv from "../tmdb_5000_movies.csv?url";

const MOVIES_TO_SHOW = 20;
const REQUIRED_SELECTIONS = 5;

function App() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    Papa.parse(moviesCsv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setMovies(data);
        setLoading(false);
      },
    });
  }, []);

  const visibleMovies = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredMovies = query
      ? movies.filter((movie) => movie.title.toLowerCase().includes(query))
      : movies;

    return filteredMovies.slice(0, MOVIES_TO_SHOW);
  }, [movies, search]);

  const topRecommendations = recommendations.slice(0, 20);
  const recommendedMovies = topRecommendations.map((title) =>
    movies.find((movie) => movie.title === title),
  );

  function toggleMovie(movie) {
    const isSelected = selectedMovies.some(
      (selectedMovie) => selectedMovie.id === movie.id,
    );

    if (isSelected) {
      setSelectedMovies(
        selectedMovies.filter(
          (selectedMovie) => selectedMovie.id !== movie.id,
        ),
      );
    } else if (selectedMovies.length < REQUIRED_SELECTIONS) {
      setSelectedMovies([...selectedMovies, movie]);
    }
  }

  async function getRecommendations() {
    setRecommending(true);

    const response = await fetch("http://localhost:8000/recommend/multiple", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        liked_movies: selectedMovies.map((movie) => movie.title),
      }),
    });

    const data = await response.json();
    setRecommendations(data.recommendations);
    setRecommending(false);
  }

  function tryAnother() {
    setRecommendations([]);
    setSelectedMovies([]);
    setSearch("");
  }

  return (
    <main className="page">
      <header className="header">
        <p className="eyebrow">Movie browser</p>
        {topRecommendations.length > 0 ? (
          <>
            <h1>Your recommendations</h1>
            <p className="intro">Top 20 movies based on your choices.</p>

            <button className="send-button" type="button" onClick={tryAnother}>
              Try another
            </button>
          </>
        ) : (
          <>
            <h1>Select five movies you like</h1>
            <p className="intro">
              Search the collection and choose five favourites.
            </p>
          </>
        )}

        {topRecommendations.length === 0 && (
          <>
            <p className="selection-count">
              {selectedMovies.length} of {REQUIRED_SELECTIONS} selected
            </p>

            <button
              className="send-button"
              type="button"
              onClick={getRecommendations}
              disabled={selectedMovies.length !== REQUIRED_SELECTIONS}
            >
              Get recommendations
            </button>

            <input
              className="search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search movies..."
              aria-label="Search movies"
            />
          </>
        )}
      </header>

      {topRecommendations.length > 0 ? (
        <section className="movie-grid">
          {recommendedMovies.map((movie, index) => (
            <article className="movie-card" key={topRecommendations[index]}>
              <div>
                <p className="year">
                  {movie?.release_date?.slice(0, 4) || "Unknown year"}
                </p>
                <h2>{movie?.title || topRecommendations[index]}</h2>
              </div>

              <p className="overview">
                {movie?.overview || "No description available."}
              </p>

              <div className="movie-details">
                <p>Rating: {movie?.vote_average || "N/A"}</p>
                <p>Votes: {movie?.vote_count || "N/A"}</p>
                <p>Runtime: {movie?.runtime || "N/A"} minutes</p>
                <p>Language: {movie?.original_language || "N/A"}</p>
                <p>Popularity: {movie?.popularity || "N/A"}</p>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <>
          {loading ? (
            <p className="status">Loading movies...</p>
          ) : visibleMovies.length > 0 ? (
            <section className="movie-grid">
              {visibleMovies.map((movie) => {
                const isSelected = selectedMovies.some(
                  (selectedMovie) => selectedMovie.id === movie.id,
                );
                const selectionIsFull =
                  selectedMovies.length === REQUIRED_SELECTIONS && !isSelected;

                return (
                  <button
                    className={`movie-card${isSelected ? " selected" : ""}${selectionIsFull ? " unavailable" : ""}`}
                    key={movie.id}
                    type="button"
                    onClick={() => toggleMovie(movie)}
                    aria-pressed={isSelected}
                  >
                    <div>
                      <p className="year">
                        {movie.release_date?.slice(0, 4) || "Unknown year"}
                      </p>
                      <h2>{movie.title}</h2>
                    </div>

                    <p className="overview">
                      {movie.overview || "No description available."}
                    </p>

                    <p className="rating">
                      Rating: {movie.vote_average || "N/A"}
                    </p>
                  </button>
                );
              })}
            </section>
          ) : (
            <p className="status">No movies found for “{search}”.</p>
          )}

          {recommending && <p className="status">Finding recommendations...</p>}
        </>
      )}
    </main>
  );
}

export default App;
