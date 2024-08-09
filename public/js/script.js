// const socket = io();

// if (navigator.geolocation) {
//   navigator.geolocation.watchPosition(
//     (position) => {
//       const { latitude, longitude } = position.coords;
//       socket.emit("send-location", { latitude, longitude });
//     },
//     (error) => {
//       console.log(error);
//     },
//     {
//       enableHighAccuracy: true,
//       timeout: 5000,
//       maximumAge: 0,
//     }
//   );
// }

// const map = L.map("map").setView([0, 0], 16);
// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

// const markers = {};

// socket.on("receive-location", (data) => {
//   const { id, latitude, longitude } = data;
//   map.setView([latitude, longitude]);
//   if (markers[id]) {
//     markers[id].setLatLng([latitude, longitude]);
//   } else {
//     markers[id] = L.marker([latitude, longitude]).addTo(map);
//   }
// });

// socket.on("user-disconnected", (id) => {
//   if (markers[id]) {
//     map.removeLayer(markers[id]);
//     delete markers[id]
//   }
// });

const socket = io();

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      socket.emit("send-location", { latitude, longitude });
    },
    (error) => {
      console.log(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
}

const map = L.map("map").setView([0, 0], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const markers = {};
let markerCount = 0;
let currentRoute = null;

socket.on("receive-location", (data) => {
  const { id, latitude, longitude } = data;
  map.setView([latitude, longitude]);

  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
  } else {
    markerCount++;
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindTooltip(`${ordinalSuffix(markerCount)} person`, { permanent: true, direction: "top" })
      .openTooltip();
  }

  updateShortestRoute();
});

socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
    markerCount--;
  }

  updateShortestRoute();
});

// Function to add ordinal suffix (e.g., "1st", "2nd")
function ordinalSuffix(i) {
  const j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) return i + "st";
  if (j == 2 && k != 12) return i + "nd";
  if (j == 3 && k != 13) return i + "rd";
  return i + "th";
}

// Function to calculate the Haversine distance
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the Earth in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Function to find and display the shortest distance between markers
function updateShortestRoute() {
  const markerIds = Object.keys(markers);
  if (markerIds.length < 2) return;

  let shortestDistance = Infinity;
  let closestPair = null;

  for (let i = 0; i < markerIds.length - 1; i++) {
    for (let j = i + 1; j < markerIds.length; j++) {
      const markerA = markers[markerIds[i]];
      const markerB = markers[markerIds[j]];

      const distance = haversine(
        markerA.getLatLng().lat,
        markerA.getLatLng().lng,
        markerB.getLatLng().lat,
        markerB.getLatLng().lng
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestPair = [markerA, markerB];
      }
    }
  }

  if (closestPair) {
    const [markerA, markerB] = closestPair;

    // Clear existing route if any
    if (currentRoute) {
      map.removeControl(currentRoute);
    }

    // Create a route between the closest markers
    currentRoute = L.Routing.control({
      waypoints: [
        L.latLng(markerA.getLatLng().lat, markerA.getLatLng().lng),
        L.latLng(markerB.getLatLng().lat, markerB.getLatLng().lng)
      ],
      lineOptions: {
        styles: [{ color: 'green', weight: 5, opacity: 0.7 }]
      },
      createMarker: function() { return null; }, // Do not create new markers
      addWaypoints: false
    }).addTo(map);

    // Add tooltips to the closest pair
    markerA.bindTooltip(`Shortest Distance to Person`, { permanent: true, direction: "bottom" }).openTooltip();
    markerB.bindTooltip(`Shortest Distance to Person`, { permanent: true, direction: "bottom" }).openTooltip();
  }
}


