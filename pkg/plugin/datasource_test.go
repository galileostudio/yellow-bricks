package plugin

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/galileo-stdio/yellow-bricks/pkg/models"
)

func TestQueryData_Success(t *testing.T) {
	
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("error opening stub database connection: %v", err)
	}
	defer db.Close()

	ds := &Datasource{
		DB: db,
		config: &models.PluginSettings{
			Catalog: "my_catalog",
			Token:   &models.SecretPluginSettings{Token: "dummy"},
			Host:    "dummy.host",
			Path:    "dummy/path",
		},
	}

	testSQL := "SELECT * FROM my_schema.my_table"
	payload := fmt.Sprintf(`{"queryText": "%s", "format": "table"}`, testSQL)

	expectedSQL := "SELECT * FROM my_catalog.my_schema.my_table"

	columns := []string{"col1", "col2"}
	rows := sqlmock.NewRows(columns).AddRow("value1", "value2")
	mock.ExpectQuery(regexp.QuoteMeta(expectedSQL)).WillReturnRows(rows)

	req := &backend.QueryDataRequest{
		Queries: []backend.DataQuery{
			{RefID: "A", JSON: []byte(payload)},
		},
	}

	resp, err := ds.QueryData(context.Background(), req)
	if err != nil {
		t.Fatalf("QueryData returned error: %v", err)
	}

	qResp, ok := resp.Responses["A"]
	if !ok {
		t.Fatal("QueryData must return a response for RefID A")
	}

	if len(qResp.Frames) != 1 {
		t.Fatalf("expected 1 frame, got %d", len(qResp.Frames))
	}

	frame := qResp.Frames[0]
	if len(frame.Fields) != len(columns) {
		t.Fatalf("expected %d fields, got %d", len(columns), len(frame.Fields))
	}

	if frame.Fields[0].Len() != 1 || frame.Fields[1].Len() != 1 {
		t.Fatal("expected each field to have 1 value")
	}
	if frame.Fields[0].At(0) != "value1" || frame.Fields[1].At(0) != "value2" {
		t.Fatalf("unexpected field values: got %v and %v", frame.Fields[0].At(0), frame.Fields[1].At(0))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestQueryData_InvalidPayload(t *testing.T) {
	ds := &Datasource{}
	req := &backend.QueryDataRequest{
		Queries: []backend.DataQuery{
			{RefID: "A", JSON: []byte(`{"queryText": 123, "format": "table"}`)},
		},
	}
	resp, err := ds.QueryData(context.Background(), req)
	if err != nil {
		t.Fatal("unexpected error:", err)
	}

	qResp, ok := resp.Responses["A"]
	if !ok {
		t.Fatal("missing response for RefID A")
	}
	
	if qResp.Status != backend.StatusBadRequest {
		t.Fatalf("expected StatusBadRequest error, got status %d", qResp.Status)
	}
}
