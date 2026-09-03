package main

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log/slog"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	appleIssuer          = "https://appleid.apple.com"
	authorizationPath    = "/authorize"
	clientID             = "com.mprlab.mpr-ui.demo"
	contentTypeJSON      = "application/json"
	healthPath           = "/healthz"
	jwksPath             = "/keys"
	keyID                = "mpr-ui-local-apple"
	listenAddress        = ":8090"
	proxyPathPrefix      = "/apple-provider"
	redirectURI          = "http://localhost:4443/auth/apple/callback"
	responseMode         = "form_post"
	responseType         = "code"
	tokenPath            = "/token"
	tokenLifetime        = time.Hour
	userDisplayName      = "MPR UI Apple Demo User"
	userEmail            = "apple-demo@mprlab.local"
	userSubject          = "mpr-ui-local-apple-user"
	grantType            = "authorization_code"
	accessToken          = "mpr-ui-local-apple-access-token"
	tokenType            = "Bearer"
	clientSecretFormName = "client_secret"
)

type providerServer struct {
	clock      func() time.Time
	privateKey *rsa.PrivateKey
}

func main() {
	privateKey, keyErr := rsa.GenerateKey(rand.Reader, 2048)
	if keyErr != nil {
		slog.Error("generate local Apple signing key", "error", keyErr)
		os.Exit(1)
	}

	server := &http.Server{
		Addr:              listenAddress,
		Handler:           newProviderHandler(privateKey, time.Now),
		ReadHeaderTimeout: 5 * time.Second,
	}
	serveErr := server.ListenAndServe()
	if serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
		slog.Error("serve local Apple provider", "error", serveErr)
		os.Exit(1)
	}
}

func newProviderHandler(privateKey *rsa.PrivateKey, clock func() time.Time) http.Handler {
	provider := providerServer{privateKey: privateKey, clock: clock}
	router := http.NewServeMux()
	router.HandleFunc(proxyPathPrefix+authorizationPath, provider.handleAuthorization)
	router.HandleFunc(tokenPath, provider.handleToken)
	router.HandleFunc(jwksPath, provider.handleJWKS)
	router.HandleFunc(proxyPathPrefix+healthPath, provider.handleHealth)
	return router
}

func (provider providerServer) handleAuthorization(responseWriter http.ResponseWriter, request *http.Request) {
	query := request.URL.Query()
	if request.Method != http.MethodGet ||
		query.Get("client_id") != clientID ||
		query.Get("redirect_uri") != redirectURI ||
		query.Get("response_type") != responseType ||
		query.Get("response_mode") != responseMode ||
		strings.TrimSpace(query.Get("state")) == "" ||
		strings.TrimSpace(query.Get("nonce")) == "" {
		http.Error(responseWriter, "invalid local Apple authorization request", http.StatusBadRequest)
		return
	}

	callbackURL, parseErr := url.Parse(redirectURI)
	if parseErr != nil {
		http.Error(responseWriter, "invalid local Apple callback", http.StatusInternalServerError)
		return
	}
	callbackQuery := callbackURL.Query()
	callbackQuery.Set("code", base64.RawURLEncoding.EncodeToString([]byte(query.Get("nonce"))))
	callbackQuery.Set("state", query.Get("state"))
	callbackURL.RawQuery = callbackQuery.Encode()
	http.Redirect(responseWriter, request, callbackURL.String(), http.StatusFound)
}

func (provider providerServer) handleToken(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		http.Error(responseWriter, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if parseErr := request.ParseForm(); parseErr != nil {
		http.Error(responseWriter, "invalid local Apple token request", http.StatusBadRequest)
		return
	}
	if request.PostForm.Get("client_id") != clientID ||
		request.PostForm.Get("redirect_uri") != redirectURI ||
		request.PostForm.Get("grant_type") != grantType ||
		strings.TrimSpace(request.PostForm.Get(clientSecretFormName)) == "" {
		http.Error(responseWriter, "invalid local Apple token request", http.StatusBadRequest)
		return
	}

	nonceBytes, decodeErr := base64.RawURLEncoding.DecodeString(request.PostForm.Get("code"))
	if decodeErr != nil || len(nonceBytes) == 0 {
		http.Error(responseWriter, "invalid local Apple authorization code", http.StatusBadRequest)
		return
	}
	idToken, tokenErr := provider.mintIDToken(string(nonceBytes))
	if tokenErr != nil {
		http.Error(responseWriter, "local Apple token generation failed", http.StatusInternalServerError)
		return
	}

	writeJSON(responseWriter, map[string]any{
		"access_token": accessToken,
		"expires_in":   int(tokenLifetime.Seconds()),
		"id_token":     idToken,
		"token_type":   tokenType,
	})
}

func (provider providerServer) handleJWKS(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	exponentBytes := big.NewInt(int64(provider.privateKey.PublicKey.E)).Bytes()
	writeJSON(responseWriter, map[string]any{
		"keys": []map[string]string{{
			"alg": "RS256",
			"e":   base64.RawURLEncoding.EncodeToString(exponentBytes),
			"kid": keyID,
			"kty": "RSA",
			"n":   base64.RawURLEncoding.EncodeToString(provider.privateKey.PublicKey.N.Bytes()),
			"use": "sig",
		}},
	})
}

func (provider providerServer) handleHealth(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	responseWriter.WriteHeader(http.StatusNoContent)
}

func (provider providerServer) mintIDToken(nonce string) (string, error) {
	now := provider.clock().UTC()
	header := map[string]string{"alg": "RS256", "kid": keyID, "typ": "JWT"}
	claims := map[string]any{
		"aud":            clientID,
		"email":          userEmail,
		"email_verified": true,
		"exp":            now.Add(tokenLifetime).Unix(),
		"iat":            now.Unix(),
		"iss":            appleIssuer,
		"name":           userDisplayName,
		"nonce":          nonce,
		"sub":            userSubject,
	}
	headerSegment, headerErr := encodeJSONSegment(header)
	if headerErr != nil {
		return "", headerErr
	}
	claimsSegment, claimsErr := encodeJSONSegment(claims)
	if claimsErr != nil {
		return "", claimsErr
	}
	signingInput := headerSegment + "." + claimsSegment
	digest := sha256.Sum256([]byte(signingInput))
	signature, signErr := rsa.SignPKCS1v15(rand.Reader, provider.privateKey, crypto.SHA256, digest[:])
	if signErr != nil {
		return "", signErr
	}
	return signingInput + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func encodeJSONSegment(value any) (string, error) {
	encodedValue, encodeErr := json.Marshal(value)
	if encodeErr != nil {
		return "", encodeErr
	}
	return base64.RawURLEncoding.EncodeToString(encodedValue), nil
}

func writeJSON(responseWriter http.ResponseWriter, value any) {
	responseWriter.Header().Set("Content-Type", contentTypeJSON)
	if encodeErr := json.NewEncoder(responseWriter).Encode(value); encodeErr != nil {
		slog.Error("write local Apple response", "error", encodeErr)
	}
}
