"""Per-locale App Store text. Run to validate lengths and write metadata.json."""
import json

EXISTING_KW = "timer,days until,widget,recurring,reminders,holidays,calendar,age,years,tracker,planner"
# ponytail: "days until" moves into the subtitle (still indexed), freeing room; nothing else from the live set is dropped.
EN_KW = EXISTING_KW.replace("days until,", "") + ",vacation,wedding,trip"

def en_desc(colour):
    return f"""Count down to the days that matter and count up from the ones you're proud of. Birthdays, trips, holidays, concerts, a due date or a quit streak, all in one clean, iOS-style list.

Features:
- Home Screen widgets in Small, Medium and Large
- Lock Screen widgets
- Live Activities on the Lock Screen and in the Dynamic Island on the big day
- An emoji, {colour} and shape for every countdown
- Yearly recurring events
- Count up from past dates
- Calendar import
- Notifications
- iCloud sync across your devices
- Drag and drop sorting

Unlimited countdowns. No account required."""

EN = dict(subtitle="Days Until Events & Birthdays", keywords=EN_KW,
          promotionalText="Home Screen and Lock Screen widgets, Live Activities and iCloud sync. Unlimited countdowns, no account needed.")

LOCALES = {
    "en-US": {**EN, "description": en_desc("color")},
    "en-CA": {**EN, "description": en_desc("colour")},
    "en-GB": {**EN, "description": en_desc("colour")},
    "da": dict(
        subtitle="Dage til fødselsdag & ferie",
        keywords="nedtælling,fødselsdag,ferie,jul,bryllup,termin,snusfri,røgfri,widget,låseskærm,påmindelse,kalender",
        promotionalText="Widgets på hjemmeskærm og låseskærm, Live Activities og iCloud-synk. Ubegrænsede nedtællinger, ingen konto.",
        description="""Tæl ned til de dage, der betyder noget, og tæl op fra dem, du er stolt af. Fødselsdage, rejser, jul, koncerter, termin eller en snusfri streak, samlet i én enkel liste i iOS-stil.

Funktioner:
- Widgets på hjemmeskærmen i små, mellem og store størrelser
- Widgets på låseskærmen
- Live Activities på låseskærmen og i Dynamic Island på selve dagen
- Emoji, farve og form til hver nedtælling
- Årlige gentagelser
- Tæl op fra datoer i fortiden
- Import fra Kalender
- Notifikationer
- iCloud-synk mellem dine enheder
- Sortér med træk og slip

Ubegrænsede nedtællinger. Ingen konto nødvendig."""),
    "sv": dict(
        subtitle="Dagar kvar till födelsedagar",
        keywords="nedräkning,födelsedag,semester,jul,bröllop,bf,snusfri,rökfri,widget,låsskärm,påminnelse,kalender",
        promotionalText="Widgets på hemskärm och låsskärm, Live Activities och iCloud-synk. Obegränsade nedräkningar, inget konto.",
        description="""Räkna ner till dagarna som betyder något och räkna upp från dem du är stolt över. Födelsedagar, resor, jul, konserter, BF-datum eller en snusfri streak, i en enkel lista i iOS-stil.

Funktioner:
- Widgets på hemskärmen i liten, mellan och stor storlek
- Widgets på låsskärmen
- Live Activities på låsskärmen och i Dynamic Island på den stora dagen
- Emoji, färg och form för varje nedräkning
- Årligen återkommande händelser
- Räkna upp från datum i det förflutna
- Import från Kalender
- Notiser
- iCloud-synk mellan dina enheter
- Sortera med dra och släpp

Obegränsade nedräkningar. Inget konto behövs."""),
    "no": dict(
        subtitle="Dager igjen til bursdag & fest",
        keywords="nedtelling,bursdag,ferie,jul,bryllup,termin,snusfri,røykfri,widget,låseskjerm,påminnelse,kalender",
        promotionalText="Widgets på hjemskjerm og låseskjerm, Live Activities og iCloud-synk. Ubegrensede nedtellinger, ingen konto.",
        description="""Tell ned til dagene som betyr noe, og tell opp fra dem du er stolt av. Bursdager, reiser, jul, konserter, termin eller en snusfri periode, samlet i én enkel liste i iOS-stil.

Funksjoner:
- Widgets på hjemskjermen i liten, middels og stor størrelse
- Widgets på låseskjermen
- Live Activities på låseskjermen og i Dynamic Island på selve dagen
- Emoji, farge og form for hver nedtelling
- Årlig gjentakende hendelser
- Tell opp fra datoer bakover i tid
- Import fra Kalender
- Varsler
- iCloud-synk mellom enhetene dine
- Sorter med dra og slipp

Ubegrensede nedtellinger. Ingen konto nødvendig."""),
    "fi": dict(
        subtitle="Päiviä juhliin ja lomaan",
        keywords="laskuri,syntymäpäivä,loma,joulu,häät,laskettu aika,savuton,widget,lukitusnäyttö,muistutus",
        promotionalText="Widgetit koti- ja lukitusnäytölle, Live Activities ja iCloud-synkronointi. Rajattomasti laskureita, ei tiliä.",
        description="""Laske päiviä tärkeisiin hetkiin ja laske ylöspäin niistä, joista olet ylpeä. Syntymäpäivät, matkat, joulu, konsertit, laskettu aika tai savuton putki, kaikki yhdessä selkeässä iOS-tyylisessä listassa.

Ominaisuudet:
- Kotinäytön widgetit pienenä, keskikokoisena ja suurena
- Lukitusnäytön widgetit
- Live Activities lukitusnäytöllä ja Dynamic Islandissa tärkeänä päivänä
- Emoji, väri ja muoto jokaiselle laskurille
- Vuosittain toistuvat tapahtumat
- Laskenta ylöspäin menneistä päivistä
- Tuonti Kalenterista
- Ilmoitukset
- iCloud-synkronointi laitteidesi välillä
- Järjestäminen vetämällä

Rajattomasti laskureita. Tiliä ei tarvita."""),
    "de-DE": dict(
        subtitle="Tage bis Geburtstag & Urlaub",
        keywords="countdown,geburtstag,urlaub,weihnachten,hochzeit,geburtstermin,rauchfrei,widget,sperrbildschirm",
        promotionalText="Widgets für Home- und Sperrbildschirm, Live Activities und iCloud-Sync. Unbegrenzt viele Countdowns, kein Konto nötig.",
        description="""Zähle die Tage bis zu deinen wichtigen Momenten und zähle hoch ab denen, auf die du stolz bist. Geburtstage, Reisen, Weihnachten, Konzerte, ein Geburtstermin oder eine rauchfreie Serie, alles in einer klaren Liste im iOS-Stil.

Funktionen:
- Widgets für den Home-Bildschirm in klein, mittel und groß
- Widgets für den Sperrbildschirm
- Live Activities auf dem Sperrbildschirm und in der Dynamic Island am großen Tag
- Emoji, Farbe und Form für jeden Countdown
- Jährlich wiederkehrende Termine
- Hochzählen ab vergangenen Daten
- Import aus dem Kalender
- Mitteilungen
- iCloud-Sync zwischen deinen Geräten
- Sortieren per Drag & Drop

Unbegrenzt viele Countdowns. Kein Konto nötig."""),
    "fr-FR": dict(
        subtitle="Jours avant vos grands moments",
        keywords="compte à rebours,anniversaire,vacances,noël,mariage,naissance,sans tabac,widget,écran verrouillé",
        promotionalText="Widgets pour l'écran d'accueil et l'écran verrouillé, Activités en direct et synchro iCloud. Sans compte.",
        description="""Comptez les jours jusqu'aux moments qui comptent, et depuis ceux dont vous êtes fier. Anniversaires, voyages, Noël, concerts, une naissance ou une série sans tabac, le tout dans une liste claire au style iOS.

Fonctionnalités :
- Widgets pour l'écran d'accueil en petit, moyen et grand format
- Widgets pour l'écran verrouillé
- Activités en direct sur l'écran verrouillé et dans la Dynamic Island le jour J
- Un emoji, une couleur et une forme pour chaque compte à rebours
- Événements annuels récurrents
- Décompte depuis une date passée
- Import depuis Calendrier
- Notifications
- Synchronisation iCloud entre vos appareils
- Tri par glisser-déposer

Comptes à rebours illimités. Aucun compte requis."""),
    "es-ES": dict(
        subtitle="Días para cumpleaños y viajes",
        keywords="cuenta atrás,cuenta regresiva,navidad,boda,bebé,vacaciones,sin fumar,widget,pantalla bloqueada",
        promotionalText="Widgets para la pantalla de inicio y la bloqueada, Actividades en Directo y sincronización con iCloud. Sin cuenta.",
        description="""Cuenta los días que faltan para lo que importa y los que llevas desde lo que te enorgullece. Cumpleaños, viajes, Navidad, conciertos, la llegada de un bebé o una racha sin fumar, todo en una lista clara al estilo iOS.

Funciones:
- Widgets para la pantalla de inicio en tamaño pequeño, mediano y grande
- Widgets para la pantalla bloqueada
- Actividades en Directo en la pantalla bloqueada y en la Dynamic Island el gran día
- Emoji, color y forma para cada cuenta atrás
- Eventos que se repiten cada año
- Cuenta hacia arriba desde fechas pasadas
- Importación desde Calendario
- Notificaciones
- Sincronización con iCloud entre tus dispositivos
- Ordena arrastrando y soltando

Cuentas atrás ilimitadas. No necesitas cuenta."""),
    "es-MX": dict(
        subtitle="Días para cumpleaños y viajes",
        keywords="cuenta regresiva,contador de días,navidad,boda,bebé,vacaciones,sin vapear,widget,pantalla bloqueada",
        promotionalText="Widgets para la pantalla de inicio y la bloqueada, Actividades en Vivo y sincronización con iCloud. Sin cuenta.",
        description="""Cuenta los días que faltan para lo que importa y los que llevas desde lo que te enorgullece. Cumpleaños, viajes, Navidad, conciertos, la llegada de un bebé o una racha sin vapear, todo en una lista clara al estilo iOS.

Funciones:
- Widgets para la pantalla de inicio en tamaño chico, mediano y grande
- Widgets para la pantalla bloqueada
- Actividades en Vivo en la pantalla bloqueada y en la Dynamic Island el gran día
- Emoji, color y forma para cada cuenta regresiva
- Eventos que se repiten cada año
- Cuenta hacia arriba desde fechas pasadas
- Importación desde Calendario
- Notificaciones
- Sincronización con iCloud entre tus dispositivos
- Ordena arrastrando y soltando

Cuentas regresivas ilimitadas. No necesitas cuenta."""),
    "fr-CA": dict(
        subtitle="Jours avant vos grands moments",
        keywords="compte à rebours,anniversaire,vacances,noël,mariage,naissance,sans vapoteuse,widget,écran verrouillé",
        promotionalText="Widgets pour l'écran d'accueil et l'écran verrouillé, Activités en direct et synchro iCloud. Sans compte.",
        description=None),  # filled from fr-FR below
    "it": dict(
        subtitle="Giorni a compleanni e vacanze",
        keywords="conto alla rovescia,natale,matrimonio,bebè,senza fumo,widget,schermata di blocco,promemoria",
        promotionalText="Widget per la schermata Home e di blocco, Attività Live e sincronizzazione iCloud. Nessun account richiesto.",
        description="""Conta i giorni che mancano ai momenti importanti e quelli trascorsi da ciò di cui vai fiero. Compleanni, viaggi, Natale, concerti, l'arrivo di un bebè o una serie senza fumo, tutto in un elenco chiaro in stile iOS.

Funzioni:
- Widget per la schermata Home in formato piccolo, medio e grande
- Widget per la schermata di blocco
- Attività Live sulla schermata di blocco e nella Dynamic Island nel grande giorno
- Emoji, colore e forma per ogni conto alla rovescia
- Eventi ricorrenti ogni anno
- Conteggio in avanti da date passate
- Importazione da Calendario
- Notifiche
- Sincronizzazione iCloud tra i tuoi dispositivi
- Ordinamento con trascinamento

Conti alla rovescia illimitati. Nessun account richiesto."""),
    "pt-PT": dict(
        subtitle="Dias até aniversários e férias",
        keywords="contagem decrescente,natal,casamento,bebé,sem fumar,widget,ecrã bloqueado,lembrete,calendário,viagem",
        promotionalText="Widgets para o ecrã principal e o ecrã bloqueado, Atividades em direto e sincronização iCloud. Sem conta.",
        description="""Conta os dias que faltam para o que importa e os dias desde aquilo de que te orgulhas. Aniversários, viagens, Natal, concertos, a chegada de um bebé ou uma série sem fumar, tudo numa lista simples ao estilo iOS.

Funcionalidades:
- Widgets para o ecrã principal em tamanho pequeno, médio e grande
- Widgets para o ecrã bloqueado
- Atividades em direto no ecrã bloqueado e na Dynamic Island no grande dia
- Emoji, cor e forma para cada contagem
- Eventos que se repetem todos os anos
- Contagem a partir de datas passadas
- Importação do Calendário
- Notificações
- Sincronização iCloud entre os teus dispositivos
- Ordenação por arrastar e largar

Contagens ilimitadas. Não é preciso conta."""),
}
LOCALES["fr-CA"]["description"] = LOCALES["fr-FR"]["description"].replace("série sans tabac", "série sans vapoteuse")

LIMITS = dict(subtitle=30, keywords=100, promotionalText=170, description=4000)
bad = [(loc, k, len(v)) for loc, d in LOCALES.items() for k, v in d.items() if len(v) > LIMITS[k]]
assert not bad, bad
assert all(", " not in d["keywords"] for d in LOCALES.values())
json.dump(LOCALES, open("metadata.json", "w"), ensure_ascii=False, indent=1)
for loc, d in LOCALES.items():
    print(f"{loc:6} sub {len(d['subtitle']):2}/30  kw {len(d['keywords']):3}/100  promo {len(d['promotionalText']):3}/170")
