mapboxgl.accessToken = mapToken;

// Initialize map with Satellite Streets style
const map = new mapboxgl.Map({
    container: 'map', // Ensure an element with id="map" exists in your HTML
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [82.678557, 26.726058], // Initial center coordinates
    zoom: 14,
});

// Add Geocoder to the map
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false, // Disable default marker for search results
});

// Ensure a valid geocoder container exists and append Geocoder
const geocoderContainer = document.getElementById('geocoder');
if (geocoderContainer) {
    geocoderContainer.appendChild(geocoder.onAdd(map));
}

// Add a static pin at the center of the map using a custom HTML marker
const centerPin = document.createElement('div');
centerPin.style.width = '30px';
centerPin.style.height = '30px';
centerPin.style.backgroundImage = 'url("https://cdn-icons-png.flaticon.com/512/684/684908.png")'; // Custom pin image
centerPin.style.backgroundSize = 'contain';
centerPin.style.backgroundRepeat = 'no-repeat';
centerPin.style.position = 'absolute';
centerPin.style.top = '50%';
centerPin.style.left = '50%';
centerPin.style.transform = 'translate(-50%, -50%)';
centerPin.style.pointerEvents = 'none'; // Make it non-interactive
document.getElementById('map').appendChild(centerPin);



// Add zoom and rotation controls to the map
const navControl = new mapboxgl.NavigationControl();
map.addControl(navControl, 'top-right');

// Add a scale control to the map
const scale = new mapboxgl.ScaleControl({
    maxWidth: 100,
    unit: 'metric', // Use 'imperial' for miles/feet
});
map.addControl(scale);

// Add fullscreen control
const fullscreenControl = new mapboxgl.FullscreenControl();
map.addControl(fullscreenControl, 'top-right');

// Allow users to click and add markers
// map.on('click', (event) => {
//     const { lng, lat } = event.lngLat;

//     // Create a new marker
//     new mapboxgl.Marker()
//         .setLngLat([lng, lat])
//         .setPopup(
//             new mapboxgl.Popup().setHTML(`<p>Longitude: ${lng.toFixed(5)}<br>Latitude: ${lat.toFixed(5)}</p>`)
//         )
//         .addTo(map);
// });

// Save map state to localStorage
map.on('moveend', () => {
    const state = {
        center: map.getCenter(),
        zoom: map.getZoom(),
    };
    localStorage.setItem('mapState', JSON.stringify(state));
});

// Restore map state on load
const savedState = localStorage.getItem('mapState');
if (savedState) {
    const { center, zoom } = JSON.parse(savedState);
    map.setCenter(center);
    map.setZoom(zoom);
}

// Geolocation to update map center
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLocation = [position.coords.longitude, position.coords.latitude];
            map.setCenter(userLocation);
            map.setZoom(16);
        },
        (error) => {
            console.error('Error getting location:', error);
            alert('Unable to fetch location. Please enable location services.');
        }
    );
} else {
    alert('Geolocation is not supported by this browser.');
}

// Find the toggle container (div with class 'toggle')
const toggleContainer = document.querySelector('.toggle');

// Check if the container exists
if (toggleContainer) {
    // Create the style toggle button
    const styleToggle = document.createElement('button');
    styleToggle.innerHTML = '<i class="fa-solid fa-layer-group"></i>';
    styleToggle.style.padding = '10px';
    styleToggle.style.backgroundColor = '#000';
    styleToggle.style.color = '#fff';
    styleToggle.style.border = 'none';
    styleToggle.style.cursor = 'pointer';
    styleToggle.style.borderRadius = '5px';
    styleToggle.style.fontSize = '15px';

    // Append the button to the toggle container
    toggleContainer.appendChild(styleToggle);

    // Add event listener for style toggling
    let isSatellite = true; // Track current style
    styleToggle.addEventListener('click', () => {
        isSatellite = !isSatellite;
        map.setStyle(
            isSatellite
                ? 'mapbox://styles/mapbox/satellite-streets-v12'
                : 'mapbox://styles/mapbox/streets-v12'
        );
    });
} else {
    console.error('No div with class "toggle" found in the document.');
}
const detectLocationButton = document.getElementById('detect-location');
const loadingSpinner = document.getElementById('loading-spinner');

