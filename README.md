# Rostvind Kafferosteri – portfolioprojekt (Oskar Axelsson)

Live: https://oskaraxels.github.io/rostvind/ · Portfolio-PDF: https://oskaraxels.github.io/rostvind/portfolio.pdf

Demo-webbshop för ett **fiktivt** specialkafferosteri på Södermalm: kaffebönor, prenumeration och kontorskaffe (B2B).
Byggd för att visa digital marknadsföring i praktiken: samtyckesstyrd GA4 + Meta Pixel, GA4-e-handelsevents via dataLayer,
UTM-hantering och SEO. **Inga riktiga köp eller betalningar – kassan är en demo. Alla foton är AI-genererade.**

## Sidor
`index` · `butik` · 3 produktsidor · `prenumeration` · `kontor` (B2B-offert) · `varukorg` · `kassa` (demo) · `order` · `integritet`

## Koppla på riktiga ID:n
1. **GA4:** analytics.google.com → Admin → Create property → Data streams → Web → kopiera *Measurement ID* (`G-…`).
2. **Meta Pixel:** Events Manager → Connect data sources → Web → kopiera *Dataset/Pixel ID*.
3. Klistra in i `js/config.js` (`GA4_MEASUREMENT_ID`, `META_PIXEL_ID`), commit + push.
Med platshållarna (`G-XXXXXXX`, `000000000000000`) körs sajten i **DEMO-läge**: inga externa skript laddas, alla events loggas.

## Verifiera
- `?debug=1` i adressen visar en eventpanel med varje dataLayer-event och om GA4/Meta tar emot det.
- **GA4:** Admin → DebugView, Reports → Realtime, Monetization → E-commerce purchases. Markera `purchase`, `generate_lead`, `subscribe` som key events.
- **Meta:** Meta Pixel Helper (Chrome) + Events Manager → Test events. Kontrollera att `content_ids` matchar katalogens `item_id` (krävs för dynamiska annonser).
- Testa "Endast nödvändiga": inga anrop till google-analytics.com / facebook.com i Network-fliken.

## Events (GA4 → Meta)
| dataLayer / GA4 | Meta | När |
|---|---|---|
| page_view | PageView | Varje sida efter samtyckesval |
| view_item_list / select_item | – | Produktlistor / klick på produktkort |
| view_item | ViewContent | Produktsida, prenumerationssida |
| add_to_cart / remove_from_cart | AddToCart / – | Varukorgsknappar |
| view_cart | custom | Varukorgen |
| begin_checkout | InitiateCheckout | "Till kassan" |
| add_shipping_info | custom | Steg 1 i kassan |
| add_payment_info | AddPaymentInfo | Demo-betalsätt valt |
| purchase | Purchase | Demo-order (transaction_id `DEMO-…`) |
| subscribe | Subscribe | Demo-order som innehåller prenumeration (predicted_ltv) |
| form_start / generate_lead | – / Lead | B2B-offertformulär (value = uppskattat månadsvärde) |
| cta_click | custom | Knappar med `data-track` |

E-handelsevents pushas som `{event, ecommerce:{…}}` med `ecommerce: null` först (GTM-praxis). Alla events får UTM-parametrar och `event_id` för deduplicering mot Conversions API.
