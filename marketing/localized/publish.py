"""Push the localized listing to App Store Connect, then (separately) submit.

  uv run --with pyjwt --with cryptography --with requests python publish.py listing
  uv run --with pyjwt --with cryptography --with requests python publish.py submit 84

listing: cancels an open review submission, then upserts name/subtitle, description/
keywords/promo/whatsNew and the APP_IPHONE_67 screenshot set for every locale in
metadata.json (screenshots from final/<locale>/, existing ones replaced).
submit:  attaches the given build and submits the version for review.
"""
import hashlib, json, sys, time
from pathlib import Path

import requests
from asc import APP_ID, call, get

HERE = Path(__file__).parent
VERSION = "2026.10.5"
NAME = "Yet Another Countdown"
PRIVACY = "https://jdbjerrekaer.github.io/yet-another-countdown-app/privacy"
SUPPORT = "https://jdbjerrekaer.github.io/yet-another-countdown-app/support"
EN_NEW = "Widgets now show the same number of days as the list for countdowns without a set time."
WHATS_NEW = {
    "en-US": EN_NEW, "en-CA": EN_NEW, "en-GB": EN_NEW,
    "da": "Widgets viser nu samme antal dage som listen for nedtællinger uden et bestemt tidspunkt.",
    "sv": "Widgets visar nu samma antal dagar som listan för nedräkningar utan en angiven tid.",
    "no": "Widgets viser nå samme antall dager som listen for nedtellinger uten et bestemt klokkeslett.",
    "fi": "Widgetit näyttävät nyt saman määrän päiviä kuin lista laskureissa, joille ei ole asetettu kellonaikaa.",
    "de-DE": "Widgets zeigen jetzt bei Countdowns ohne Uhrzeit dieselbe Anzahl Tage wie die Liste.",
    "fr-FR": "Les widgets affichent désormais le même nombre de jours que la liste pour les comptes à rebours sans heure précise.",
    "fr-CA": "Les widgets affichent désormais le même nombre de jours que la liste pour les comptes à rebours sans heure précise.",
    "es-ES": "Los widgets ahora muestran los mismos días que la lista en las cuentas atrás sin hora.",
    "es-MX": "Los widgets ahora muestran los mismos días que la lista en las cuentas regresivas sin hora.",
    "it": "I widget ora mostrano lo stesso numero di giorni dell'elenco per i conti alla rovescia senza orario.",
    "pt-PT": "Os widgets mostram agora o mesmo número de dias que a lista nas contagens sem hora definida.",
}
META = json.loads((HERE / "metadata.json").read_text())
EDITABLE = {"PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"}


def version():
    vs = get(f"/v1/apps/{APP_ID}/appStoreVersions?filter[versionString]={VERSION}")["data"]
    return vs[0]


def cancel_open_submission():
    open_subs = get(f"/v1/apps/{APP_ID}/reviewSubmissions?filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW")["data"]
    for s in open_subs:
        if s["attributes"]["state"] != "READY_FOR_REVIEW":
            call("PATCH", f"/v1/reviewSubmissions/{s['id']}",
                 {"data": {"type": "reviewSubmissions", "id": s["id"], "attributes": {"canceled": True}}})
            print("canceled review submission", s["id"])
    for _ in range(60):
        state = version()["attributes"]["appStoreState"]
        if state in EDITABLE:
            print("version editable:", state)
            return
        time.sleep(5)
    raise RuntimeError(f"version still {state}")


def upsert(list_path, create_type, rel_name, rel_type, rel_id, locale, attrs, existing):
    if locale in existing:
        lid = existing[locale]
        call("PATCH", f"/v1/{create_type}/{lid}", {"data": {"type": create_type, "id": lid, "attributes": attrs}})
        return lid
    body = {"data": {"type": create_type, "attributes": {"locale": locale, **attrs},
                     "relationships": {rel_name: {"data": {"type": rel_type, "id": rel_id}}}}}
    return call("POST", f"/v1/{create_type}", body)["data"]["id"]


