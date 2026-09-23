# Livestock Surveillance Upgrade Contract

This project must preserve existing working functionality and implement the following
production requirements:

1. Real device GPS: Browser Geolocation API with enableHighAccuracy where supported.
   Never hardcode a location and never use IP location as the primary GPS source.
2. Store latitude, longitude, accuracy, timestamp internally, but never show raw
   coordinates in the farmer-facing UI.
3. Reverse-geocode coordinates into readable village/locality, taluka, district,
   state, country and pincode where available.
4. If GPS permission is denied or accuracy is poor, show a truthful retry/error message.
5. Disease prediction must use the actual trained model. Never generate random/fake
   predictions. If the model is unavailable, report that it is unavailable.
6. Validate animal images and reject clearly invalid/non-animal images.
7. Disease cases contain animal/farmer IDs, disease, confidence, internal coordinates,
   readable administrative location, timestamp and verification status.
8. Government and veterinarian dashboards receive case updates and display an
   interactive disease map without unnecessarily exposing raw coordinates.
9. Realtime updates should use WebSocket, with polling fallback.
10. Hotspots are potential clusters based on disease, case count, geographic distance
    and time window. Thresholds must be configurable.
11. Software detection must use terms such as Potential Hotspot, High-Risk Area,
    Suspected Cluster or Under Verification. Only authorized veterinary/government
    personnel can promote a zone to Verified Affected Area.
12. Support nearby-case queries and geographic clustering.
13. Use an i18n architecture rather than hardcoding UI text. At minimum support
    English, Hindi and Marathi, with an extensible language registry. Cloud
    translation keys remain server-side.
14. Make Speak Here functional using browser Speech Recognition where supported,
    with graceful permission/error handling.
15. Use role-based authentication for Farmer, Veterinarian, Government Officer and Admin.
16. Keep secrets in environment variables; never expose API keys in frontend code.
17. Farmer controls (camera/upload/location/refresh/speech/predict/submit/clear/add-new/
    login/logout) must perform real actions.
18. Test the full farmer-to-dashboard flow on an actual Android device.

Important: an AI/software cluster is NOT an official government declaration. Verification
is required before an official affected-zone status is assigned.
