#!/bin/bash
set -euo pipefail

BUNDLE_ID="${ASC_BUNDLE_ID:-com.jonatanbjerrekaer.countdown}"
PRODUCT_IDS=("com.countdown.app.remove_ads" "com.countdown.app.remove_ads_supporter")
REPORT_FILE="${1:-preflight-report.json}"

if [ -z "${ASC_KEY_ID:-}" ] || [ -z "${ASC_ISSUER_ID:-}" ] || [ -z "${ASC_KEY_CONTENT:-}" ]; then
  echo "Error: Required environment variables not set:"
  echo "  - ASC_KEY_ID"
  echo "  - ASC_ISSUER_ID"
  echo "  - ASC_KEY_CONTENT (base64 encoded .p8 key content)"
  exit 1
fi

KEY_FILE=$(mktemp)
echo "${ASC_KEY_CONTENT}" | base64 -d > "${KEY_FILE}"
trap "rm -f ${KEY_FILE}" EXIT

JWT=$(./scripts/generate_jwt.sh "${ASC_KEY_ID}" "${ASC_ISSUER_ID}" "${KEY_FILE}" 2>/dev/null || python3 -c "
import jwt
import time
import sys
import json

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
  "${API_BASE}/apps/${APP_ID}/inAppPurchasesV2?limit=200" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json")

ALL_PRODUCTS=$(echo "${IAP_RESPONSE}" | jq -r '(.data // [])[] | select(.attributes.productId == "'"${PRODUCT_IDS[0]}"'" or .attributes.productId == "'"${PRODUCT_IDS[1]}"'")')

CHECK_RESULTS=()
OVERALL_SUCCESS=true

for PRODUCT_ID in "${PRODUCT_IDS[@]}"; do
  PRODUCT=$(echo "${ALL_PRODUCTS}" | jq -r "select(.attributes.productId == \"${PRODUCT_ID}\")")
  
  if [ -z "${PRODUCT}" ] || [ "${PRODUCT}" = "null" ]; then
    CHECK_RESULTS+=("{\"productId\":\"${PRODUCT_ID}\",\"check\":\"exists\",\"status\":\"FAIL\",\"message\":\"Product not found\"}")
    OVERALL_SUCCESS=false
    continue
  fi
  
  STATE=$(echo "${PRODUCT}" | jq -r '.attributes.state')
  PRODUCT_TYPE=$(echo "${PRODUCT}" | jq -r '.attributes.inAppPurchaseType')
  
  if [ "${STATE}" != "APPROVED" ] && [ "${STATE}" != "READY_TO_SUBMIT" ]; then
    CHECK_RESULTS+=("{\"productId\":\"${PRODUCT_ID}\",\"check\":\"state\",\"status\":\"FAIL\",\"message\":\"Product state is ${STATE}, expected APPROVED or READY_TO_SUBMIT\"}")
    OVERALL_SUCCESS=false
  else
    CHECK_RESULTS+=("{\"productId\":\"${PRODUCT_ID}\",\"check\":\"exists\",\"status\":\"PASS\",\"message\":\"Product exists\"}")
    CHECK_RESULTS+=("{\"productId\":\"${PRODUCT_ID}\",\"check\":\"state\",\"status\":\"PASS\",\"message\":\"Product state is ${STATE}\"}")
    CHECK_RESULTS+=("{\"productId\":\"${PRODUCT_ID}\",\"check\":\"type\",\"status\":\"PASS\",\"message\":\"Product type is ${PRODUCT_TYPE}\"}")
  fi
done

echo "Checking Paid Apps Agreement..."

AGREEMENTS_RESPONSE=$(curl -s -X GET \
  "${API_BASE}/agreements" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json")

PAID_APPS_AGREEMENT=$(echo "${AGREEMENTS_RESPONSE}" | jq -c '
  first(
    (.data // [])[]
    | select(
        .type == "PAID_APPS"
        or .attributes.agreementType == "PAID_APPS"
        or .attributes.contractType == "PAID_APPS"
      )
  ) // empty
')

if [ -z "${PAID_APPS_AGREEMENT}" ] || [ "${PAID_APPS_AGREEMENT}" = "null" ]; then
  AGREEMENTS_ERROR=$(echo "${AGREEMENTS_RESPONSE}" | jq -r '.errors[0].detail // .errors[0].title // empty')
  if [ -n "${AGREEMENTS_ERROR}" ]; then
    CHECK_RESULTS+=("{\"check\":\"paidAppsAgreement\",\"status\":\"FAIL\",\"message\":\"Paid Apps Agreement check failed: ${AGREEMENTS_ERROR}\"}")
  else
    CHECK_RESULTS+=("{\"check\":\"paidAppsAgreement\",\"status\":\"FAIL\",\"message\":\"Paid Apps Agreement not found or not active\"}")
  fi
  OVERALL_SUCCESS=false
else
  AGREED=$(echo "${PAID_APPS_AGREEMENT}" | jq -r '.attributes.agreed // empty')
  STATE=$(echo "${PAID_APPS_AGREEMENT}" | jq -r '.attributes.state // empty')
  CONTRACT_STATUS=$(echo "${PAID_APPS_AGREEMENT}" | jq -r '.attributes.contractStatus // empty')
  if [ "${AGREED}" = "true" ] || [ "${STATE}" = "ACTIVE" ] || [ "${CONTRACT_STATUS}" = "ACTIVE" ]; then
    CHECK_RESULTS+=("{\"check\":\"paidAppsAgreement\",\"status\":\"PASS\",\"message\":\"Paid Apps Agreement is active\"}")
  else
    CHECK_RESULTS+=("{\"check\":\"paidAppsAgreement\",\"status\":\"FAIL\",\"message\":\"Paid Apps Agreement exists but is not active\"}")
    OVERALL_SUCCESS=false
  fi
fi

REPORT_JSON=$(jq -n \
  --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg bundleId "${BUNDLE_ID}" \
  --arg appId "${APP_ID}" \
  --argjson overallSuccess "${OVERALL_SUCCESS}" \
  --argjson checks "$(IFS=,; echo "[${CHECK_RESULTS[*]}]")" \
  '{
    timestamp: $timestamp,
    bundleId: $bundleId,
    appId: $appId,
    overallSuccess: $overallSuccess,
    checks: ($checks | fromjson)
  }')

echo "${REPORT_JSON}" | jq '.' > "${REPORT_FILE}"

if [ "${OVERALL_SUCCESS}" = "true" ]; then
  echo "✓ All IAP preflight checks passed"
  exit 0
else
  echo "✗ IAP preflight checks failed"
  echo "${REPORT_JSON}" | jq '.checks[] | select(.status == "FAIL")'
  exit 1
fi
