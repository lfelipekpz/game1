// GeoExplorer Game - Main Client-Side Logic

// --- Global Variables and Configuration ---

// Predefined list of locations for the game rounds. Each object contains name, latitude, and longitude.
const locations = [
    { name: "New York City", lat: 40.7128, lon: -74.0060 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo", lat: 35.6895, lon: 139.6917 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 }
];

// Game State Variables
let currentRound = 0;         // 0-indexed counter for the current game round.
let totalScore = 0;           // Accumulated score across all rounds.
let currentLocationData = {}; // Stores data about the current Mapillary image (ID, actual coordinates, etc.).
let guessMarker = null;       // Leaflet marker object for the user's guess on the map.
let actualLocationMarker = null; // Leaflet marker object for the actual location.
let resultPolyline = null;    // Leaflet polyline connecting guess and actual locations.
let mapClicksEnabled = true;  // Boolean to control if map clicks for guessing are active.

// UI Element References (populated in DOMContentLoaded)
let scoreDisplay, roundDisplay, submitGuessBtn, nextRoundBtn, playAgainBtn, imageContainer, map;


// --- Scoring and Distance Calculation ---

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 * @param {number[]} coords1 - Array [latitude, longitude] for the first point.
 * @param {number[]} coords2 - Array [latitude, longitude] for the second point.
 * @returns {number} The distance in kilometers.
 */
function haversineDistance(coords1, coords2) {
    const R = 6371; // Earth's radius in km
    const lat1 = coords1[0];
    const lon1 = coords1[1];
    const lon1 = coords1[1];
    const lat2 = coords2[0];
    const lon2 = coords2[1];

    // Convert degrees to radians
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const rLat1 = lat1 * (Math.PI / 180);
    const rLat2 = lat2 * (Math.PI / 180);

    // Haversine formula
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(rLat1) * Math.cos(rLat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

/**
 * Calculates the score based on the distance between the guess and the actual location.
 * @param {number} distanceKm - The distance in kilometers.
 * @returns {number} The calculated score (0-5000).
 */
function calculateScore(distanceKm) {
    if (distanceKm < 0.25) return 5000; // Max score for very close guesses
    if (distanceKm > 2000) return 0;   // Min score for very far guesses
    // Score decreases linearly from 5000 to 0 over 2000 km.
    // Points lost per km = 5000 / 2000 = 2.5
    const score = 5000 - (distanceKm * 2.5);
    return Math.max(0, Math.round(score)); // Ensure score is not negative and is an integer
}
// --- End Scoring and Distance Calculation ---


// --- Core Game Logic ---

/**
 * Fetches a Mapillary image for the given latitude, longitude, and location name.
 * Updates the image container with the fetched image or an error message.
 * @param {number} lat - Latitude of the location.
 * @param {number} lon - Longitude of the location.
 * @param {string} locationName - Name of the location (for display purposes).
 */
async function fetchImageForLocation(lat, lon, locationName) {
    imageContainer.innerHTML = `<p>Loading image for ${locationName}...</p>`; // Show loading message
    try {
        // Call the serverless function to get Mapillary image data
        const response = await fetch(`/api/getMapillaryImage?lat=${lat}&lon=${lon}`);
        if (response.ok) {
            const data = await response.json();
            console.log('Received image data:', data);

            if (data.imageUrl && data.coordinates && data.imageId) {
                // Successfully fetched image data
                imageContainer.innerHTML = ''; // Clear previous content
                const imgElement = document.createElement('img');
                imgElement.src = data.imageUrl;
                imgElement.alt = `Street View Image from ${locationName}`;
                imgElement.style.width = '100%';
                imgElement.style.height = '100%';
                imgElement.style.objectFit = 'cover';
                imageContainer.appendChild(imgElement);

                // Store data for the current location
                currentLocationData = {
                    name: locationName,
                    imageId: data.imageId,
                    coordinates: data.coordinates, // Note: Mapillary provides [lon, lat]
                    compassAngle: data.compassAngle
                };
                console.log('Current location data set:', currentLocationData);
            } else {
                // Handle cases where API returns 200 but data is incomplete
                imageContainer.innerHTML = `<p>Could not load image for ${locationName}. Invalid data received.</p>`;
                console.error('Invalid data received from API:', data);
            }
        } else {
            // Handle API errors (e.g., 4xx, 5xx responses)
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error from API." }));
            imageContainer.innerHTML = `<p>Could not load image for ${locationName}. Status: ${response.status}. ${errorData.error || 'Unknown API error'}</p>`;
            console.error(`Error fetching image for ${locationName}:`, response.status, errorData);
        }
    } catch (error) {
        // Handle network errors or other issues with the fetch call
        imageContainer.innerHTML = `<p>Network error or server unavailable. Could not fetch image for ${locationName}.</p>`;
        console.error(`Network error fetching image for ${locationName}:`, error);
    }
}

/**
 * Loads a new round or ends the game if all locations have been played.
 * Manages UI updates for round display, score, and button states.
 * Clears previous round's map elements.
 */
function loadNewRound() {
    // Check if all locations have been played
    if (currentRound >= locations.length) {
        console.log("Game Over - All locations used.");
        imageContainer.innerHTML = '<p>Game Over! You have completed all rounds.</p>';
        // Update UI for game over state
        submitGuessBtn.style.display = 'none';
        nextRoundBtn.style.display = 'none';
        playAgainBtn.style.display = 'block';
        roundDisplay.textContent = `Game Over! Rounds: ${locations.length} / ${locations.length}`;
        mapClicksEnabled = false; // Disable map clicks
        scoreDisplay.textContent = `Final Score: ${totalScore}`; // Show final total score
        return;
    }

    // Get the current location for this round
    const location = locations[currentRound];
    console.log(`Loading round ${currentRound + 1} / ${locations.length}: ${location.name}`);

    // Update UI displays
    roundDisplay.textContent = `Round: ${currentRound + 1} / ${locations.length}`;
    scoreDisplay.textContent = `Score: ${totalScore}`; // Show current total score

    // Fetch the image for the current location
    fetchImageForLocation(location.lat, location.lon, location.name);

    // Reset map elements from the previous round
    if (guessMarker) {
        map.removeLayer(guessMarker);
        guessMarker = null;
    }
    if (actualLocationMarker) {
        map.removeLayer(actualLocationMarker);
        actualLocationMarker = null;
    }
    if (resultPolyline) {
        map.removeLayer(resultPolyline);
        resultPolyline = null;
    }

    // Reset UI state for the new round
    mapClicksEnabled = true;
    submitGuessBtn.disabled = true; // Guess button disabled until user clicks on map
    submitGuessBtn.style.display = 'block';
    nextRoundBtn.style.display = 'none';
    map.setView([20, 0], 2); // Reset map view to a global perspective
}

// --- Event Listener Setup ---

/**
 * Initializes the application once the DOM is fully loaded.
 * Sets up the Leaflet map, UI element references, and event listeners for buttons.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Leaflet map
    map = L.map('map-container').setView([20, 0], 2); // Default view (world map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Map click listener: Handles user's guess placement
    map.on('click', function(e) {
        if (!mapClicksEnabled) return; // Only process clicks if guessing is enabled

        // Remove previous guess marker if it exists
        if (guessMarker) {
            map.removeLayer(guessMarker);
        }
        // Add new marker at the clicked location and enable submit button
        guessMarker = L.marker(e.latlng).addTo(map);
        submitGuessBtn.disabled = false;
        console.log(`Guess placed at: ${e.latlng.lat}, ${e.latlng.lng}`);
    });

    // Get references to UI elements
    scoreDisplay = document.getElementById('score-display');
    roundDisplay = document.getElementById('round-display');
    submitGuessBtn = document.getElementById('submit-guess-btn');
    nextRoundBtn = document.getElementById('next-round-btn');
    playAgainBtn = document.getElementById('play-again-btn');
    imageContainer = document.getElementById('image-container');

    // Set initial UI state
    scoreDisplay.textContent = `Score: ${totalScore}`;
    submitGuessBtn.disabled = true; // Submit button disabled until first guess

    // "Submit Guess" button event listener
    submitGuessBtn.addEventListener('click', () => {
        if (!guessMarker) {
            alert('Please click on the map to make your guess.');
            return;
        }
        console.log('Submit Guess button clicked');
        submitGuessBtn.disabled = true; // Disable button to prevent multiple submissions
        mapClicksEnabled = false;    // Disable further map clicks for this round

        const guessedLatLng = guessMarker.getLatLng();
        
        // Ensure actual location data is available
        if (!currentLocationData || !currentLocationData.coordinates) {
            console.error('Actual location data is not available.');
            scoreDisplay.textContent = 'Error: Actual location unknown. Cannot calculate score.';
            // Show Next Round button to allow game to continue if possible
            submitGuessBtn.style.display = 'none';
            nextRoundBtn.style.display = 'block';
            return;
        }

        // Convert Mapillary [lon, lat] to Leaflet's [lat, lon] for calculations and markers
        const actualLatLng = [currentLocationData.coordinates[1], currentLocationData.coordinates[0]];

        // Calculate distance and score
        const distance = haversineDistance([guessedLatLng.lat, guessedLatLng.lng], actualLatLng);
        const scoreForRound = calculateScore(distance);
        totalScore += scoreForRound;

        // Log details to console
        console.log(`Guessed Location: Lat: ${guessedLatLng.lat}, Lng: ${guessedLatLng.lng}`);
        console.log(`Actual Location: Lat: ${actualLatLng[0]}, Lng: ${actualLatLng[1]} (${currentLocationData.name})`);
        console.log(`Distance: ${distance.toFixed(2)} km, Score for this round: ${scoreForRound}, Total Score: ${totalScore}`);

        // Update score display with round results
        scoreDisplay.textContent = `Round Score: ${scoreForRound}, Total: ${totalScore}. Distance: ${distance.toFixed(2)} km.`;

        // Display actual location marker (green)
        actualLocationMarker = L.marker(actualLatLng, { 
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
            }) 
        }).addTo(map);
        actualLocationMarker.bindPopup(`<b>Actual Location:</b><br>${currentLocationData.name}`).openPopup();
        
        // Add popup to user's guess marker
        guessMarker.bindPopup(`<b>Your Guess</b>`).openPopup();

        // Draw a line between the guess and actual location
        resultPolyline = L.polyline([guessedLatLng, actualLatLng], {color: 'blue'}).addTo(map);
        
        // Adjust map view to show both markers
        map.fitBounds(L.latLngBounds(guessedLatLng, actualLatLng), {padding: [50, 50]});

        // Switch visibility from "Submit" to "Next Round" button
        submitGuessBtn.style.display = 'none';
        nextRoundBtn.style.display = 'block';
    });

    // "Next Round" button event listener
    nextRoundBtn.addEventListener('click', () => {
        currentRound++; // Increment round counter
        loadNewRound(); // Load the next round (or trigger game over)
    });

    // "Play Again" button event listener
    playAgainBtn.addEventListener('click', () => {
        console.log('Play Again button clicked');
        // Reset game state
        currentRound = 0;
        totalScore = 0;
        
        // Update UI for a new game
        playAgainBtn.style.display = 'none'; // Hide "Play Again" button
        mapClicksEnabled = true;             // Re-enable map clicks
        
        // loadNewRound will handle clearing map elements and setting up the first round
        loadNewRound();
    });

    // --- Initial Game Load ---
    totalScore = 0;     // Ensure score is reset at the very beginning
    currentRound = 0;   // Ensure round is reset at the very beginning
    loadNewRound();     // Load the first round
});
