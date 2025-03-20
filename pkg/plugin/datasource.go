package plugin

import (
	"context"
	"encoding/json"
	"fmt"

	"database/sql"
	_ "github.com/databricks/databricks-sql-go"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/galileo-stdio/yellow-bricks/pkg/models"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {

	config, err := models.LoadPluginSettings(settings)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar configurações: %w", err)
	}

	var connStr string = fmt.Sprintf("token:%s@%s:443/%s", config.Token.Token, config.Host, config.Path,)


	db, err := sql.Open("databricks", connStr)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar ao Databricks: %w", err)
	}

	return &Datasource{DB: db}, nil

}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct{
	DB *sql.DB
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type queryModel struct{
	RawSQL string `json:"rawSql"`
}

func (d *Datasource) query(ctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	rows, err := d.DB.QueryContext(ctx, qm.RawSQL)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("erro ao executar query: %v", err.Error()))
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return backend.ErrDataResponse(backend.StatusInternal, fmt.Sprintf("erro ao obter colunas: %v", err.Error()))
	}


	// create data frame response.
	// For an overview on data frames and how grafana handles them:
	// https://grafana.com/developers/plugin-tools/introduction/data-frames
	frame := data.NewFrame("response")
	values := make([]interface{}, len(cols))
	for i := range values {
		var v interface{}
		values[i] = &v
	}

	for rows.Next() {
		if err := rows.Scan(values...); err != nil {
			return backend.ErrDataResponse(backend.StatusInternal, fmt.Sprintf("erro ao escanear linha: %v", err.Error()))
		}
		frame.AppendRow(values...)
	}

	// add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
    // Supondo que d.DB seja sua conexão já inicializada
    if err := d.DB.PingContext(ctx); err != nil {
        return &backend.CheckHealthResult{
            Status:  backend.HealthStatusError,
            Message: fmt.Sprintf("Falha na conexão: %v", err),
        }, nil
    }
    return &backend.CheckHealthResult{
        Status:  backend.HealthStatusOk,
        Message: "Conexão com Databricks está funcionando",
    }, nil
}
