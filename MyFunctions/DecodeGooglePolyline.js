function DecodeGooglePolyline(encodedString) {
  if (!encodedString) {
    return [];
  }

  let coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const len = encodedString.length;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byteValue;

    // Enlem (Latitude) farkını oku
    do {
      if (index >= len) break; // Güvenlik kontrolü
      byteValue = encodedString.charCodeAt(index++) - 63;
      result |= (byteValue & 0x1f) << shift;
      shift += 5;
    } while (byteValue >= 0x20 && index < len); // Devam biti (0x20) kontrolü

    // Sonucu işaretli sayıya çevir ve enlemi güncelle
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    // Boylam (Longitude) farkını oku
    do {
      if (index >= len) break; // Güvenlik kontrolü
      byteValue = encodedString.charCodeAt(index++) - 63;
      result |= (byteValue & 0x1f) << shift;
      shift += 5;
    } while (byteValue >= 0x20 && index < len); // Devam biti kontrolü

    // Sonucu işaretli sayıya çevir ve boylamı güncelle
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    // Hesaplanan enlem ve boylamı diziye ekle (1e5'e bölerek)
    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates;
}

module.exports = DecodeGooglePolyline;