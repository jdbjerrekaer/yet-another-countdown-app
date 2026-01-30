import AppIntents
import Foundation
import WidgetKit

private let countdownAppGroupIdentifier = "group.countdown.timer.data"
private let countdownWidgetDataKey = "widgetData"
private let defaultEmoji = "\u{1F4C5}"

private struct SiriLocalization {
    static let supportedLocales = ["en", "es", "it", "pt", "de", "ru", "fr", "da", "sv", "no", "fi"]
    static let localeAliases = ["no": "nb"]
    static let localeReverseAliases = ["nb": "no"]
    
    private static var localeKey: String {
        let lang = (Locale.current.languageCode ?? "en").lowercased()
        if supportedLocales.contains(lang) {
            return lang
        }
        if let mapped = localeReverseAliases[lang] {
            return mapped
        }
        return "en"
    }
    
    private static func value(_ key: String, _ locale: String, _ fallback: String) -> String {
        return strings[locale]?[key] ?? strings["en"]?[key] ?? fallback
    }
    
    static func text(_ key: String, fallback: String) -> String {
        return value(key, localeKey, fallback)
    }
    
    static func format(_ key: String, fallback: String, _ args: CVarArg...) -> String {
        let template = value(key, localeKey, fallback)
        return String(format: template, locale: Locale.current, arguments: args)
    }
    
    static func phrase(_ key: String, fallback: String) -> String {
        let appNameToken = "\(.applicationName)"
        let template = value(key, localeKey, fallback)
        return String(format: template, appNameToken)
    }
    
    static func listCountDialog(count: Int) -> String {
        if count == 0 {
            return text("list.none", fallback: "You do not have any countdowns yet.")
        }
        if count == 1 {
            return format("list.one", fallback: "You have %d countdown.", count)
        }
        return format("list.many", fallback: "You have %d countdowns.", count)
    }
    
    static func relativeText(dayDelta: Int) -> String {
        if dayDelta == 0 {
            return text("relative.today", fallback: "today")
        }
        if dayDelta > 0 {
            return format("relative.inDays", fallback: "in %d days", dayDelta)
        }
        return format("relative.daysAgo", fallback: "%d days ago", abs(dayDelta))
    }
    
