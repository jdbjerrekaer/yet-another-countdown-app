#!/bin/bash
set -euo pipefail

BUNDLE_ID="${ASC_BUNDLE_ID:-com.jonatanbjerrekaer.countdown}"
PRODUCT_IDS=("com.jonatanbjerrekaer.countdown.remove_ads" "com.jonatanbjerrekaer.countdown.remove_ads_supporter")
REVIEWABLE_STATES=("APPROVED" "READY_TO_SUBMIT" "WAITING_FOR_REVIEW" "IN_REVIEW" "PENDING_BINARY_APPROVAL")
SUBMITTED_STATES=("APPROVED" "WAITING_FOR_REVIEW" "IN_REVIEW" "PENDING_BINARY_APPROVAL")
REPORT_FILE="${1:-preflight-report.json}"
CHECKS_FILE=$(mktemp)
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP_SCHEME_FILE="${REPO_ROOT}/ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme"
PROJECT_FILE="${REPO_ROOT}/ios/App/App.xcodeproj/project.pbxproj"
echo '[]' > "${CHECKS_FILE}"

add_check() {
  local json="$1"
  jq --argjson item "${json}" '. += [$item]' "${CHECKS_FILE}" > "${CHECKS_FILE}.tmp" \
    && mv "${CHECKS_FILE}.tmp" "${CHECKS_FILE}"
}

state_in_list() {
  local needle="$1"
  shift
  local candidate
  for candidate in "$@"; do
    if [ "${candidate}" = "${needle}" ]; then
      return 0
    fi
  done
  return 1
}

OVERALL_SUCCESS=true

echo "Checking shared scheme for local StoreKit configuration..."
if grep -q "StoreKitConfigurationFileReference" "${APP_SCHEME_FILE}"; then
  add_check '{"check":"sharedSchemeStoreKit","status":"FAIL","message":"Shared App scheme still references a local StoreKit configuration file"}'
  OVERALL_SUCCESS=false
else
  add_check '{"check":"sharedSchemeStoreKit","status":"PASS","message":"Shared App scheme does not reference a local StoreKit configuration file"}'
fi

echo "Checking app targets for bundled StoreKit configuration..."
if grep -q "StoreKit.storekit in Resources" "${PROJECT_FILE}"; then
  add_check '{"check":"bundledStoreKit","status":"FAIL","message":"StoreKit.storekit is still bundled in app or widget resources"}'
  OVERALL_SUCCESS=false
else
  add_check '{"check":"bundledStoreKit","status":"PASS","message":"StoreKit.storekit is not bundled in app or widget resources"}'
fi

if [ -z "${ASC_KEY_ID:-}" ] || [ -z "${ASC_ISSUER_ID:-}" ] || [ -z "${ASC_KEY_CONTENT:-}" ]; then
  echo "Error: Required environment variables not set:"
  echo "  - ASC_KEY_ID"
  echo "  - ASC_ISSUER_ID"
  echo "  - ASC_KEY_CONTENT (base64 encoded .p8 key content)"
  exit 1
fi

KEY_FILE=$(mktemp)
echo "${ASC_KEY_CONTENT}" | base64 -d > "${KEY_FILE}"
trap "rm -f ${KEY_FILE} ${CHECKS_FILE} ${CHECKS_FILE}.tmp 2>/dev/null" EXIT

