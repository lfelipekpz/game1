# GeoExplorer Game

GeoExplorer is a browser-based game that challenges your geographical knowledge! You'll be shown a street-level image from Mapillary, and your task is to pinpoint its location on a world map. The closer your guess, the higher your score.

## Features

*   **Interactive Gameplay:** Explore street-level imagery and make your guess on an interactive Leaflet map.
*   **Scoring System:** Earn points based on the proximity of your guess to the actual location. Maximum 5000 points per round.
*   **Multiple Rounds:** Test your skills across 5 different locations per game.
*   **Visual Feedback:** See your guess, the actual location, and the distance between them displayed on the map after each round.
*   **Powered by Modern APIs:** Utilizes Mapillary for images and Leaflet.js for map interaction.
*   **Serverless Backend:** A Vercel serverless function handles requests to the Mapillary API.

## Setup & Deployment (for Vercel)

Follow these steps to deploy your own instance of GeoExplorer:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/geoexplorer-game.git # Replace with your repository URL
    cd geoexplorer-game
    ```

2.  **Deploy with Vercel:**
    *   Go to [Vercel](https://vercel.com) and sign up or log in.
    *   Create a "New Project".
    *   Link your Vercel project to your cloned GitHub repository.

3.  **Configure Mapillary Access Token (Crucial):**
    *   You need a Mapillary Client Access Token for the game to fetch images.
    *   Go to the [Mapillary Developer Dashboard](https://www.mapillary.com/dashboard/developers).
    *   Register a new application (or use an existing one).
    *   Find your "Client Access Token" (it's a long string starting with `MLY|`).
    *   In your Vercel project settings, navigate to "Settings" -> "Environment Variables".
    *   Add a new Environment Variable:
        *   **Name:** `MAPILLARY_ACCESS_TOKEN`
        *   **Value:** Paste your Mapillary Client Access Token.
    *   Ensure the variable is available to all environments (Production, Preview, Development).

4.  **Deploy:**
    *   Vercel should automatically detect that this is a static project with a serverless function in the `api` directory.
    *   No special build commands are needed. Vercel will build and deploy the project.
    *   Once deployed, you'll get a URL to play your game!

## How to Play

1.  When the game loads, an image from an unknown location will be displayed.
2.  Examine the image for clues (landmarks, road signs, scenery, etc.).
3.  Click on the world map to place a marker where you think the image was taken. You can change your marker's position by clicking again.
4.  Once you're confident, click the "Submit Guess" button.
5.  Your score for the round (based on distance) and the total score will be displayed. The map will show your guess, the actual location, and a line connecting them.
6.  Click the "Next Round" button to proceed to the next image.
7.  The game consists of 5 rounds. After the final round, your total score will be shown, and you'll have the option to "Play Again".

## Tech Stack

*   **Frontend:** Vanilla JavaScript, HTML5, CSS3
*   **Mapping:** [Leaflet.js](https://leafletjs.com/)
*   **Imagery:** [Mapillary API](https://www.mapillary.com/platform/api-documentation)
*   **Deployment & Backend:** [Vercel Serverless Functions](https://vercel.com/docs/functions) (for API proxy)

## License

This project is open source and available under the ISC license. See the LICENSE file for more details. (Note: A LICENSE file would need to be added if desired, for now, this is a placeholder statement).