    private static let strings: [String: [String: String]] = [
        "en": [
            "intent.create.title": "Create Countdown",
            "intent.create.desc": "Create a new countdown.",
            "intent.list.title": "List Countdowns",
            "intent.list.desc": "List all countdowns.",
            "intent.get.title": "Get Countdown Details",
            "intent.get.desc": "Get details for a countdown.",
            "intent.relative.title": "Get Countdown Relative Time",
            "intent.relative.desc": "Get relative time until a countdown.",
            "param.title": "Title",
            "param.targetDate": "Target Date",
            "param.emoji": "Emoji",
            "param.emojiColor": "Emoji Color (Hex)",
            "param.recurringOverride": "Recurring (Override)",
            "param.countdown": "Countdown",
            "dialog.created": "Created %@ %@ for %@.",
            "dialog.notFound": "Countdown not found.",
            "dialog.couldNotReadDate": "I could not read the date for %@.",
            "dialog.onDate": "%@ %@ on %@",
            "dialog.relative": "%@ is %@.",
            "relative.today": "today",
            "relative.inDays": "in %d days",
            "relative.daysAgo": "%d days ago",
            "list.none": "You do not have any countdowns yet.",
            "list.one": "You have %d countdown.",
            "list.many": "You have %d countdowns.",
            "phrase.create1": "Create a countdown in %@",
            "phrase.create2": "Add a countdown in %@",
            "phrase.list1": "List my countdowns in %@",
            "phrase.list2": "Show my countdowns in %@",
            "phrase.get1": "Get countdown details in %@",
            "phrase.get2": "Show countdown details in %@",
            "phrase.get3": "What date is my countdown in %@",
            "phrase.get4": "What date is my %@ countdown",
            "phrase.get5": "When is my countdown in %@",
            "phrase.get6": "When is my %@ countdown",
            "phrase.rel1": "How long until my countdown in %@",
            "phrase.rel2": "How long until my %@ countdown",
            "phrase.rel3": "How many days until my countdown in %@",
            "phrase.rel4": "How many days until my %@ countdown",
            "phrase.rel5": "Days until my countdown in %@",
            "phrase.rel6": "Days until my %@ countdown"
        ],
        "es": [
            "intent.create.title": "Crear cuenta atrás",
            "intent.create.desc": "Crear una nueva cuenta atrás.",
            "intent.list.title": "Listar cuentas atrás",
            "intent.list.desc": "Listar todas las cuentas atrás.",
            "intent.get.title": "Obtener detalles de la cuenta atrás",
            "intent.get.desc": "Obtener detalles de una cuenta atrás.",
            "intent.relative.title": "Obtener tiempo relativo de la cuenta atrás",
            "intent.relative.desc": "Obtener el tiempo relativo hasta una cuenta atrás.",
            "param.title": "Título",
            "param.targetDate": "Fecha objetivo",
            "param.emoji": "Emoji",
            "param.emojiColor": "Color del emoji (Hex)",
            "param.recurringOverride": "Recurrente (anular)",
            "param.countdown": "Cuenta atrás",
            "dialog.created": "Se creó %@ %@ para %@.",
            "dialog.notFound": "No se encontró la cuenta atrás.",
            "dialog.couldNotReadDate": "No pude leer la fecha de %@.",
            "dialog.onDate": "%@ %@ el %@",
            "dialog.relative": "%@ es %@.",
            "relative.today": "hoy",
            "relative.inDays": "en %d días",
            "relative.daysAgo": "hace %d días",
            "list.none": "Todavía no tienes cuentas atrás.",
            "list.one": "Tienes %d cuenta atrás.",
            "list.many": "Tienes %d cuentas atrás.",
            "phrase.create1": "Crear una cuenta atrás en %@",
            "phrase.create2": "Añadir una cuenta atrás en %@",
            "phrase.list1": "Listar mis cuentas atrás en %@",
            "phrase.list2": "Mostrar mis cuentas atrás en %@",
            "phrase.get1": "Obtener detalles de la cuenta atrás en %@",
            "phrase.get2": "Mostrar detalles de la cuenta atrás en %@",
            "phrase.get3": "¿Qué fecha es mi cuenta atrás en %@?",
            "phrase.get4": "¿Qué fecha es mi cuenta atrás de %@?",
            "phrase.get5": "¿Cuándo es mi cuenta atrás en %@?",
            "phrase.get6": "¿Cuándo es mi cuenta atrás de %@?",
            "phrase.rel1": "¿Cuánto falta para mi cuenta atrás en %@?",
            "phrase.rel2": "¿Cuánto falta para mi cuenta atrás de %@?",
            "phrase.rel3": "¿Cuántos días faltan para mi cuenta atrás en %@?",
            "phrase.rel4": "¿Cuántos días faltan para mi cuenta atrás de %@?",
            "phrase.rel5": "Días hasta mi cuenta atrás en %@",
            "phrase.rel6": "Días hasta mi cuenta atrás de %@"
        ],
        "it": [
            "intent.create.title": "Crea conto alla rovescia",
            "intent.create.desc": "Crea un nuovo conto alla rovescia.",
            "intent.list.title": "Elenca conti alla rovescia",
            "intent.list.desc": "Elenca tutti i conti alla rovescia.",
            "intent.get.title": "Ottieni dettagli del conto alla rovescia",
            "intent.get.desc": "Ottieni i dettagli di un conto alla rovescia.",
            "intent.relative.title": "Ottieni tempo relativo del conto alla rovescia",
            "intent.relative.desc": "Ottieni il tempo relativo fino a un conto alla rovescia.",
            "param.title": "Titolo",
            "param.targetDate": "Data obiettivo",
            "param.emoji": "Emoji",
            "param.emojiColor": "Colore emoji (Hex)",
            "param.recurringOverride": "Ricorrente (override)",
            "param.countdown": "Conto alla rovescia",
            "dialog.created": "Creato %@ %@ per %@.",
            "dialog.notFound": "Conto alla rovescia non trovato.",
            "dialog.couldNotReadDate": "Non sono riuscito a leggere la data per %@.",
            "dialog.onDate": "%@ %@ il %@",
            "dialog.relative": "%@ è %@.",
            "relative.today": "oggi",
            "relative.inDays": "tra %d giorni",
            "relative.daysAgo": "%d giorni fa",
            "list.none": "Non hai ancora conti alla rovescia.",
            "list.one": "Hai %d conto alla rovescia.",
            "list.many": "Hai %d conti alla rovescia.",
            "phrase.create1": "Crea un conto alla rovescia in %@",
            "phrase.create2": "Aggiungi un conto alla rovescia in %@",
            "phrase.list1": "Elenca i miei conti alla rovescia in %@",
            "phrase.list2": "Mostra i miei conti alla rovescia in %@",
            "phrase.get1": "Ottieni dettagli del conto alla rovescia in %@",
            "phrase.get2": "Mostra dettagli del conto alla rovescia in %@",
            "phrase.get3": "Che data è il mio conto alla rovescia in %@?",
            "phrase.get4": "Che data è il mio conto alla rovescia di %@?",
            "phrase.get5": "Quando è il mio conto alla rovescia in %@?",
            "phrase.get6": "Quando è il mio conto alla rovescia di %@?",
            "phrase.rel1": "Quanto manca al mio conto alla rovescia in %@?",
            "phrase.rel2": "Quanto manca al mio conto alla rovescia di %@?",
            "phrase.rel3": "Quanti giorni mancano al mio conto alla rovescia in %@?",
            "phrase.rel4": "Quanti giorni mancano al mio conto alla rovescia di %@?",
            "phrase.rel5": "Giorni al mio conto alla rovescia in %@",
            "phrase.rel6": "Giorni al mio conto alla rovescia di %@"
        ],
        "pt": [
            "intent.create.title": "Criar contagem regressiva",
            "intent.create.desc": "Criar uma nova contagem regressiva.",
            "intent.list.title": "Listar contagens regressivas",
            "intent.list.desc": "Listar todas as contagens regressivas.",
            "intent.get.title": "Obter detalhes da contagem regressiva",
            "intent.get.desc": "Obter detalhes de uma contagem regressiva.",
            "intent.relative.title": "Obter tempo relativo da contagem regressiva",
            "intent.relative.desc": "Obter o tempo relativo até uma contagem regressiva.",
            "param.title": "Título",
            "param.targetDate": "Data alvo",
            "param.emoji": "Emoji",
            "param.emojiColor": "Cor do emoji (Hex)",
            "param.recurringOverride": "Recorrente (substituir)",
            "param.countdown": "Contagem regressiva",
            "dialog.created": "Criado %@ %@ para %@.",
            "dialog.notFound": "Contagem regressiva não encontrada.",
            "dialog.couldNotReadDate": "Não consegui ler a data para %@.",
            "dialog.onDate": "%@ %@ em %@",
            "dialog.relative": "%@ é %@.",
            "relative.today": "hoje",
            "relative.inDays": "em %d dias",
            "relative.daysAgo": "há %d dias",
            "list.none": "Você ainda não tem contagens regressivas.",
            "list.one": "Você tem %d contagem regressiva.",
            "list.many": "Você tem %d contagens regressivas.",
            "phrase.create1": "Criar uma contagem regressiva no %@",
            "phrase.create2": "Adicionar uma contagem regressiva no %@",
            "phrase.list1": "Listar minhas contagens regressivas no %@",
            "phrase.list2": "Mostrar minhas contagens regressivas no %@",
            "phrase.get1": "Obter detalhes da contagem regressiva no %@",
            "phrase.get2": "Mostrar detalhes da contagem regressiva no %@",
            "phrase.get3": "Qual a data da minha contagem regressiva no %@?",
            "phrase.get4": "Qual a data da minha contagem regressiva do %@?",
            "phrase.get5": "Quando é minha contagem regressiva no %@?",
            "phrase.get6": "Quando é minha contagem regressiva do %@?",
            "phrase.rel1": "Quanto falta para minha contagem regressiva no %@?",
            "phrase.rel2": "Quanto falta para minha contagem regressiva do %@?",
            "phrase.rel3": "Quantos dias faltam para minha contagem regressiva no %@?",
            "phrase.rel4": "Quantos dias faltam para minha contagem regressiva do %@?",
            "phrase.rel5": "Dias até minha contagem regressiva no %@",
            "phrase.rel6": "Dias até minha contagem regressiva do %@"
        ],
        "de": [
            "intent.create.title": "Countdown erstellen",
            "intent.create.desc": "Einen neuen Countdown erstellen.",
            "intent.list.title": "Countdowns auflisten",
            "intent.list.desc": "Alle Countdowns auflisten.",
            "intent.get.title": "Countdown-Details abrufen",
            "intent.get.desc": "Details zu einem Countdown abrufen.",
            "intent.relative.title": "Relative Countdown-Zeit abrufen",
            "intent.relative.desc": "Relative Zeit bis zu einem Countdown abrufen.",
            "param.title": "Titel",
            "param.targetDate": "Zieldatum",
            "param.emoji": "Emoji",
            "param.emojiColor": "Emoji-Farbe (Hex)",
            "param.recurringOverride": "Wiederkehrend (Überschreiben)",
            "param.countdown": "Countdown",
            "dialog.created": "Erstellt %@ %@ für %@.",
            "dialog.notFound": "Countdown nicht gefunden.",
            "dialog.couldNotReadDate": "Das Datum für %@ konnte nicht gelesen werden.",
            "dialog.onDate": "%@ %@ am %@",
            "dialog.relative": "%@ ist %@.",
            "relative.today": "heute",
            "relative.inDays": "in %d Tagen",
            "relative.daysAgo": "vor %d Tagen",
            "list.none": "Du hast noch keine Countdowns.",
            "list.one": "Du hast %d Countdown.",
            "list.many": "Du hast %d Countdowns.",
            "phrase.create1": "Countdown in %@ erstellen",
            "phrase.create2": "Countdown in %@ hinzufügen",
            "phrase.list1": "Meine Countdowns in %@ auflisten",
            "phrase.list2": "Meine Countdowns in %@ anzeigen",
            "phrase.get1": "Countdown-Details in %@ abrufen",
            "phrase.get2": "Countdown-Details in %@ anzeigen",
            "phrase.get3": "Welches Datum hat mein Countdown in %@?",
            "phrase.get4": "Welches Datum hat mein %@ Countdown?",
            "phrase.get5": "Wann ist mein Countdown in %@?",
            "phrase.get6": "Wann ist mein %@ Countdown?",
            "phrase.rel1": "Wie lange bis zu meinem Countdown in %@?",
            "phrase.rel2": "Wie lange bis zu meinem %@ Countdown?",
            "phrase.rel3": "Wie viele Tage bis zu meinem Countdown in %@?",
            "phrase.rel4": "Wie viele Tage bis zu meinem %@ Countdown?",
            "phrase.rel5": "Tage bis zu meinem Countdown in %@",
            "phrase.rel6": "Tage bis zu meinem %@ Countdown"
        ],
        "ru": [
            "intent.create.title": "Создать обратный отсчёт",
            "intent.create.desc": "Создать новый обратный отсчёт.",
            "intent.list.title": "Список обратных отсчётов",
            "intent.list.desc": "Показать все обратные отсчёты.",
            "intent.get.title": "Получить детали обратного отсчёта",
            "intent.get.desc": "Получить детали обратного отсчёта.",
            "intent.relative.title": "Относительное время обратного отсчёта",
            "intent.relative.desc": "Получить относительное время до обратного отсчёта.",
            "param.title": "Название",
            "param.targetDate": "Дата",
            "param.emoji": "Эмодзи",
            "param.emojiColor": "Цвет эмодзи (Hex)",
            "param.recurringOverride": "Повтор (переопределить)",
            "param.countdown": "Обратный отсчёт",
            "dialog.created": "Создано %@ %@ на %@.",
            "dialog.notFound": "Обратный отсчёт не найден.",
            "dialog.couldNotReadDate": "Не удалось прочитать дату для %@.",
            "dialog.onDate": "%@ %@ на %@",
            "dialog.relative": "%@ — %@.",
            "relative.today": "сегодня",
            "relative.inDays": "через %d дней",
            "relative.daysAgo": "%d дней назад",
            "list.none": "У вас пока нет обратных отсчётов.",
            "list.one": "У вас %d обратный отсчёт.",
            "list.many": "У вас %d обратных отсчётов.",
            "phrase.create1": "Создать обратный отсчёт в %@",
            "phrase.create2": "Добавить обратный отсчёт в %@",
            "phrase.list1": "Показать мои обратные отсчёты в %@",
            "phrase.list2": "Список моих обратных отсчётов в %@",
            "phrase.get1": "Получить детали обратного отсчёта в %@",
            "phrase.get2": "Показать детали обратного отсчёта в %@",
            "phrase.get3": "Какая дата моего обратного отсчёта в %@?",
            "phrase.get4": "Какая дата моего %@ обратного отсчёта?",
            "phrase.get5": "Когда мой обратный отсчёт в %@?",
            "phrase.get6": "Когда мой %@ обратный отсчёт?",
            "phrase.rel1": "Сколько времени до моего обратного отсчёта в %@?",
            "phrase.rel2": "Сколько времени до моего %@ обратного отсчёта?",
            "phrase.rel3": "Сколько дней до моего обратного отсчёта в %@?",
            "phrase.rel4": "Сколько дней до моего %@ обратного отсчёта?",
            "phrase.rel5": "Дней до моего обратного отсчёта в %@",
            "phrase.rel6": "Дней до моего %@ обратного отсчёта?"
        ],
        "fr": [
            "intent.create.title": "Créer un compte à rebours",
            "intent.create.desc": "Créer un nouveau compte à rebours.",
            "intent.list.title": "Lister les comptes à rebours",
            "intent.list.desc": "Lister tous les comptes à rebours.",
            "intent.get.title": "Obtenir les détails du compte à rebours",
            "intent.get.desc": "Obtenir les détails d’un compte à rebours.",
            "intent.relative.title": "Obtenir le temps relatif du compte à rebours",
            "intent.relative.desc": "Obtenir le temps relatif jusqu’à un compte à rebours.",
            "param.title": "Titre",
            "param.targetDate": "Date cible",
            "param.emoji": "Emoji",
            "param.emojiColor": "Couleur de l’emoji (Hex)",
            "param.recurringOverride": "Récurrent (remplacer)",
            "param.countdown": "Compte à rebours",
            "dialog.created": "Créé %@ %@ pour %@.",
            "dialog.notFound": "Compte à rebours introuvable.",
            "dialog.couldNotReadDate": "Je n’ai pas pu lire la date pour %@.",
            "dialog.onDate": "%@ %@ le %@",
            "dialog.relative": "%@ est %@.",
            "relative.today": "aujourd’hui",
            "relative.inDays": "dans %d jours",
            "relative.daysAgo": "il y a %d jours",
            "list.none": "Vous n’avez pas encore de comptes à rebours.",
            "list.one": "Vous avez %d compte à rebours.",
            "list.many": "Vous avez %d comptes à rebours.",
            "phrase.create1": "Créer un compte à rebours dans %@",
            "phrase.create2": "Ajouter un compte à rebours dans %@",
            "phrase.list1": "Lister mes comptes à rebours dans %@",
            "phrase.list2": "Afficher mes comptes à rebours dans %@",
            "phrase.get1": "Obtenir les détails du compte à rebours dans %@",
            "phrase.get2": "Afficher les détails du compte à rebours dans %@",
            "phrase.get3": "Quelle date est mon compte à rebours dans %@ ?",
            "phrase.get4": "Quelle date est mon compte à rebours de %@ ?",
            "phrase.get5": "Quand est mon compte à rebours dans %@ ?",
            "phrase.get6": "Quand est mon compte à rebours de %@ ?",
            "phrase.rel1": "Combien de temps jusqu’à mon compte à rebours dans %@ ?",
            "phrase.rel2": "Combien de temps jusqu’à mon compte à rebours de %@ ?",
            "phrase.rel3": "Combien de jours jusqu’à mon compte à rebours dans %@ ?",
            "phrase.rel4": "Combien de jours jusqu’à mon compte à rebours de %@ ?",
            "phrase.rel5": "Jours jusqu’à mon compte à rebours dans %@",
            "phrase.rel6": "Jours jusqu’à mon compte à rebours de %@"
        ],
        "da": [
            "intent.create.title": "Opret nedtælling",
            "intent.create.desc": "Opret en ny nedtælling.",
            "intent.list.title": "Vis nedtællinger",
            "intent.list.desc": "Vis alle nedtællinger.",
            "intent.get.title": "Hent nedtællingsdetaljer",
            "intent.get.desc": "Hent detaljer for en nedtælling.",
            "intent.relative.title": "Hent relativ tid for nedtælling",
            "intent.relative.desc": "Hent relativ tid til en nedtælling.",
            "param.title": "Titel",
            "param.targetDate": "Måldato",
            "param.emoji": "Emoji",
            "param.emojiColor": "Emoji-farve (Hex)",
            "param.recurringOverride": "Gentagende (overskriv)",
            "param.countdown": "Nedtælling",
            "dialog.created": "Oprettet %@ %@ til %@.",
            "dialog.notFound": "Nedtælling ikke fundet.",
            "dialog.couldNotReadDate": "Jeg kunne ikke læse datoen for %@.",
            "dialog.onDate": "%@ %@ den %@",
            "dialog.relative": "%@ er %@.",
            "relative.today": "i dag",
            "relative.inDays": "om %d dage",
            "relative.daysAgo": "%d dage siden",
            "list.none": "Du har ingen nedtællinger endnu.",
            "list.one": "Du har %d nedtælling.",
            "list.many": "Du har %d nedtællinger.",
            "phrase.create1": "Opret en nedtælling i %@",
            "phrase.create2": "Tilføj en nedtælling i %@",
            "phrase.list1": "Vis mine nedtællinger i %@",
            "phrase.list2": "Vis mine nedtællinger i %@",
            "phrase.get1": "Hent nedtællingsdetaljer i %@",
            "phrase.get2": "Vis nedtællingsdetaljer i %@",
            "phrase.get3": "Hvilken dato er min nedtælling i %@",
            "phrase.get4": "Hvilken dato er min %@ nedtælling",
            "phrase.get5": "Hvornår er min nedtælling i %@",
            "phrase.get6": "Hvornår er min %@ nedtælling",
            "phrase.rel1": "Hvor lang tid til min nedtælling i %@",
            "phrase.rel2": "Hvor lang tid til min %@ nedtælling",
            "phrase.rel3": "Hvor mange dage til min nedtælling i %@",
            "phrase.rel4": "Hvor mange dage til min %@ nedtælling",
            "phrase.rel5": "Dage til min nedtælling i %@",
            "phrase.rel6": "Dage til min %@ nedtælling"
        ],
        "sv": [
            "intent.create.title": "Skapa nedräkning",
            "intent.create.desc": "Skapa en ny nedräkning.",
            "intent.list.title": "Lista nedräkningar",
            "intent.list.desc": "Lista alla nedräkningar.",
            "intent.get.title": "Hämta nedräkningsdetaljer",
            "intent.get.desc": "Hämta detaljer för en nedräkning.",
            "intent.relative.title": "Hämta relativ tid för nedräkning",
            "intent.relative.desc": "Hämta relativ tid till en nedräkning.",
            "param.title": "Titel",
            "param.targetDate": "Måldatum",
            "param.emoji": "Emoji",
            "param.emojiColor": "Emoji-färg (Hex)",
            "param.recurringOverride": "Återkommande (åsidosätt)",
            "param.countdown": "Nedräkning",
            "dialog.created": "Skapade %@ %@ för %@.",
            "dialog.notFound": "Nedräkning hittades inte.",
            "dialog.couldNotReadDate": "Jag kunde inte läsa datumet för %@.",
            "dialog.onDate": "%@ %@ den %@",
            "dialog.relative": "%@ är %@.",
            "relative.today": "idag",
            "relative.inDays": "om %d dagar",
            "relative.daysAgo": "%d dagar sedan",
            "list.none": "Du har inga nedräkningar ännu.",
            "list.one": "Du har %d nedräkning.",
            "list.many": "Du har %d nedräkningar.",
            "phrase.create1": "Skapa en nedräkning i %@",
            "phrase.create2": "Lägg till en nedräkning i %@",
            "phrase.list1": "Lista mina nedräkningar i %@",
            "phrase.list2": "Visa mina nedräkningar i %@",
            "phrase.get1": "Hämta nedräkningsdetaljer i %@",
            "phrase.get2": "Visa nedräkningsdetaljer i %@",
            "phrase.get3": "Vilket datum är min nedräkning i %@",
            "phrase.get4": "Vilket datum är min %@ nedräkning",
            "phrase.get5": "När är min nedräkning i %@",
            "phrase.get6": "När är min %@ nedräkning",
            "phrase.rel1": "Hur lång tid till min nedräkning i %@",
            "phrase.rel2": "Hur lång tid till min %@ nedräkning",
            "phrase.rel3": "Hur många dagar till min nedräkning i %@",
            "phrase.rel4": "Hur många dagar till min %@ nedräkning",
            "phrase.rel5": "Dagar till min nedräkning i %@",
            "phrase.rel6": "Dagar till min %@ nedräkning"
        ],
        "no": [
            "intent.create.title": "Opprett nedtelling",
            "intent.create.desc": "Opprett en ny nedtelling.",
            "intent.list.title": "Vis nedtellinger",
            "intent.list.desc": "Vis alle nedtellinger.",
            "intent.get.title": "Hent nedtellingsdetaljer",
            "intent.get.desc": "Hent detaljer for en nedtelling.",
            "intent.relative.title": "Hent relativ tid for nedtelling",
            "intent.relative.desc": "Hent relativ tid til en nedtelling.",
            "param.title": "Tittel",
            "param.targetDate": "Måldato",
            "param.emoji": "Emoji",
            "param.emojiColor": "Emoji-farge (Hex)",
            "param.recurringOverride": "Gjentakende (overstyr)",
            "param.countdown": "Nedtelling",
            "dialog.created": "Opprettet %@ %@ for %@.",
            "dialog.notFound": "Nedtelling ikke funnet.",
            "dialog.couldNotReadDate": "Jeg kunne ikke lese datoen for %@.",
            "dialog.onDate": "%@ %@ den %@",
            "dialog.relative": "%@ er %@.",
            "relative.today": "i dag",
            "relative.inDays": "om %d dager",
            "relative.daysAgo": "%d dager siden",
            "list.none": "Du har ingen nedtellinger ennå.",
            "list.one": "Du har %d nedtelling.",
            "list.many": "Du har %d nedtellinger.",
            "phrase.create1": "Opprett en nedtelling i %@",
            "phrase.create2": "Legg til en nedtelling i %@",
            "phrase.list1": "Vis mine nedtellinger i %@",
            "phrase.list2": "Vis mine nedtellinger i %@",
            "phrase.get1": "Hent nedtellingsdetaljer i %@",
            "phrase.get2": "Vis nedtellingsdetaljer i %@",
            "phrase.get3": "Hvilken dato er min nedtelling i %@",
            "phrase.get4": "Hvilken dato er min %@ nedtelling",
            "phrase.get5": "Når er min nedtelling i %@",
            "phrase.get6": "Når er min %@ nedtelling",
            "phrase.rel1": "Hvor lang tid til min nedtelling i %@",
            "phrase.rel2": "Hvor lang tid til min %@ nedtelling",
            "phrase.rel3": "Hvor mange dager til min nedtelling i %@",
            "phrase.rel4": "Hvor mange dager til min %@ nedtelling",
            "phrase.rel5": "Dager til min nedtelling i %@",
            "phrase.rel6": "Dager til min %@ nedtelling"
        ],
        "fi": [
            "intent.create.title": "Luo laskenta",
            "intent.create.desc": "Luo uusi laskenta.",
            "intent.list.title": "Listaa laskennat",
            "intent.list.desc": "Listaa kaikki laskennat.",
            "intent.get.title": "Hae laskennan tiedot",
            "intent.get.desc": "Hae laskennan tiedot.",
            "intent.relative.title": "Hae laskennan suhteellinen aika",
            "intent.relative.desc": "Hae suhteellinen aika laskentaan.",
            "param.title": "Otsikko",
            "param.targetDate": "Tavoitepäivä",
            "param.emoji": "Emoji",
            "param.emojiColor": "Emojin väri (Hex)",
            "param.recurringOverride": "Toistuva (ohita)",
            "param.countdown": "Laskenta",
            "dialog.created": "Luotu %@ %@ päivälle %@.",
            "dialog.notFound": "Laskentaa ei löytynyt.",
            "dialog.couldNotReadDate": "En voinut lukea päivää kohteelle %@.",
            "dialog.onDate": "%@ %@ päivänä %@",
            "dialog.relative": "%@ on %@.",
            "relative.today": "tänään",
            "relative.inDays": "%d päivän päästä",
            "relative.daysAgo": "%d päivää sitten",
            "list.none": "Sinulla ei ole vielä laskentoja.",
            "list.one": "Sinulla on %d laskenta.",
            "list.many": "Sinulla on %d laskentaa.",
            "phrase.create1": "Luo laskenta sovelluksessa %@",
            "phrase.create2": "Lisää laskenta sovelluksessa %@",
            "phrase.list1": "Listaa laskentani sovelluksessa %@",
            "phrase.list2": "Näytä laskentani sovelluksessa %@",
            "phrase.get1": "Hae laskennan tiedot sovelluksessa %@",
            "phrase.get2": "Näytä laskennan tiedot sovelluksessa %@",
            "phrase.get3": "Mikä päivä on laskentani sovelluksessa %@",
            "phrase.get4": "Mikä päivä on %@ laskentani",
            "phrase.get5": "Milloin on laskentani sovelluksessa %@",
            "phrase.get6": "Milloin on %@ laskentani",
            "phrase.rel1": "Kuinka kauan laskentaani sovelluksessa %@",
            "phrase.rel2": "Kuinka kauan %@ laskentaani",
            "phrase.rel3": "Kuinka monta päivää laskentaani sovelluksessa %@",
            "phrase.rel4": "Kuinka monta päivää %@ laskentaani",
            "phrase.rel5": "Päiviä laskentaani sovelluksessa %@",
            "phrase.rel6": "Päiviä %@ laskentaani"
        ]
    ]
}

