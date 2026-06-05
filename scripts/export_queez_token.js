/**
 * Incolla nella console di https://queez.org mentre sei loggato.
 * Copia il refresh token e usalo con fetch_queez_chimica_firestore.py
 */
(function exportQueezRefreshToken() {
  const apiKey = "AIzaSyDvUQvnKoDXCQzrRpXAD_vQZO3HLUIlGDc";
  const storageKey = `firebase:authUser:${apiKey}:[DEFAULT]`;

  let raw = localStorage.getItem(storageKey);
  if (!raw) {
    // Prova chiavi alternative (Firebase può usare suffissi diversi)
    const alt = Object.keys(localStorage).find((k) =>
      k.startsWith("firebase:authUser:"),
    );
    if (alt) {
      raw = localStorage.getItem(alt);
      console.log("Trovata chiave:", alt);
    }
  }

  if (!raw) {
    console.error(
      "Nessuna sessione Firebase in localStorage. Accedi prima a queez.org",
    );
    return;
  }

  const user = JSON.parse(raw);
  const refreshToken = user?.stsTokenManager?.refreshToken;
  const idToken = user?.stsTokenManager?.accessToken;

  if (!refreshToken) {
    console.error("Refresh token non trovato nell'oggetto utente:", user);
    return;
  }

  console.log("%c✅ Refresh token (copia per lo script Python):", "color:#2ecc71;font-weight:bold");
  console.log(refreshToken);
  console.log("\nComando:");
  console.log(`export QUEEZ_REFRESH_TOKEN='${refreshToken}'`);
  console.log("python3 scripts/fetch_queez_chimica_firestore.py");

  if (idToken) {
    console.log("\n(ID token valido ~1h, opzionale:)");
    console.log(`export QUEEZ_ID_TOKEN='${idToken}'`);
  }

  try {
    navigator.clipboard.writeText(refreshToken);
    console.log("\n📋 Refresh token copiato negli appunti.");
  } catch {
    /* clipboard non disponibile */
  }
})();
