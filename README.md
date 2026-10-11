# Planer budżetu marketingowego

Aplikacja w czystym HTML, CSS i JavaScript, bez frameworków i bibliotek w czasie działania. Wykres pierścieniowy korzysta z CSS, słupkowy z SVG. Dokładne obliczenia wykorzystują natywne BigInt; zaokrąglenia następują dopiero przy prezentacji wyników. Dane są zapisywane wyłącznie w localStorage przeglądarki. Dotychczasowe zapisane plany są zgodne z nową wersją.

## Uruchomienie bez instalowania zależności

Z katalogu repozytorium:

```sh
python3 -m http.server 5173 --bind 0.0.0.0
```

Otwórz aplikację przez serwer HTTP. Moduły JavaScript wymagają HTTP zamiast otwierania pliku przez `file://`. Czcionki są lokalne, a aplikacja nie wymaga zewnętrznych usług ani kluczy API. Wymagana jest współczesna przeglądarka z obsługą modułów, BigInt i elementu dialog.

## Opcjonalne narzędzia developerskie

Node.js 22.12+ (sprawdzone na 24). Vite służy wyłącznie do pracy developerskiej i tworzenia paczki statycznej.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
npm run build
npm run preview
```

## Testy

```sh
npm test
# Chromium: /usr/bin/chromium lub PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
npm run test:e2e
```

Testy obejmują obliczenia referencyjne z PRD, częściowy i przekroczony przydział, ujemny i wysoki ROI, arytmetykę dziesiętną, walidację pól, zapis, reset, obsługę klawiaturą i widok mobilny 360 px. Automatyczne kontrole dostępności nie zastępują pełnego audytu WCAG ani badania użyteczności.

Plan początkowy pochodzi z przykładu PRD i nie jest rekomendacją. ROI oznacza zysk netto względem przydzielonego kosztu, nie ROAS. Model zakłada stały ROI i niezależne korzyści kanałów. Reset usuwa zapis i przywraca przykład. Konta, eksport, synchronizacja urządzeń i porównywanie scenariuszy pozostają poza zakresem MVP.