struct CountdownEvent: Codable, Hashable {
    let id: String
    let title: String
    let targetDate: String
    let emoji: String
    let emojiColor: String?
    let isRecurring: Bool
    let createdAt: String
}

struct WidgetData: Codable {
    var events: [CountdownEvent]
    var appearanceMode: String
    var countdownStyle: String
    var lastUpdated: String?
}

final class CountdownStorage {
    static let shared = CountdownStorage()

    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    private let fallbackIsoFormatter = ISO8601DateFormatter()
    private let displayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.locale = .current
        return formatter
    }()

    private init() {}

    func loadWidgetData() -> WidgetData? {
        guard let userDefaults = UserDefaults(suiteName: countdownAppGroupIdentifier),
              let jsonData = userDefaults.data(forKey: countdownWidgetDataKey) else {
            return nil
        }

        do {
            let decoder = JSONDecoder()
            return try decoder.decode(WidgetData.self, from: jsonData)
        } catch {
            return nil
        }
    }

    func saveWidgetData(_ data: WidgetData) -> Bool {
        guard let userDefaults = UserDefaults(suiteName: countdownAppGroupIdentifier) else {
            return false
        }

        do {
            let encoder = JSONEncoder()
            let jsonData = try encoder.encode(data)
            userDefaults.set(jsonData, forKey: countdownWidgetDataKey)
            userDefaults.synchronize()
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            return true
        } catch {
            return false
        }
    }

    func loadEvents() -> [CountdownEvent] {
        loadWidgetData()?.events ?? []
    }

    func addEvent(
        title: String,
        targetDate: Date,
        emoji: String,
        emojiColor: String?,
        isRecurring: Bool
    ) -> CountdownEvent {
        let trimmedEmoji = emoji.trimmingCharacters(in: .whitespacesAndNewlines)
        let safeEmoji = trimmedEmoji.isEmpty ? defaultEmoji : trimmedEmoji
        let trimmedColor = emojiColor?.trimmingCharacters(in: .whitespacesAndNewlines)
        let safeColor = trimmedColor?.isEmpty == true ? nil : trimmedColor
        let event = CountdownEvent(
            id: UUID().uuidString,
            title: title,
            targetDate: isoFormatter.string(from: targetDate),
            emoji: safeEmoji,
            emojiColor: safeColor,
            isRecurring: isRecurring,
            createdAt: isoFormatter.string(from: Date())
        )

        var widgetData = loadWidgetData() ?? WidgetData(
            events: [],
            appearanceMode: "light",
            countdownStyle: "focus",
            lastUpdated: nil
        )
        widgetData.events.append(event)
        widgetData.lastUpdated = isoFormatter.string(from: Date())
        _ = saveWidgetData(widgetData)

        return event
    }

    func event(withId id: String) -> CountdownEvent? {
        loadEvents().first { $0.id == id }
    }

    func parseDate(from isoString: String) -> Date? {
        isoFormatter.date(from: isoString) ?? fallbackIsoFormatter.date(from: isoString)
    }

    func formatDateForDisplay(_ date: Date) -> String {
        displayFormatter.string(from: date)
    }
}

