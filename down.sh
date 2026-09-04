TAUTH_JWT_SIGNING_KEY=down \
PINGUIN_DEMO_API_KEY=down \
PINGUIN_DEMO_CREDENTIAL_ID=down \
PINGUIN_DEMO_CREDENTIAL_DIGEST=down \
docker compose \
  --env-file demo/.env.tauth \
  --env-file ../Pinguin/configs/.env.pinguin \
  down
