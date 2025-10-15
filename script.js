let map = L.map('map').setView([52.1, 5.1], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

let markers = [];
let sportFilter = document.getElementById('sport');

function loadClubs(data) {
    const sports = new Set();
    data.forEach(club => {
        if (!club.lat || !club.lon) return;
        const marker = L.marker([club.lat, club.lon]).addTo(map);
        marker.bindPopup(`<strong>${club.name}</strong><br>${club.sport}`);
        marker.sport = club.sport;
        markers.push(marker);
        sports.add(club.sport);
    });
    populateFilter([...sports]);
}

function populateFilter(sports) {
    sports.sort().forEach(s => {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        sportFilter.appendChild(option);
    });
}

function filterClubs() {
    const selected = sportFilter.value;
    markers.forEach(marker => {
        if (!selected || marker.sport === selected) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

fetch('clubs.js')
    .then(res => res.text())
    .then(text => {
        const json = JSON.parse(text.split('=')[1].trim().slice(0, -1));
        loadClubs(json);
    });