@available(iOS 16.0, *)
struct CountdownEventEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Countdown"
    static var defaultQuery = CountdownEventQuery()

    var id: String
    var title: String
    var emoji: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(title)")
    }
}

@available(iOS 16.0, *)
struct CountdownEventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CountdownEventEntity] {
        let events = CountdownStorage.shared.loadEvents()
        return events
            .filter { identifiers.contains($0.id) }
            .map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
    }

    func suggestedEntities() async throws -> [CountdownEventEntity] {
        let events = CountdownStorage.shared.loadEvents()
        return events.map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
    }
}

@available(iOS 16.0, *)
enum CountdownIntentError: Error, LocalizedError {
    case notFound

    var errorDescription: String? {
        switch self {
        case .notFound:
            return SiriLocalization.text("dialog.notFound", fallback: "Countdown not found.")
        }
    }
}

@available(iOS 16.0, *)
struct CreateCountdownIntent: AppIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        stringLiteral: SiriLocalization.text("intent.create.title", fallback: "Create Countdown")
    )
    static var description = IntentDescription(
        SiriLocalization.text("intent.create.desc", fallback: "Create a new countdown.")
    )

    @Parameter(title: SiriLocalization.text("param.title", fallback: "Title"))
    var title: String

    @Parameter(title: SiriLocalization.text("param.targetDate", fallback: "Target Date"))
    var targetDate: Date

    @Parameter(title: SiriLocalization.text("param.emoji", fallback: "Emoji"))
    var emoji: String?

    @Parameter(title: SiriLocalization.text("param.emojiColor", fallback: "Emoji Color (Hex)"))
    var emojiColor: String?

    @Parameter(title: SiriLocalization.text("param.recurringOverride", fallback: "Recurring (Override)"))
    var isRecurringOverride: Bool?

    static var parameterSummary: some ParameterSummary {
        Summary("Create \(\.$title) on \(\.$targetDate)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<CountdownEventEntity> & ProvidesDialog {
        let oneYearAgo = Calendar.current.date(byAdding: .year, value: -1, to: Date()) ?? Date.distantPast
        let autoRecurring = targetDate < oneYearAgo
        let resolvedRecurring = isRecurringOverride ?? autoRecurring

        // Use provided emoji, or suggest based on title (first suggestion from title-based search)
        let finalEmoji: String
        if let providedEmoji = emoji, !providedEmoji.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            finalEmoji = providedEmoji
        } else {
            // Get first suggestion based on title
            finalEmoji = EmojiSuggestionEngine.shared.suggestEmoji(for: title)
        }

        let created = CountdownStorage.shared.addEvent(
            title: title,
            targetDate: targetDate,
            emoji: finalEmoji,
            emojiColor: emojiColor,
            isRecurring: resolvedRecurring
        )
        let formattedDate = CountdownStorage.shared.formatDateForDisplay(targetDate)
        let entity = CountdownEventEntity(id: created.id, title: created.title, emoji: created.emoji)
        let dialog = SiriLocalization.format(
            "dialog.created",
            fallback: "Created %@ %@ for %@.",
            created.emoji,
            created.title,
            formattedDate
        )
        return .result(value: entity, dialog: IntentDialog(stringLiteral: dialog))
    }
}

