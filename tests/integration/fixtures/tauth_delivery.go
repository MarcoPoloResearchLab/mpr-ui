// Command delivery exercises the real TAuth notification sender in an isolated fixture.
package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/tyemirov/tauth/internal/authkit"
	"github.com/tyemirov/tauth/internal/notification"
	"github.com/tyemirov/tauth/pkg/sessionvalidator"
)

const (
	fixtureOrigin    = "http://localhost:4443"
	fixtureTenant    = "mpr-ui-delivery-contract"
	fixtureRecipient = "recipient@example.test"
	fixtureLink      = "https://ui.example.test/verify-email#token=isolated-contract-token"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() (result error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return err
	}
	credentialID := uuid.NewString()
	digest := sha256.Sum256(secret)
	apiKey := "pgn_1_" + credentialID + "_" + base64.RawURLEncoding.EncodeToString(secret)
	claims := sessionvalidator.Claims{
		TenantID: fixtureTenant, UserID: "isolated-delivery-owner", UserEmail: "owner@example.test",
		RegisteredClaims: jwt.RegisteredClaims{Issuer: "tauth", ExpiresAt: jwt.NewNumericDate(time.Now().Add(10 * time.Minute))},
	}
	cookie, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(os.Getenv("CONTRACT_SIGNING_KEY")))
	if err != nil {
		return err
	}
	requestBody, err := json.Marshal(map[string]any{
		"display_name":  "Isolated delivery contract",
		"support_email": "sender@example.test",
		"email_profile": map[string]any{
			"host": "smtp-fixture", "port": 465, "username": "fixture", "password": "fixture", "from_address": "sender@example.test",
		},
		"api_credential": map[string]any{"id": credentialID, "secret_digest": base64.RawURLEncoding.EncodeToString(digest[:])},
	})
	if err != nil {
		return err
	}
	request, err := http.NewRequest(http.MethodPost, "http://pinguin:8081/api/tenants", bytes.NewReader(requestBody))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", fixtureOrigin)
	request.Header.Set("Idempotency-Key", uuid.NewString())
	request.AddCookie(&http.Cookie{Name: "contract_session", Value: cookie})
	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("create fixture tenant: %w", err)
	}
	if err := response.Body.Close(); err != nil {
		return err
	}
	if response.StatusCode != http.StatusCreated {
		return fmt.Errorf("create fixture tenant: HTTP %d", response.StatusCode)
	}
	sender, err := notification.NewPinguinEmailChallengeSender(slog.New(slog.NewTextHandler(io.Discard, nil)), []notification.PinguinTenantConfig{{
		TenantID: fixtureTenant, ServerAddress: "pinguin:50051", APIKey: apiKey, ConnectionTimeoutSeconds: 5, OperationTimeoutSeconds: 10,
	}})
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, sender.Close()) }()
	if err := sender.SendEmailChallenge(context.Background(), authkit.EmailChallengeRequest{
		Kind: authkit.EmailChallengeKindVerification, TenantID: fixtureTenant, Recipient: fixtureRecipient,
		PublicURL: fixtureLink, ExpiresAt: time.Now().UTC().Add(30 * time.Minute),
	}); err != nil {
		return err
	}
	mailbox, err := client.Get("http://smtp-fixture:8025/messages")
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, mailbox.Body.Close()) }()
	var messages []struct {
		Recipients []string `json:"recipients"`
		Data       string   `json:"data"`
	}
	if err := json.NewDecoder(mailbox.Body).Decode(&messages); err != nil {
		return err
	}
	for _, message := range messages {
		if len(message.Recipients) == 1 && message.Recipients[0] == fixtureRecipient &&
			strings.Contains(message.Data, "Subject: Verify your email") && strings.Contains(message.Data, fixtureLink) {
			fmt.Println("TAuth sender delivered the verification message through Pingwin to the isolated SMTP mailbox")
			return nil
		}
	}
	return errors.New("isolated SMTP mailbox lacks the expected recipient, subject, or verification link")
}
