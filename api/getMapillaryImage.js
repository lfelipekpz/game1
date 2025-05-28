// Vercel Serverless Function to fetch a Mapillary image based on latitude and longitude.

module.exports = async (req, res) => {
    // Extract latitude and longitude from query parameters
    const { lat, lon } = req.query;
    
    // Retrieve Mapillary Access Token from environment variables
    const accessToken = process.env.MAPILLARY_ACCESS_TOKEN;

    // Check if the access token is configured
    if (!accessToken) {
        console.error('Mapillary access token not configured.');
        return res.status(500).json({ error: 'Mapillary access token not configured.' });
    }

    // Validate that latitude and longitude are provided
    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    // Parse latitude and longitude to numbers
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Validate that parsed values are numbers
    if (isNaN(latNum) || isNaN(lonNum)) {
        return res.status(400).json({ error: 'Invalid latitude or longitude values.' });
    }

    // Define the bounding box delta (size of the area to search for images)
    // 0.01 degrees is approximately 1.1km at the equator.
    const bboxDelta = 0.01; 

    // Calculate bounding box coordinates
    const minLon = lonNum - bboxDelta;
    const minLat = latNum - bboxDelta;
    const maxLon = lonNum + bboxDelta;
    const maxLat = latNum + bboxDelta;

    // Define fields to request from Mapillary API and image limit
    const fields = 'id,thumb_1024_url,thumb_original_url,computed_geometry,is_pano,compass_angle';
    const limit = 1; // Request only one image as we only use the first one.

    // Construct the Mapillary API URL
    const mapillaryApiUrl = `https://graph.mapillary.com/images?access_token=${accessToken}&fields=${fields}&bbox=${minLon},${minLat},${maxLon},${maxLat}&is_pano=true&limit=${limit}`;

    try {
        // Fetch data from Mapillary API
        const mapillaryResponse = await fetch(mapillaryApiUrl);
        
        // Check if the Mapillary API request was successful
        if (!mapillaryResponse.ok) {
            let errorBody = { error: `Failed to fetch image from Mapillary. Status: ${mapillaryResponse.status}` };
            try {
                // Try to parse a more specific error message from Mapillary
                const mapillaryError = await mapillaryResponse.json();
                if (mapillaryError && mapillaryError.error) {
                    errorBody = mapillaryError; 
                }
            } catch (e) {
                // Log parsing error but use the generic error message
                console.error('Error parsing Mapillary error response:', e);
            }
            return res.status(mapillaryResponse.status || 502).json(errorBody); // 502 for Bad Gateway if status is missing
        }

        // Parse the JSON response from Mapillary
        const mapillaryData = await mapillaryResponse.json();

        // Check if any images were found
        if (mapillaryData.data && mapillaryData.data.length > 0) {
            // Select the first image from the response
            const image = mapillaryData.data[0]; 
            
            // Send the relevant image data back to the client
            res.status(200).json({
                imageId: image.id,
                imageUrl: image.thumb_original_url || image.thumb_1024_url, // Prefer original, fallback to 1024px thumbnail
                coordinates: image.computed_geometry ? image.computed_geometry.coordinates : null, // [longitude, latitude]
                compassAngle: image.compass_angle !== undefined ? image.compass_angle : null
            });
        } else {
            // No images found for the given location
            res.status(404).json({ error: 'No panoramic images found for this location.' });
        }
    } catch (error) {
        // Handle any other errors during the fetch or processing
        console.error('Server error while fetching image from Mapillary:', error);
        res.status(500).json({ error: 'Server error while fetching image from Mapillary.' });
    }
};