@available(iOS 16.0, *)
struct ListCountdownsIntent: AppIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        stringLiteral: SiriLocalization.text("intent.list.title", fallback: "List Countdowns")
    )
    static var description = IntentDescription(
        SiriLocalization.text("intent.list.desc", fallback: "List all countdowns.")
    )

    func perform() async throws -> some IntentResult & ReturnsValue<[CountdownEventEntity]> & ProvidesDialog {
        let events = CountdownStorage.shared.loadEvents()
        let entities = events.map { CountdownEventEntity(id: $0.id, title: $0.title, emoji: $0.emoji) }
        let dialog = SiriLocalization.listCountDialog(count: entities.count)
        return .result(value: entities, dialog: IntentDialog(stringLiteral: dialog))
    }
}

@available(iOS 16.0, *)
struct GetCountdownIntent: AppIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        stringLiteral: SiriLocalization.text("intent.get.title", fallback: "Get Countdown Details")
    )
    static var description = IntentDescription(
        SiriLocalization.text("intent.get.desc", fallback: "Get details for a countdown.")
    )

    @Parameter(title: SiriLocalization.text("param.countdown", fallback: "Countdown"))
    var countdown: CountdownEventEntity

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let event = CountdownStorage.shared.event(withId: countdown.id) else {
            throw CountdownIntentError.notFound
        }

        let formattedDate = CountdownStorage.shared.parseDate(from: event.targetDate)
            .map { CountdownStorage.shared.formatDateForDisplay($0) }
            ?? event.targetDate
        let summary = SiriLocalization.format(
            "dialog.onDate",
            fallback: "%@ %@ on %@",
            event.emoji,
            event.title,
            formattedDate
        )
        return .result(value: summary, dialog: IntentDialog(stringLiteral: summary))
    }
}

