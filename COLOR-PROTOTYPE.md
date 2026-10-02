# Dezente Akzentfarbe für CarCheck v2

Frage: Welche kleine Farbergänzung passt in das bereits freigegebene Layout?

Zwei Varianten auf der bestehenden Garage, `?variant=A` (Blau) und `?variant=B` (Petrol). Logo, Hauptaktionen, aktive Navigation und Fahrzeugicons verwenden die Farbe. Flächen, Text und Informationsdichte bleiben bestehen.

Start: `CARCHECK_DEMO=1 WATCHPACK_POLLING=1000 bunx next dev --port 3110 --hostname 127.0.0.1`.

Bene hat am 2026-10-02 A: Blau gewählt. Die semantischen Tokens werden ohne Prototyp-Schalter in den Implementierungsbranch übernommen. Die Demo verwendet ausschließlich flüchtige lokale Beispieldaten.

Anschließend hat Bene einen weicheren Hintergrund gewünscht. Die endgültige Variante verwendet Schiefergrau (`#0f1115`) mit etwas helleren Header- und Seitenleistenflächen. Der Farbvergleich ist auf diese Flächen aktualisiert.
