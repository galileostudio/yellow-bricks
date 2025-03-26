package models

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type PluginSettings struct {
	Host         string                `json:"host"`
	Token        *SecretPluginSettings `json:"-"`
	Path         string                `json:"path"`
	Catalog      string                `json:"catalog"`
	Retries      int                   `json:"retries"`
	Pause        int                   `json:"pause"`
	Timeout      int                   `json:"timeout"`
	MaxRows      int                   `json:"maxRows"`
	RetryTimeout int                   `json:"retryTimeout"`
	Debug        bool                  `json:"debug"`
}

type SecretPluginSettings struct {
	Token string `json:"token"`
}

func LoadPluginSettings(source backend.DataSourceInstanceSettings) (*PluginSettings, error) {
	settings := PluginSettings{
		Retries:      5,
		Pause:        0,
		Timeout:      60,
		MaxRows:      10000,
		RetryTimeout: 40,
		Debug:        false,
	}
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