@available(iOS 16.0, *)
struct GetCountdownRelativeTimeIntent: AppIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        stringLiteral: SiriLocalization.text("intent.relative.title", fallback: "Get Countdown Relative Time")
    )
    static var description = IntentDescription(
        SiriLocalization.text("intent.relative.desc", fallback: "Get relative time until a countdown.")
    )

    @Parameter(title: SiriLocalization.text("param.countdown", fallback: "Countdown"))
    var countdown: CountdownEventEntity

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let event = CountdownStorage.shared.event(withId: countdown.id) else {
            throw CountdownIntentError.notFound
        }

        guard let targetDate = CountdownStorage.shared.parseDate(from: event.targetDate) else {
            let fallback = SiriLocalization.format(
                "dialog.couldNotReadDate",
                fallback: "I could not read the date for %@.",
                event.title
            )
            return .result(value: fallback, dialog: IntentDialog(stringLiteral: fallback))
        }

        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        let startOfTarget = calendar.startOfDay(for: targetDate)
        let dayDelta = calendar.dateComponents([.day], from: startOfToday, to: startOfTarget).day ?? 0

        let relative = SiriLocalization.relativeText(dayDelta: dayDelta)
        let summary = SiriLocalization.format(
            "dialog.relative",
            fallback: "%@ is %@.",
            event.title,
            relative
        )
        return .result(value: summary, dialog: IntentDialog(stringLiteral: summary))
    }
}