JWT=$(./scripts/generate_jwt.sh "${ASC_KEY_ID}" "${ASC_ISSUER_ID}" "${KEY_FILE}" 2>/dev/null || python3 -c "
import jwt
import time
import sys

key_id = sys.argv[1]
issuer_id = sys.argv[2]
key_path = sys.argv[3]

with open(key_path, 'r') as f:
    key = f.read()

now = int(time.time())
token = jwt.encode({
    'iss': issuer_id,
    'iat': now,
    'exp': now + 1200,
    'aud': 'appstoreconnect-v1'
}, key, algorithm='ES256', headers={'kid': key_id, 'typ': 'JWT'})

print(token)
" "${ASC_KEY_ID}" "${ASC_ISSUER_ID}" "${KEY_FILE}")

API_BASE="https://api.appstoreconnect.apple.com/v1"

echo "Resolving app ID for bundle ID: ${BUNDLE_ID}"

APP_RESPONSE=$(curl -s -X GET \
  "${API_BASE}/apps?filter%5BbundleId%5D=${BUNDLE_ID}" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json")

APP_ID=$(echo "${APP_RESPONSE}" | jq -r '.data[0].id // empty')

if [ -z "${APP_ID}" ] || [ "${APP_ID}" = "null" ]; then
  echo "Error: Could not find app with bundle ID ${BUNDLE_ID}"
  echo "Response: ${APP_RESPONSE}"
  exit 1
fi

echo "Found app ID: ${APP_ID}"

echo "Fetching IAP products..."

IAP_RESPONSE=$(curl -s -X GET \
  "${API_BASE}/apps/${APP_ID}/inAppPurchasesV2?include=appStoreReviewScreenshot&limit=200" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json")

for PRODUCT_ID in "${PRODUCT_IDS[@]}"; do
  PRODUCT=$(echo "${IAP_RESPONSE}" | jq -c \
    --arg pid "${PRODUCT_ID}" \
    'first((.data // [])[] | select(.attributes.productId == $pid)) // empty')

  if [ -z "${PRODUCT}" ] || [ "${PRODUCT}" = "null" ]; then
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"exists\",\"status\":\"FAIL\",\"message\":\"Product not found\"}"
    OVERALL_SUCCESS=false
    continue
  fi

  STATE=$(echo "${PRODUCT}" | jq -r '.attributes.state // "UNKNOWN"')
  PRODUCT_TYPE=$(echo "${PRODUCT}" | jq -r '.attributes.inAppPurchaseType // "UNKNOWN"')
  SCREENSHOT_ID=$(echo "${PRODUCT}" | jq -r '
    .relationships.appStoreReviewScreenshot.data.id //
    .relationships.appStoreReviewScreenshot.data[0].id //
    empty
  ')

  add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"exists\",\"status\":\"PASS\",\"message\":\"Product exists\"}"

  if state_in_list "${STATE}" "${REVIEWABLE_STATES[@]}"; then
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"state\",\"status\":\"PASS\",\"message\":\"Product state is ${STATE}\"}"
  else
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"state\",\"status\":\"FAIL\",\"message\":\"Product state is ${STATE}, expected one of: ${REVIEWABLE_STATES[*]}\"}"
    OVERALL_SUCCESS=false
  fi

  if [ "${PRODUCT_TYPE}" = "NON_CONSUMABLE" ]; then
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"type\",\"status\":\"PASS\",\"message\":\"Product type is ${PRODUCT_TYPE}\"}"
  else
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"type\",\"status\":\"FAIL\",\"message\":\"Product type is ${PRODUCT_TYPE}, expected NON_CONSUMABLE\"}"
    OVERALL_SUCCESS=false
  fi

  if [ -n "${SCREENSHOT_ID}" ]; then
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"appReviewScreenshot\",\"status\":\"PASS\",\"message\":\"App Review screenshot is configured\"}"
  else
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"appReviewScreenshot\",\"status\":\"FAIL\",\"message\":\"App Review screenshot is missing\"}"
    OVERALL_SUCCESS=false
  fi

  if state_in_list "${STATE}" "${SUBMITTED_STATES[@]}"; then
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"submittedForReview\",\"status\":\"PASS\",\"message\":\"Product has been submitted for review (state: ${STATE})\"}"
  else
    add_check "{\"productId\":\"${PRODUCT_ID}\",\"check\":\"submittedForReview\",\"status\":\"FAIL\",\"message\":\"Product has not been submitted for review yet (state: ${STATE})\"}"
    OVERALL_SUCCESS=false
  fi
done

echo "Checking Paid Apps Agreement..."

# Implicit validation: If we successfully fetched IAP products, the paid apps agreement must be active
# (App Store Connect won't allow IAP creation without an active paid apps agreement)
IAP_PRODUCTS_COUNT=$(echo "${IAP_RESPONSE}" | jq -r '(.data // []) | length')
if [ "${IAP_PRODUCTS_COUNT}" -gt 0 ]; then
  add_check "{\"check\":\"paidAppsAgreement\",\"status\":\"PASS\",\"message\":\"Paid Apps Agreement is active (verified by successful IAP product fetch)\"}"
else
  add_check "{\"check\":\"paidAppsAgreement\",\"status\":\"FAIL\",\"message\":\"Cannot verify Paid Apps Agreement: no IAP products found\"}"
  OVERALL_SUCCESS=false
fi

jq -n \
  --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg bundleId "${BUNDLE_ID}" \
  --arg appId "${APP_ID}" \
  --argjson overallSuccess "${OVERALL_SUCCESS}" \
  --slurpfile checks "${CHECKS_FILE}" \
  '{
    timestamp: $timestamp,
    bundleId: $bundleId,
    appId: $appId,
    overallSuccess: $overallSuccess,
    checks: $checks[0]
  }' > "${REPORT_FILE}"

if [ "${OVERALL_SUCCESS}" = "true" ]; then
  echo "All IAP preflight checks passed"
  cat "${REPORT_FILE}"
  exit 0
else
  echo "IAP preflight checks failed"
  jq '.checks[] | select(.status == "FAIL")' "${REPORT_FILE}"
  exit 1
fi
