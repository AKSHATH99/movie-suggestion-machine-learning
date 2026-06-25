import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import moviesCsv from "../tmdb_5000_movies.csv?url";
import heroImage1 from "./hero-images/wp12464901-4k-interstellar-wallpapers.jpg";
import heroImage2 from "./hero-images/thumb-1920-1406554.jpg";
import heroImage4 from "./hero-images/lalaland.jpg";
import heroImage5 from "./hero-images/transformer.jpg";
import heroImage6 from "./hero-images/Helicopters Zombies Movies World War Z Wallpaper.jpg";
import heroImage8 from "./hero-images/spider-man-x-hulk-in-spider-man-brand-new-day-vm.jpg";
import heroImage9 from "./hero-images/wallpapersden.com_the-batman-poster_2048x1364.jpg";

const bgImages = [heroImage1, heroImage2, heroImage4, heroImage5, heroImage6, heroImage8, heroImage9];

const MOVIES_TO_SHOW = 20;
const REQUIRED_SELECTIONS = 5;

function formatRuntime(minutes) {
  const mins = parseInt(minutes, 10);
  if (!mins || isNaN(mins)) return "N/A";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://127.0.0.1:8000"
  : "https://movie-suggestion-machine-learning.onrender.com";

function App() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [viewState, setViewState] = useState("landing"); // 'landing' | 'selection' | 'loading' | 'results'
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [moviePosters, setMoviePosters] = useState({});

  useEffect(() => {
    if (viewState !== "landing") return;
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [viewState]);

  useEffect(() => {
    Papa.parse(moviesCsv, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsedData = data.map(movie => {
          let parsedGenres = [];
          if (movie.genres) {
            try {
              parsedGenres = JSON.parse(movie.genres).map(g => g.name);
            } catch (e) {
              console.warn("Failed to parse genres for", movie.title);
            }
          }
          return { ...movie, parsedGenres };
        });
        setMovies(parsedData);
        setLoading(false);
      },
    });
  }, []);

  const topGenres = useMemo(() => {
    if (!movies.length) return [];
    const genreCounts = {};
    movies.forEach(movie => {
      movie.parsedGenres?.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }, [movies]);

  const visibleMoviesByGenre = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredMovies = query
      ? movies.filter((movie) => movie.title.toLowerCase().includes(query))
      : movies;

    const grouped = {};
    let totalVisible = 0;
    topGenres.forEach(genre => {
      const genreMovies = filteredMovies
        .filter(movie => movie.parsedGenres?.includes(genre))
        .sort((a, b) => parseFloat(b.vote_average || 0) - parseFloat(a.vote_average || 0))
        .slice(0, MOVIES_TO_SHOW);
      grouped[genre] = genreMovies;
      totalVisible += genreMovies.length;
    });
    return { grouped, totalVisible };
  }, [movies, search, topGenres]);

  // Backend now returns objects: { title, because_you_liked, interest_tags }
  // Support both old (string) and new (object) formats
  const topRecommendations = recommendations.slice(0, 20);
  const recommendedMovies = topRecommendations.map((rec) => {
    const title = typeof rec === "string" ? rec : rec.title;
    return {
      movieData: movies.find((movie) => movie.title === title),
      because_you_liked: typeof rec === "object" ? rec.because_you_liked : null,
      interest_tags: typeof rec === "object" ? rec.interest_tags : [],
      title,
    };
  });

  useEffect(() => {
    async function fetchPosters() {
      const apiKey = "8f501dfe"; // Using provided OMDB API key

      const postersToFetch = recommendedMovies.filter(m => m?.movieData?.id && !moviePosters[m.movieData.id]);
      if (postersToFetch.length === 0) return;

      const results = await Promise.all(
        postersToFetch.map(async (rec) => {
          const movie = rec.movieData;
          try {
            const response = await fetch(`https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(rec.title)}`);
            const data = await response.json();
            // OMDB returns "N/A" if there is no poster
            if (data.Poster && data.Poster !== "N/A") {
              return { id: movie.id, path: data.Poster };
            }
          } catch (error) {
            console.error("Error fetching poster for", rec.title, error);
          }
          return null;
        })
      );

      const newPosters = {};
      results.forEach(result => {
        if (result) {
          newPosters[result.id] = result.path;
        }
      });
      
      if (Object.keys(newPosters).length > 0) {
        setMoviePosters(prev => ({ ...prev, ...newPosters }));
      }
    }

    if (viewState === "results" && recommendedMovies.length > 0) {
      fetchPosters();
    }
  }, [viewState, recommendations]); // Trigger when viewState or recommendations change

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
    setViewState("loading");

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommend/multiple`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            liked_movies: selectedMovies.map((movie) => movie.title),
          }),
        },
      );

      const data = await response.json();
      setRecommendations(data.recommendations);
      setViewState("results");
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      setViewState("selection"); // fallback on error
    }
  }

  function tryAnother() {
    setRecommendations([]);
    setSelectedMovies([]);
    setSearch("");
    setViewState("selection");
  }

  return (
    <main className={viewState === "landing" ? "landing-container" : "page"}>
      {viewState === "landing" && (
        <section className="landing-view">
          <div className="landing-bg-overlay"></div>
          {bgImages.map((imgSrc, index) => (
            <img 
              key={imgSrc}
              src={imgSrc} 
              alt={`Background ${index + 1}`} 
              className={`landing-bg-img ${index === currentBgIndex ? "active" : ""}`} 
            />
          ))}
          <div className="landing-content">
            <h1 className="hero-title">Find the movies you probably will like</h1>
            <p className="hero-subtitle">Discover your next favorite film by telling us what you already love.</p>
            <button className="cta-button" onClick={() => setViewState("selection")}>
              Start Exploring
            </button>
          </div>
        </section>
      )}

      {viewState === "selection" && (
        <>
          <header className="header">
            <p className="eyebrow">Movie browser</p>
            <h1>Select five movies you like</h1>
            <p className="intro">
              Search the collection and choose five favourites.
            </p>
            <input
              className="search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search movies..."
              aria-label="Search movies"
            />

            {selectedMovies.length > 0 && (
              <div className="top-selected-list">
                <h3>Selected ({selectedMovies.length}/{REQUIRED_SELECTIONS})</h3>
                <div className="selected-chips">
                  {selectedMovies.map(movie => (
                    <span key={movie.id} className="selected-chip">
                      {movie.title}
                      <button onClick={() => toggleMovie(movie)} className="remove-chip" aria-label="Remove">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </header>

          {loading ? (
            <p className="status">Loading movies...</p>
          ) : visibleMoviesByGenre.totalVisible > 0 ? (
            <div className="genres-container">
              {topGenres.map(genre => {
                const genreMovies = visibleMoviesByGenre.grouped[genre] || [];
                if (genreMovies.length === 0) return null;

                return (
                  <section className="genre-section" key={genre}>
                    <h2 className="genre-title">{genre}</h2>
                    <div className="genre-row">
                      {genreMovies.map((movie) => {
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
                            <div className="card-header-compact">
                              <div className="title-row">
                                <h3>{movie.title}</h3>
                                <span className="rating-badge">★ {movie.vote_average || "N/A"}</span>
                              </div>
                              <p className="year">
                                {movie.release_date?.slice(0, 4) || "Unknown year"}
                              </p>
                            </div>

                            <p className="overview">
                              {movie.overview || "No description available."}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="status">No movies found for “{search}”.</p>
          )}

          <div className={`floating-bottom-bar ${selectedMovies.length > 0 ? 'visible' : ''}`}>
            <div className="floating-bar-content">
              <div className="floating-selected-info">
                <span className="floating-count">{selectedMovies.length} / {REQUIRED_SELECTIONS} Selected</span>
                <div className="floating-chips">
                  {selectedMovies.map(movie => (
                    <span key={movie.id} className="floating-chip">
                      {movie.title}
                      <button onClick={() => toggleMovie(movie)} className="remove-chip floating-remove" aria-label="Remove">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="send-button cta-button floating-cta"
                type="button"
                onClick={getRecommendations}
                disabled={selectedMovies.length !== REQUIRED_SELECTIONS}
              >
                Suggest movies to me
              </button>
            </div>
          </div>
        </>
      )}

      {viewState === "loading" && (
        <section className="loading-view">
          <div className="spinner"></div>
          <h2 className="loading-text">Analyzing your taste...</h2>
          <p className="status">Finding the best matches in our database.</p>
        </section>
      )}

      {viewState === "results" && (
        <>
          <header className="header">
            <p className="eyebrow">Movie browser</p>
            <h1>Your recommendations</h1>
            <p className="intro">Top 20 movies based on your choices.</p>

            <button className="send-button cta-button" type="button" onClick={tryAnother}>
              Try another
            </button>
          </header>

          <section className="movie-grid">
            {recommendedMovies.map((rec, index) => {
              const movie = rec.movieData;
              const posterId = movie?.id;
              return (
                <article className="movie-card result-card" key={rec.title}>
                  {/* Rank number */}
                  <span className="result-rank">#{index + 1}</span>

                  {posterId && moviePosters[posterId] ? (
                    <div className="movie-poster-container">
                      <img src={moviePosters[posterId]} alt={`${rec.title} poster`} className="movie-poster" />
                    </div>
                  ) : (
                    <div className="movie-poster-container placeholder">
                      <span className="placeholder-icon">🎬</span>
                    </div>
                  )}

                  <div className="card-header">
                    <p className="year">{movie?.release_date?.slice(0, 4) || "Unknown year"}</p>
                    <h2>{rec.title}</h2>
                  </div>

                  {rec.because_you_liked && (
                    <div className="because-block">
                      <span className="because-label">Because you liked</span>
                      <span className="because-movie">🎬 {rec.because_you_liked}</span>
                    </div>
                  )}

                  {rec.interest_tags && rec.interest_tags.length > 0 && (
                    <div className="interest-tags">
                      {rec.interest_tags.map(tag => (
                        <span key={tag} className="interest-tag">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <p className="overview">
                    {movie?.overview || "No description available."}
                  </p>

                  <div className="movie-details">
                    <p>Rating: <span className="highlight">{movie?.vote_average || "N/A"}</span></p>
                    <p>Language: {movie?.original_language || "N/A"}</p>
                    <p>{formatRuntime(movie?.runtime)}</p>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}

export default App;