def upload_screenshots(loc_id, locale):
    files = sorted((HERE / "final" / locale).glob("*.png"))
    assert len(files) == 5, f"{locale}: {len(files)} screenshots"
    sets = get(f"/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets")["data"]
    set_id = next((s["id"] for s in sets if s["attributes"]["screenshotDisplayType"] == "APP_IPHONE_67"), None)
    if set_id:
        for shot in get(f"/v1/appScreenshotSets/{set_id}/appScreenshots")["data"]:
            call("DELETE", f"/v1/appScreenshots/{shot['id']}")
    else:
        set_id = call("POST", "/v1/appScreenshotSets", {"data": {
            "type": "appScreenshotSets", "attributes": {"screenshotDisplayType": "APP_IPHONE_67"},
            "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": loc_id}}}}})["data"]["id"]
    for f in files:
        data = f.read_bytes()
        shot = call("POST", "/v1/appScreenshots", {"data": {
            "type": "appScreenshots", "attributes": {"fileName": f.name, "fileSize": len(data)},
            "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}}}})["data"]
        for op in shot["attributes"]["uploadOperations"]:
            chunk = data[op["offset"]: op["offset"] + op["length"]]
            headers = {h["name"]: h["value"] for h in op["requestHeaders"]}
            requests.request(op["method"], op["url"], headers=headers, data=chunk).raise_for_status()
        call("PATCH", f"/v1/appScreenshots/{shot['id']}", {"data": {
            "type": "appScreenshots", "id": shot["id"],
            "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})
    print(f"  {locale}: {len(files)} screenshots")


def listing():
    cancel_open_submission()
    v = version()
    infos = get(f"/v1/apps/{APP_ID}/appInfos")["data"]
    state = lambda i: i["attributes"].get("state") or i["attributes"].get("appStoreState")
    info = next(i for i in infos if state(i) != "READY_FOR_DISTRIBUTION")  # the live one is read-only
    info_locs = {l["attributes"]["locale"]: l["id"] for l in get(f"/v1/appInfos/{info['id']}/appInfoLocalizations")["data"]}
    ver_locs = {l["attributes"]["locale"]: l["id"] for l in get(f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations")["data"]}
    for locale, m in META.items():
        upsert(None, "appInfoLocalizations", "appInfo", "appInfos", info["id"], locale,
               {"name": NAME, "subtitle": m["subtitle"], "privacyPolicyUrl": PRIVACY}, info_locs)
        # Adding an app-info locale auto-creates the matching version locale, so re-read.
        ver_locs = {l["attributes"]["locale"]: l["id"] for l in get(f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations")["data"]}
        loc_id = upsert(None, "appStoreVersionLocalizations", "appStoreVersion", "appStoreVersions", v["id"], locale,
                        {"description": m["description"], "keywords": m["keywords"], "promotionalText": m["promotionalText"],
                         "whatsNew": WHATS_NEW[locale], "supportUrl": SUPPORT}, ver_locs)
        print(f"{locale}: text ok")
        upload_screenshots(loc_id, locale)


def submit(build_number):
    v = version()
    builds = get(f"/v1/builds?filter[app]={APP_ID}&filter[version]={build_number}")["data"]
    assert builds and builds[0]["attributes"]["processingState"] == "VALID", builds
    call("PATCH", f"/v1/appStoreVersions/{v['id']}/relationships/build",
         {"data": {"type": "builds", "id": builds[0]["id"]}})
    print("attached build", build_number)
    subs = get(f"/v1/apps/{APP_ID}/reviewSubmissions?filter[state]=READY_FOR_REVIEW")["data"]
    sub_id = subs[0]["id"] if subs else call("POST", "/v1/reviewSubmissions", {"data": {
        "type": "reviewSubmissions", "attributes": {"platform": "IOS"},
        "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}}}})["data"]["id"]
    items = get(f"/v1/reviewSubmissions/{sub_id}/items")["data"]
    if not items:
        call("POST", "/v1/reviewSubmissionItems", {"data": {"type": "reviewSubmissionItems", "relationships": {
            "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sub_id}},
            "appStoreVersion": {"data": {"type": "appStoreVersions", "id": v["id"]}}}}})
    call("PATCH", f"/v1/reviewSubmissions/{sub_id}",
         {"data": {"type": "reviewSubmissions", "id": sub_id, "attributes": {"submitted": True}}})
    print("submitted", sub_id, "->", version()["attributes"]["appStoreState"])


if __name__ == "__main__":
    {"listing": lambda: listing(), "submit": lambda: submit(sys.argv[2])}[sys.argv[1]]()