@available(iOS 16.0, *)
struct CountdownShortcutsProvider: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CreateCountdownIntent(),
            phrases: [
                SiriLocalization.phrase("phrase.create1", fallback: "Create a countdown in %@"),
                SiriLocalization.phrase("phrase.create2", fallback: "Add a countdown in %@")
            ],
            shortTitle: SiriLocalization.text("intent.create.title", fallback: "Create Countdown"),
            systemImageName: "calendar.badge.plus"
        )
        AppShortcut(
            intent: ListCountdownsIntent(),
            phrases: [
                SiriLocalization.phrase("phrase.list1", fallback: "List my countdowns in %@"),
                SiriLocalization.phrase("phrase.list2", fallback: "Show my countdowns in %@")
            ],
            shortTitle: SiriLocalization.text("intent.list.title", fallback: "List Countdowns"),
            systemImageName: "list.bullet"
        )
        AppShortcut(
            intent: GetCountdownIntent(),
            phrases: [
                SiriLocalization.phrase("phrase.get1", fallback: "Get countdown details in %@"),
                SiriLocalization.phrase("phrase.get2", fallback: "Show countdown details in %@"),
                SiriLocalization.phrase("phrase.get3", fallback: "What date is my countdown in %@"),
                SiriLocalization.phrase("phrase.get4", fallback: "What date is my %@ countdown"),
                SiriLocalization.phrase("phrase.get5", fallback: "When is my countdown in %@"),
                SiriLocalization.phrase("phrase.get6", fallback: "When is my %@ countdown")
            ],
            shortTitle: SiriLocalization.text("intent.get.title", fallback: "Get Countdown"),
            systemImageName: "info.circle"
        )
        AppShortcut(
            intent: GetCountdownRelativeTimeIntent(),
            phrases: [
                SiriLocalization.phrase("phrase.rel1", fallback: "How long until my countdown in %@"),
                SiriLocalization.phrase("phrase.rel2", fallback: "How long until my %@ countdown"),
                SiriLocalization.phrase("phrase.rel3", fallback: "How many days until my countdown in %@"),
                SiriLocalization.phrase("phrase.rel4", fallback: "How many days until my %@ countdown"),
                SiriLocalization.phrase("phrase.rel5", fallback: "Days until my countdown in %@"),
                SiriLocalization.phrase("phrase.rel6", fallback: "Days until my %@ countdown")
            ],
            shortTitle: SiriLocalization.text("intent.relative.title", fallback: "Countdown Relative Time"),
            systemImageName: "clock"
        )
    }
}
