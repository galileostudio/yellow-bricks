package models

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type PluginSettings struct {
	Host string `json:"host"` // Ex: dbc-6d40f870-08fd.cloud.databricks.com
	// User não é obrigatório se a autenticação é somente via token
	User string `json:"user,omitempty"`
	Token *SecretPluginSettings `json:"-"`
}

type SecretPluginSettings struct {
	Token string `json:"token"`
}

func LoadPluginSettings(source backend.DataSourceInstanceSettings) (*PluginSettings, error) {
	settings := PluginSettings{}
	err := json.Unmarshal(source.JSONData, &settings)
	if err != nil {
		return nil, fmt.Errorf("could not unmarshal PluginSettings json: %w", err)
	}

	settings.Token = loadSecretPluginSettings(source.DecryptedSecureJSONData)

	return &settings, nil
}

func loadSecretPluginSettings(source map[string]string) *SecretPluginSettings {
	return &SecretPluginSettings{
		Token: source["token"],
	}
}