if (detectLocationButton) {
    detectLocationButton.addEventListener('click', () => {
        if (navigator.geolocation) {
            // Show the loading spinner
            loadingSpinner.style.display = 'block';

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = [position.coords.longitude, position.coords.latitude];
                    console.log('User Location:', userLocation);

                    // Update the map's center to the user's location
                    map.setCenter(userLocation);
                    map.setZoom(16);

                    // Hide the loading spinner
                    loadingSpinner.style.display = 'none';
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to fetch location. Please enable location services.');
                    
                    // Hide the loading spinner in case of error
                    loadingSpinner.style.display = 'none';
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    });
} else {
    console.error('Button with id "detect-location" not found.');
}


    // Get the form and hidden input elements
const addressForm = document.getElementById('address-form');
const centerCoordinatesInput = document.getElementById('center-coordinates');

// Update hidden input with center coordinates on form submission
addressForm.addEventListener('submit', (e) => {
    const center = map.getCenter(); // Get the center coordinates of the map
    const coordinates = [ center.lng,  center.lat ];
    centerCoordinatesInput.value = JSON.stringify(coordinates); // Store coordinates as JSON string
});

// Array of famous places with their coordinates and names
const places = [
    {
        name: "Raja Murti",
        coordinates: [82.68026689307874,26.730294152003907] // Longitude, Latitude
    },
    {
        name: "State Bank of India",
        coordinates: [82.68055581167687,26.73183193619836]
    },
    {
        name: "Indian Oil - Petrol Pump",
        coordinates: [82.67770337469062,26.724285564188946]
    },
    {
        name: "Rajkot Mandir",
        coordinates: [82.67008643370184,26.72982561262856]
    },
    // Add more places as needed
];
function createCustomMarker(iconUrl) {
    const markerDiv = document.createElement('div');
    markerDiv.style.width = '40px';
    markerDiv.style.height = '40px';
    markerDiv.style.backgroundImage = `url('${iconUrl}')`; // Custom image URL
    markerDiv.style.backgroundSize = 'contain';
    markerDiv.style.backgroundRepeat = 'no-repeat';
    markerDiv.style.cursor = 'pointer';
    return markerDiv;
}
// Add markers for each place
places.forEach(place => {
    const customMarker = createCustomMarker('https://res.cloudinary.com/dzrxswqur/image/upload/v1736961356/location_spbdc5.png'); // Custom marker image

    // Add marker to the map
    new mapboxgl.Marker({ element: customMarker })
        .setLngLat(place.coordinates)
        .addTo(map);

    // Add a label near the marker
    const labelDiv = document.createElement('div');
    labelDiv.style.position = 'absolute';
    labelDiv.style.transform = 'translate(-50%, -50%)';
    labelDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    labelDiv.style.padding = '4px 8px';
    labelDiv.style.borderRadius = '4px';
    labelDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    labelDiv.style.fontFamily = 'Arial, sans-serif';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.color = '#333';
    labelDiv.textContent = place.name;

    // Use a custom DOM overlay for the label
    const overlay = new mapboxgl.Marker({
        element: labelDiv,
        anchor: 'bottom' // Anchor label to appear just above the marker
    }).setLngLat(place.coordinates).addTo(map);
});

// Road coordinates
const roadCoordinates = [
    [82.67880215989317, 26.72634380989595],
    [82.68057097254103, 26.725740595540458]
];

// Add road markers
roadCoordinates.forEach(coord => {
    new mapboxgl.Marker({ color: '#00BFFF' }) // Use light blue markers for the road
        .setLngLat(coord)
        .addTo(map);
});

// Add a GeoJSON source and line for the road
map.on('load', function () {
    map.addSource('road', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: roadCoordinates,
            }
        }
    });

    map.addLayer({
        id: 'road-layer',
        type: 'line',
        source: 'road',
        paint: {
            'line-color': '#00BFFF', // Light blue line color
            'line-width': 4, // Adjust line width
            'line-opacity': 0.8 // Add transparency for a subtle effect
        }
    });
});

// Add control buttons (Zoom and Navigation)
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());